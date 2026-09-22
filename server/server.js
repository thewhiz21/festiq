const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, initSchema } = require("./db");
const { gridSizeForArtistCount, evaluateBoard, MAX_TIERS } = require("./board");
const { seed } = require("./seed");
const { generateAndVerifyQuestions, TARGET_BANK_SIZE } = require("./question_gen");
const payments = require("./payments");
const paypal = require("./paypal");

// Lazily reserves this board generation's question set for EVERY artist in
// the festival at once, the first time any square is started on a fresh
// board (generation is unset/0 on a new board, bumped on every Try Again
// reset) — not re-rolled on each /start call. Each artist's draw excludes
// whatever was reserved for it last generation so a reset hands the player
// a genuinely fresh set instead of the same questions they just saw,
// cycling back into the full bank only once it's too small to keep
// excluding from. See board_question_sets in db.js.
async function ensureBoardQuestionSets(board, artists) {
  const { rows: existing } = await pool.query(
    `SELECT 1 FROM board_question_sets WHERE board_id = $1 AND generation = $2 LIMIT 1`,
    [board.id, board.generation || 0]
  );
  if (existing.length) return; // already reserved for this generation

  const { rows: prevRows } = await pool.query(
    `SELECT artist_id, question_ids FROM board_question_sets WHERE board_id = $1 AND generation = $2`,
    [board.id, Math.max(0, (board.generation || 0) - 1)]
  );
  const prevByArtist = new Map(prevRows.map((r) => [r.artist_id, r.question_ids || []]));
  const QUESTIONS_PER_QUIZ = 7;

  for (const artist of artists) {
    const { rows: bank } = await pool.query(
      `SELECT id FROM questions WHERE artist_id = $1 AND verification_status != 'rejected'`,
      [artist.id]
    );
    if (!bank.length) continue; // /start will surface a clear "no questions yet" error for this artist

    const excluded = new Set(prevByArtist.get(artist.id) || []);
    let candidatePool = bank.filter((q) => !excluded.has(q.id));
    if (candidatePool.length < QUESTIONS_PER_QUIZ) candidatePool = bank; // bank too shallow to fully exclude — allow some repeats rather than fail

    for (let i = candidatePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidatePool[i], candidatePool[j]] = [candidatePool[j], candidatePool[i]];
    }
    const picked = candidatePool.slice(0, QUESTIONS_PER_QUIZ).map((q) => q.id);

    await pool.query(
      `INSERT INTO board_question_sets (board_id, artist_id, generation, question_ids) VALUES ($1,$2,$3,$4)
       ON CONFLICT (board_id, artist_id, generation) DO NOTHING`,
      [board.id, artist.id, board.generation || 0, picked]
    );
  }
}

// ─── In-board pace curve ────────────────────────────────────────────────────
// The clock tightens as you work your way across ONE bingo card: your first
// pick on a fresh board gets a generous 18s/question (plenty of time even
// for a name you have to think about), your second pick gets 16s, third
// 14s, and 12s from the 4th square on for the rest of that board — still
// very winnable if you actually know the lineup, just no longer a leisurely
// guess by the time you're going for a full line. This is independent of an
// artist's own difficulty tier (which still sets the pass bar via
// DIFFICULTY_LEVEL below) — pace is about how far into THIS board you are,
// difficulty is about which specific artist you picked. A brand-new board
// (a fresh account, or a reset via POST /reset after busting) always starts
// back at the top of the curve, since it's indexed purely by how many
// squares on the CURRENT board are already resolved (cleared or dead) —
// resetting a board sets every square back to available, which naturally
// resets this to square one too.
const BOARD_PACE_SECONDS = [18, 16, 14, 12];

const app = express();
// Most hosts (Railway, Render, Heroku, etc.) put the app behind a reverse
// proxy, so without this req.ip would report the proxy's own address for
// every visitor instead of the real client IP — which would make the
// traffic-exclusion list below match nothing.
app.set("trust proxy", true);
app.use(cors());
// Captures the exact raw bytes alongside the parsed body (req.rawBody) so
// the SeamlessChex webhook route below can verify a signature computed over
// the original payload — express.json() already consumes the request
// stream, so a route-local raw-body parser downstream would see nothing.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// ─── Pre-launch gate ────────────────────────────────────────────────────────
// While this is being built out, the public site should show nothing but a
// placeholder. Anyone with the private preview link (this app's URL + the
// ?key=PREVIEW_KEY query param) unlocks the real site for their browser via
// a cookie; everyone else — including search crawlers — only ever sees
// coming-soon.html. API routes are left open (they're meaningless without
// the frontend, and the preview unlock itself doesn't need them gated).
const PREVIEW_COOKIE = "festiq_preview";

// In-memory cache of admin-editable settings, loaded from the DB at boot
// and refreshed whenever the admin panel writes one. Falls back to the
// env var of the same name when no DB row exists yet.
const siteSettings = {
  site_locked: process.env.SITE_LOCKED !== "false",
  preview_key: process.env.PREVIEW_KEY || "",
  // null = auto-pick the soonest live/upcoming festival (original behavior).
  // Set by the admin panel to pin a specific festival to the homepage hero
  // spot regardless of date — e.g. to promote a festival you're pushing
  // marketing spend behind this week.
  spotlight_festival_id: null,
};

async function loadSiteSettings() {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM settings WHERE key IN ('site_locked', 'preview_key', 'spotlight_festival_id')`);
    for (const row of rows) {
      if (row.key === "site_locked") siteSettings.site_locked = row.value === "true";
      if (row.key === "preview_key") siteSettings.preview_key = row.value || "";
      if (row.key === "spotlight_festival_id") siteSettings.spotlight_festival_id = row.value ? parseInt(row.value, 10) : null;
    }
  } catch (err) {
    console.error("Failed to load site settings, using env var defaults:", err.message);
  }
}

async function saveSiteSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, String(value)]
  );
  if (key === "site_locked") siteSettings.site_locked = value === true || value === "true";
  if (key === "preview_key") siteSettings.preview_key = value || "";
  if (key === "spotlight_festival_id") siteSettings.spotlight_festival_id = value ? parseInt(value, 10) : null;
}

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

// Known search-engine and link-preview crawler user agents. These are let
// straight through the pre-launch gate (see below) so the real, indexable
// pages start getting crawled and ranked *before* SITE_LOCKED flips off —
// only human visitors without the preview cookie see coming-soon.html.
// Deliberately user-agent based (not IP-based): good enough for legitimate
// crawlers, which all self-identify this way, and doesn't require an IP
// allowlist that would need constant upkeep.
const CRAWLER_USER_AGENT_PATTERN =
  /googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|applebot|petalbot|bytespider|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterestbot|redditbot|gptbot|oai-searchbot|chatgpt-user|perplexitybot|claudebot|anthropic-ai|google-extended/i;

function isKnownCrawler(userAgent) {
  return CRAWLER_USER_AGENT_PATTERN.test(userAgent || "");
}

app.use((req, res, next) => {
  if (
    !siteSettings.site_locked ||
    req.path.startsWith("/api/") ||
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/admin") ||
    req.path === "/robots.txt" ||
    req.path === "/sitemap.xml" ||
    isKnownCrawler(req.headers["user-agent"])
  )
    return next();

  const cookies = parseCookies(req.headers.cookie);
  const keyFromQuery = req.query.key;
  const PREVIEW_KEY = siteSettings.preview_key;

  if (PREVIEW_KEY && keyFromQuery === PREVIEW_KEY) {
    res.setHeader(
      "Set-Cookie",
      `${PREVIEW_COOKIE}=${encodeURIComponent(PREVIEW_KEY)}; Max-Age=${60 * 60 * 24 * 90}; Path=/; HttpOnly; SameSite=Lax`
    );
    return next();
  }
  if (PREVIEW_KEY && cookies[PREVIEW_COOKIE] === PREVIEW_KEY) return next();

  // Only the actual coming-soon placeholder gets noindex — once the gate is
  // open (or a preview visitor unlocks it), the real site should be fully
  // crawlable. Setting this unconditionally on every response (as before)
  // was silently blocking Google from ever indexing the live site.
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(200).sendFile(path.join(__dirname, "..", "public", "coming-soon.html"));
});

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin.html")));

// ─── SEO: robots.txt + sitemap.xml ───────────────────────────────────────────
// These are always open, even while site_locked gates human visitors behind
// coming-soon.html — that's the whole point of letting crawlers through the
// gate above: robots.txt and the sitemap need to say "come on in" or the
// crawl bypass is pointless. Nothing here is gated on site_locked anymore.
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${req.protocol}://${req.get("host")}/sitemap.xml\n`);
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    res.type("application/xml");
    const { rows: festivals } = await pool.query(`SELECT slug, status FROM festivals ORDER BY event_date ASC`);
    const urls = [
      `<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${base}/festivals</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      `<url><loc>${base}/pricing</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
      `<url><loc>${base}/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    ];
    for (const f of festivals) {
      urls.push(`<url><loc>${base}/festival/${f.slug}</loc><changefreq>daily</changefreq><priority>${f.status === "live" ? "0.9" : "0.5"}</priority></url>`);
    }
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  } catch (err) {
    res.status(500).send("");
  }
});

// ─── SEO: real, crawlable per-festival URLs ──────────────────────────────────
// The app itself is a hash-routed SPA (#/f/slug), which is invisible to
// search engines and to link-preview scrapers (iMessage, Slack, Twitter,
// Facebook — none of which execute JS). This route gives each festival a
// real path with server-rendered <title>/OG/Twitter meta and JSON-LD Event
// structured data baked in. The client renders off window.location.pathname
// directly (see the router in index.html), so this is just the same SPA
// shell served at a real, stable URL — a human and a crawler/scraper both
// land on the same page, no redirect or hash trick needed.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Renamed slugs (moved to a more readable, SEO-friendly URL) redirect
// permanently so old shared links and bookmarks keep working.
const LEGACY_SLUG_REDIRECTS = {
  "acl-festival": "austin-city-limits",
};

app.get("/festival/:slug", async (req, res, next) => {
  try {
    if (LEGACY_SLUG_REDIRECTS[req.params.slug]) {
      return res.redirect(301, `/festival/${LEGACY_SLUG_REDIRECTS[req.params.slug]}`);
    }
    const { rows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const f = rows[0];
    if (!f) return next(); // no such festival — fall through to the SPA's own "not found" UI
    const { rows: artists } = await pool.query(`SELECT name, genre FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [f.id]);

    const base = `${req.protocol}://${req.get("host")}`;
    // Same "Win X [Year] Tickets Playing Trivia Bingo" title whether the
    // board is live or still upcoming — someone searching "win coachella
    // 2027 tickets" is the exact intent we want to rank for, and that
    // search intent doesn't change just because the board hasn't opened
    // for play yet. year comes from event_date, which is free text
    // ("2026-10-17", "Oct. 2–4 & Oct. 9–11, 2026", "2027 TBD", "Varies /
    // next event dependent on city") — pull the first 4-digit year out of
    // it, or omit the year entirely rather than guess one.
    const yearMatch = String(f.event_date || "").match(/\b(20\d{2})\b/);
    const titleYear = yearMatch ? ` ${yearMatch[1]}` : "";
    const title = `Win ${f.name}${titleYear} Tickets Playing Trivia Bingo | FestiQ`;
    const lineupNames = artists.map((a) => a.name).join(", ");
    const description = f.status === "live"
      ? `Play free ${f.name} trivia bingo${f.location ? " in " + f.location : ""}. Clear a row of artist quizzes — ${lineupNames ? "featuring " + lineupNames.slice(0, 180) + (lineupNames.length > 180 ? "…" : "") : "full lineup on the board"} — and win ${f.ticket_prize_label || "a ticket"} to ${f.name}.`
      : `${f.name}${f.location ? " · " + f.location : ""}${f.event_date ? " · " + f.event_date : ""}. The ${f.name} trivia bingo board and lineup drop soon on FestiQ.`;
    const ogImage = `${base}/assets/logo-512.png`;
    const canonical = `${base}/festival/${f.slug}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: f.name,
      description,
      startDate: f.event_date || undefined,
      location: f.location ? { "@type": "Place", name: f.location } : undefined,
      url: canonical,
      ...(artists.length ? { performer: artists.map((a) => ({ "@type": "MusicGroup", name: a.name })) } : {}),
    };

    // Same SPA shell as "/", just with this festival's real meta tags baked
    // into <head> and a noscript fallback with real text — so a browser
    // gets the identical app at a real, stable URL (no redirect / no URL
    // flicker), while a non-JS scraper (iMessage, Slack, Twitter previews)
    // still sees accurate title/description/image and structured data.
    const fs = require("fs");
    let html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}">`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}">`)
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}">`)
      .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(title)}">`)
      .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(description)}">`)
      .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${ogImage}">`)
      .replace("</head>", `<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<noscript><h1>${escapeHtml(f.name)}</h1><p>${escapeHtml(description)}</p>${artists.length ? `<h2>Lineup</h2><ul>${artists.map((a) => `<li>${escapeHtml(a.name)}${a.genre ? " — " + escapeHtml(a.genre) : ""}</li>`).join("")}</ul>` : ""}</noscript>
</head>`);
    res.send(html);
  } catch (err) {
    next();
  }
});

// ─── SEO: real links on the homepage + a dedicated /festivals directory ─────
// Before this, "/" was served as a raw static file (see express.static
// below) — a real crawler that doesn't execute JS (most don't; even
// Googlebot's rendering pass is deferred) saw an empty shell with zero
// <a href> links to any festival, because the grid is built client-side
// from a fetch() call. It only ever reached individual festival pages via
// sitemap.xml, never by "crawling" the site the normal way link-to-link.
// This renders a real, static <noscript> list of every festival with a
// working link — same technique already used on /festival/:slug — into
// both "/" and a new dedicated "/festivals" URL, so there's an actual page
// a bot can land on and follow links from, not just a homepage that jumps
// straight to whichever festival happens to be in the sitemap.
function festivalListNoscriptHTML(festivals) {
  const items = festivals
    .map((f) => {
      const meta = [f.location, f.event_date].filter(Boolean).join(" · ");
      return `<li><a href="/festival/${f.slug}">${escapeHtml(f.name)}</a>${meta ? " — " + escapeHtml(meta) : ""}${f.status === "live" ? " (live now)" : ""}</li>`;
    })
    .join("");
  return `<noscript><h1>All Festivals</h1><ul>${items}</ul><p><a href="/pricing">Pricing</a> · <a href="/faq">FAQ</a></p></noscript>`;
}

app.get("/", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const { rows: festivals } = await pool.query(`SELECT slug, name, location, event_date, status FROM festivals ORDER BY event_date ASC`);
    const fs = require("fs");
    let html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    html = html.replace(
      "</head>",
      `<link rel="canonical" href="${base}/">\n<meta property="og:url" content="${base}/">\n</head>`
    );
    html = html.replace("</body>", `${festivalListNoscriptHTML(festivals)}</body>`);
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  }
});

app.get("/festivals", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const canonical = `${base}/festivals`;
    const title = "All Festivals — Play Trivia Bingo for Real Tickets | FestiQ";
    const description = "Browse every festival on FestiQ — ACL, Coachella, EDC, Camp Flog Gnaw, and dozens more. Pick a festival, pick an artist, answer their trivia, and win real tickets.";
    const { rows: festivals } = await pool.query(`SELECT slug, name, location, event_date, status FROM festivals ORDER BY event_date ASC`);
    const fs = require("fs");
    let html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}">`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}">`)
      .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(title)}">`)
      .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(description)}">`)
      .replace("</head>", `<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:url" content="${canonical}">
</head>`);
    html = html.replace("</body>", `${festivalListNoscriptHTML(festivals)}</body>`);
    res.send(html);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Static SPA pages (pricing / FAQ / account) — real crawlable paths, same
// shell as "/", with their own title/description swapped into <head> so
// each is its own real, indexable page rather than only reachable via
// client-side navigation from the homepage.
const STATIC_PAGES = {
  "/pricing": {
    title: "Trivia Tokens — Grab a Stack, Play Any Festival | FestiQ",
    description: "Trivia Tokens are FestiQ's game currency — grab a stack once, then spend them at any festival board, any time. See how many tokens each festival takes to play.",
  },
  "/faq": {
    title: "FAQ — FestiQ Trivia Bingo",
    description: "Answers to common questions about how FestiQ's festival trivia bingo works: tokens, dead squares, ticket tiers, and claiming a win.",
  },
  "/account": {
    title: "My Account — FestiQ",
    description: "View your FestiQ token balance, the boards you've played, and any festival tickets you've won.",
    noindex: true, // personal, logged-in content — nothing here to index
  },
};

app.get(Object.keys(STATIC_PAGES), (req, res) => {
  try {
    const page = STATIC_PAGES[req.path];
    const base = `${req.protocol}://${req.get("host")}`;
    const canonical = `${base}${req.path}`;
    const fs = require("fs");
    let html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(page.title)}">`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(page.description)}">`)
      .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}">`)
      .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}">`)
      .replace("</head>", `<meta name="description" content="${escapeHtml(page.description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:url" content="${canonical}">
${page.noindex ? '<meta name="robots" content="noindex, follow">' : ""}
</head>`);
    res.send(html);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.use(express.static(path.join(__dirname, "..", "public")));

const JWT_SECRET = process.env.JWT_SECRET || "festiq-dev-secret-change-me";
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes to finish a quiz once started
const FREE_CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, display_name: user.display_name }, JWT_SECRET, { expiresIn: "30d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Admin panel auth — same shared-secret-header pattern as PropQuix's admin.
function requireAdmin(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function getOrCreateWallet(userId) {
  let { rows } = await pool.query(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
  if (!rows.length) {
    await pool.query(`INSERT INTO wallets (user_id, tokens) VALUES ($1, 1)`, [userId]); // 1 free token to try it
    ({ rows } = await pool.query(`SELECT * FROM wallets WHERE user_id = $1`, [userId]));
  }
  return rows[0];
}

async function getOrCreateBoard(userId, festival) {
  let { rows } = await pool.query(`SELECT * FROM boards WHERE user_id = $1 AND festival_id = $2`, [userId, festival.id]);
  let board = rows[0];
  if (!board) {
    const inserted = await pool.query(`INSERT INTO boards (user_id, festival_id) VALUES ($1, $2) RETURNING *`, [userId, festival.id]);
    board = inserted.rows[0];
    const { rows: artists } = await pool.query(`SELECT id FROM artists WHERE festival_id = $1`, [festival.id]);
    for (const a of artists) {
      await pool.query(`INSERT INTO board_cells (board_id, artist_id, status) VALUES ($1, $2, 'available')`, [board.id, a.id]);
    }
  }
  const { rows: cells } = await pool.query(`SELECT * FROM board_cells WHERE board_id = $1`, [board.id]);
  return { board, cells };
}

// ─── Token economy ──────────────────────────────────────────────────────────
// Carnival-token model: like buying a stack of tokens at Chuck E. Cheese,
// what a TOKEN costs in real money is a single sitewide question (answered
// by the token packs in /api/wallet/demo-buy-tokens's frontend, all priced
// off TOKEN_REFERENCE_VALUE_CENTS) — never something a player has to work
// out per festival while they're mid-game. What DOES vary per festival is
// how many tokens one attempt costs (entry_cost_tokens), the same way some
// arcade games cost 1 token and others cost 3. That number is a plain admin
// field; when an average GA ticket price is on file, suggestEntryCostTokens
// gives the admin panel a suggested value scaled to that show's real prize
// value, but it's never recomputed on the fly for players — it's just the
// festival's entry_cost_tokens column, same as any other setting.
const TOKEN_REFERENCE_VALUE_CENTS = 40; // internal accounting constant only — never shown to players
const TOKEN_VALUE_PCT = 0.45; // clearing a full board should cost well under the GA ticket itself

function suggestEntryCostTokens(avgGaPriceCents, artistCount) {
  if (!avgGaPriceCents || !artistCount) return null;
  const budgetCents = avgGaPriceCents * TOKEN_VALUE_PCT;
  const tokensForFullBoard = budgetCents / TOKEN_REFERENCE_VALUE_CENTS;
  return Math.max(1, Math.round(tokensForFullBoard / artistCount));
}

function boardPayload(festival, artists, cells, gridSize, wonTicket, linesCompleted, generation, entryFeeCharged) {
  const cellByArtist = Object.fromEntries(cells.map((c) => [c.artist_id, c.status]));
  // Same math /start already uses to refuse a play on a dead board — but
  // that only fires the moment someone taps a square. Without also exposing
  // it here, a fully-busted board (every line already has a dead square in
  // it) just sits there looking like a couple of squares are still
  // meaningfully playable, with nothing telling the visitor the game is
  // actually over until they tap one and get a generic error.
  const cellsByPositionForEval = artists
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((a) => ({ status: cellByArtist[a.id] || "available" }));
  const evalState = evaluateBoard(cellsByPositionForEval, gridSize);
  // How far into the pace curve the NEXT square you tap would land — same
  // count /start itself uses, exposed here so the confirm-play modal can
  // show an accurate time preview before it ever calls /start.
  const resolvedCount = cellsByPositionForEval.filter((c) => c.status !== "available").length;
  return {
    grid_size: gridSize,
    won_ticket: !!wonTicket,
    lines_completed: linesCompleted || 0,
    max_tiers: MAX_TIERS,
    generation: generation || 0,
    next_square_seconds: BOARD_PACE_SECONDS[Math.min(resolvedCount, BOARD_PACE_SECONDS.length - 1)],
    entry_fee_charged: !!entryFeeCharged,
    busted: evalState.busted,
    board_over: evalState.busted || evalState.completedLines >= MAX_TIERS || (evalState.completedLines >= 1 && !evalState.nextLineReachable),
    cells: artists.map((a) => ({
      artist_id: a.id,
      name: a.name,
      genre: a.genre,
      set_time: a.set_time,
      difficulty: a.difficulty,
      token_cost: a.token_cost ?? 1,
      position: a.position,
      also_at: a.also_at || [],
      status: cellByArtist[a.id] || "available",
    })),
  };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password || !display_name) return res.status(400).json({ error: "email, password, and display_name are required" });
    const normalizedEmail = email.toLowerCase().trim();
    const { rows: existing } = await pool.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existing.length) return res.status(409).json({ error: "An account with that email already exists" });
    const hash = bcrypt.hashSync(password, 10);
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [normalizedEmail, hash, display_name.trim()]
    );
    const user = inserted.rows[0];
    await getOrCreateWallet(user.id);
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [(email || "").toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password || "", user.password_hash)) return res.status(401).json({ error: "Invalid email or password" });
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, display_name: user.display_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pageview tracking (stopgap until GTM/GA is wired up) ──────────────────
// Classifies a raw referrer URL into a coarse traffic source so "are people
// finding us via Google" is a one-glance answer in the admin panel, without
// needing a real analytics tool yet. Kept intentionally simple — this isn't
// trying to replace GA's channel grouping, just answer that one question.
const SEARCH_ENGINE_HOSTS = {
  google: "google",
  "google.com": "google",
  bing: "other_search",
  "bing.com": "other_search",
  yahoo: "other_search",
  duckduckgo: "other_search",
  "duckduckgo.com": "other_search",
  baidu: "other_search",
  ecosia: "other_search",
};
const SOCIAL_HOSTS = [
  "facebook.com", "instagram.com", "t.co", "twitter.com", "x.com",
  "tiktok.com", "reddit.com", "linkedin.com", "pinterest.com", "youtube.com", "threads.net",
];

function classifyReferrer(referrerHost) {
  if (!referrerHost) return "direct";
  const host = referrerHost.toLowerCase().replace(/^www\./, "");
  for (const [needle, type] of Object.entries(SEARCH_ENGINE_HOSTS)) {
    if (host.includes(needle)) return needle === "google" || needle === "google.com" ? "google" : type;
  }
  if (SOCIAL_HOSTS.some((s) => host.includes(s))) return "social";
  return "referral";
}

// Your own visits (testing, QA, just checking the site) shouldn't count as
// traffic — same idea as GA's "internal traffic" filter. Comma-separated
// list of IPs to exclude, e.g. "184.93.96.142,203.0.113.7" for a home IP
// plus a phone/office one. No effect on anything except this analytics
// beacon — doesn't block or restrict those IPs from the site itself.
const TRAFFIC_EXCLUDE_IPS = new Set(
  (process.env.TRAFFIC_EXCLUDE_IPS || "").split(",").map((ip) => ip.trim()).filter(Boolean)
);
function getClientIp(req) {
  // req.ip already resolves through X-Forwarded-For correctly once
  // "trust proxy" is set, but a proxy chain can list multiple IPs
  // (client, then each hop) — the first one is the actual visitor.
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip;
}

app.post("/api/track", async (req, res) => {
  try {
    // Never let a broken tracking beacon be visible to the visitor — this
    // endpoint fails silently either way.
    if (isKnownCrawler(req.headers["user-agent"])) return res.status(204).end();
    if (TRAFFIC_EXCLUDE_IPS.has(getClientIp(req))) return res.status(204).end();
    const pagePath = String(req.body?.path || "").slice(0, 255);
    const referrer = req.body?.referrer ? String(req.body.referrer).slice(0, 500) : null;
    let referrerHost = null;
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname; } catch { /* not a valid absolute URL — ignore */ }
    }
    const sourceType = classifyReferrer(referrerHost);
    await pool.query(
      `INSERT INTO page_views (path, referrer, referrer_host, source_type, user_agent) VALUES ($1, $2, $3, $4, $5)`,
      [pagePath, referrer, referrerHost, sourceType, (req.headers["user-agent"] || "").slice(0, 300)]
    );
    res.status(204).end();
  } catch (err) {
    res.status(204).end(); // tracking must never surface an error to the visitor
  }
});

// ─── Festivals ──────────────────────────────────────────────────────────────

app.get("/api/festivals", async (req, res) => {
  try {
    const { rows: festivals } = await pool.query(`SELECT * FROM festivals ORDER BY event_date ASC`);
    const out = [];
    for (const f of festivals) {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS c, MIN(token_cost) AS min_cost, MAX(token_cost) AS max_cost FROM artists WHERE festival_id = $1`,
        [f.id]
      );
      const lineupCount = countRows[0].c;
      out.push({
        slug: f.slug,
        name: f.name,
        location: f.location,
        event_date: f.event_date,
        banner_color: f.banner_color,
        ticket_prize_label: f.ticket_prize_label,
        status: f.status,
        tickets_available: f.tickets_available,
        tickets_awarded: f.tickets_awarded,
        entry_cost_tokens: f.entry_cost_tokens,
        board_entry_fee_tokens: f.board_entry_fee_tokens || 0,
        token_cost_min: countRows[0].min_cost ?? 1,
        token_cost_max: countRows[0].max_cost ?? 1,
        avg_ga_price_usd_cents: f.avg_ga_price_usd_cents || null,
        lineup_count: lineupCount,
        is_spotlight: siteSettings.spotlight_festival_id === f.id,
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sitewide token bundles for the Trivia Tokens page / buy-tokens modal.
// Public + unauthenticated since anyone browsing can see prices before
// logging in; only active packs, in display order.
app.get("/api/token-packs", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tokens, price_usd_cents, label, color_key, badge, bonus_pct FROM token_packs WHERE active = TRUE ORDER BY sort_order ASC, id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/festivals/:slug", async (req, res) => {
  try {
    const slug = LEGACY_SLUG_REDIRECTS[req.params.slug] || req.params.slug;
    const { rows: fRows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [slug]);
    const festival = fRows[0];
    if (!festival) return res.status(404).json({ error: "Festival not found" });
    const { rows: artists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const gridSize = gridSizeForArtistCount(artists.length);

    // Cross-festival "also playing at" — see global_artists in db.js. Only
    // artists seeded through seed-utils.js have a global_artist_id, so this
    // is empty (harmless) for older festivals seeded before it existed.
    const globalIds = [...new Set(artists.map((a) => a.global_artist_id).filter(Boolean))];
    if (globalIds.length) {
      const { rows: alsoRows } = await pool.query(
        `SELECT a.global_artist_id AS gid, f.slug, f.name FROM artists a JOIN festivals f ON f.id = a.festival_id WHERE a.global_artist_id = ANY($1) AND f.id != $2`,
        [globalIds, festival.id]
      );
      const alsoAtByGid = {};
      for (const r of alsoRows) (alsoAtByGid[r.gid] ||= []).push({ slug: r.slug, name: r.name });
      for (const a of artists) a.also_at = a.global_artist_id ? alsoAtByGid[a.global_artist_id] || [] : [];
    } else {
      for (const a of artists) a.also_at = [];
    }

    let board = null;
    const header = req.headers.authorization;
    if (festival.status === "live" && header && header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
        const { board: b, cells } = await getOrCreateBoard(decoded.id, festival);
        board = boardPayload(festival, artists, cells, gridSize, b.won_ticket, b.lines_completed, b.generation, b.entry_fee_charged);
      } catch {
        /* not logged in / bad token — just omit board */
      }
    }

    res.json({
      slug: festival.slug,
      name: festival.name,
      location: festival.location,
      event_date: festival.event_date,
      banner_color: festival.banner_color,
      ticket_prize_label: festival.ticket_prize_label,
      status: festival.status,
      tickets_available: festival.tickets_available,
      tickets_awarded: festival.tickets_awarded,
      entry_cost_tokens: festival.entry_cost_tokens,
      board_entry_fee_tokens: festival.board_entry_fee_tokens || 0,
      avg_ga_price_usd_cents: festival.avg_ga_price_usd_cents || null,
      grid_size: gridSize,
      artists: artists.map((a) => ({ id: a.id, name: a.name, genre: a.genre, set_time: a.set_time, position: a.position, difficulty: a.difficulty, token_cost: a.token_cost ?? 1, also_at: a.also_at })),
      board,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Wallet ─────────────────────────────────────────────────────────────────

app.get("/api/wallet", requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    res.json({ tokens: wallet.tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Embodies "a potential free component over time" without committing to a
// business model yet — one free token every 24h, no payment involved.
app.post("/api/wallet/claim-free", requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.last_free_claim_at) {
      const elapsed = Date.now() - new Date(wallet.last_free_claim_at).getTime();
      if (elapsed < FREE_CLAIM_COOLDOWN_MS) {
        return res.status(429).json({ error: "Already claimed", retry_after_ms: FREE_CLAIM_COOLDOWN_MS - elapsed });
      }
    }
    await pool.query(`UPDATE wallets SET tokens = tokens + 1, last_free_claim_at = NOW() WHERE user_id = $1`, [req.user.id]);
    const updated = await getOrCreateWallet(req.user.id);
    res.json({ tokens: updated.tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEMO ONLY — no payment processor wired up yet (ticket sourcing / pricing
// model isn't finalized). Grants tokens instantly so the game loop can be
// tested end to end. Swap for a real Stripe Checkout session before launch,
// same pattern as PropQuix's solo token packs. Every "purchase" is still
// logged to token_purchases (pack, tokens, price) so revenue analytics work
// today and don't need to change shape once real payments are wired in —
// only how the tokens get authorized changes, not how they get recorded.
app.post("/api/wallet/demo-buy-tokens", requireAuth, async (req, res) => {
  try {
    let tokensToAdd, packId = null, priceCents = null;
    if (req.body?.pack_id) {
      const { rows: packRows } = await pool.query(`SELECT * FROM token_packs WHERE id = $1 AND active = TRUE`, [req.body.pack_id]);
      const pack = packRows[0];
      if (!pack) return res.status(404).json({ error: "That token pack is no longer available" });
      tokensToAdd = pack.tokens + Math.round((pack.tokens * (pack.bonus_pct || 0)) / 100);
      packId = pack.id;
      priceCents = pack.price_usd_cents;
    } else {
      // Back-compat: an arbitrary quantity with no pack behind it (e.g. an
      // older client build) — still granted, just not tied to a priced pack.
      tokensToAdd = Math.max(1, Math.min(500, parseInt(req.body?.quantity) || 1));
    }
    await pool.query(`UPDATE wallets SET tokens = tokens + $1 WHERE user_id = $2`, [tokensToAdd, req.user.id]);
    await pool.query(
      `INSERT INTO token_purchases (user_id, pack_id, tokens, price_usd_cents) VALUES ($1, $2, $3, $4)`,
      [req.user.id, packId, tokensToAdd, priceCents]
    );
    const updated = await getOrCreateWallet(req.user.id);
    res.json({ tokens: updated.tokens, tokens_added: tokensToAdd, demo: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tells the frontend whether a real payment provider is configured, so it
// can offer real checkout when one is and quietly fall back to the demo
// instant-credit flow when one isn't — no separate deploy needed to flip
// this once SeamlessChex credentials are added to the server's env.
app.get("/api/payments/config", (req, res) => {
  // PayPal takes priority when both happen to be configured — it's the one
  // with a finished, working integration (see server/paypal.js); the
  // SeamlessChex path stays available for later since its scaffolding is
  // already in place, just blocked on their non-public API reference.
  if (paypal.isConfigured()) {
    return res.json({ enabled: true, provider: "paypal", paypal_client_id: paypal.publicClientId() });
  }
  res.json({ enabled: payments.isConfigured(), provider: payments.isConfigured() ? "seamlesschex" : null });
});

// Real-money purchase path. Unlike /api/wallet/demo-buy-tokens, this never
// credits tokens itself — it only creates a 'pending' record and hands back
// a hosted checkout URL. Tokens are granted exclusively by the webhook
// below once SeamlessChex confirms the charge actually went through.
app.post("/api/wallet/checkout", requireAuth, async (req, res) => {
  try {
    if (!payments.isConfigured()) {
      return res.status(503).json({ error: "Real payments aren't configured on this server yet — see server/payments.js" });
    }
    const { rows: packRows } = await pool.query(`SELECT * FROM token_packs WHERE id = $1 AND active = TRUE`, [req.body.pack_id]);
    const pack = packRows[0];
    if (!pack) return res.status(404).json({ error: "That token pack is no longer available" });
    const tokensToAdd = pack.tokens + Math.round((pack.tokens * (pack.bonus_pct || 0)) / 100);

    const { rows: pendingRows } = await pool.query(
      `INSERT INTO token_purchases (user_id, pack_id, tokens, price_usd_cents, status, provider) VALUES ($1,$2,$3,$4,'pending','seamlesschex') RETURNING id`,
      [req.user.id, pack.id, tokensToAdd, pack.price_usd_cents]
    );
    const purchaseId = pendingRows[0].id;

    try {
      const { checkoutUrl, providerReference } = await payments.createCheckoutLink({
        reference: String(purchaseId),
        amountCents: pack.price_usd_cents,
        description: `FestiQ — ${pack.label} (${tokensToAdd} tokens)`,
        successPath: `/account?purchase=${purchaseId}`,
        cancelPath: `/?purchase_cancelled=${purchaseId}`,
      });
      await pool.query(`UPDATE token_purchases SET provider_reference = $1 WHERE id = $2`, [providerReference, purchaseId]);
      res.json({ checkout_url: checkoutUrl, purchase_id: purchaseId });
    } catch (err) {
      // Don't leave an orphaned pending row if checkout creation itself failed.
      await pool.query(`DELETE FROM token_purchases WHERE id = $1`, [purchaseId]);
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SeamlessChex calls this when a checkout succeeds (or fails/expires).
// Fails closed: an unverified request is rejected outright rather than
// trusted, since this is the one route that can turn into free tokens if
// abused — see verifyWebhookSignature in payments.js (not yet implemented
// against their real signing scheme).
app.post("/api/webhooks/seamlesschex", async (req, res) => {
  try {
    if (!payments.verifyWebhookSignature(req.rawBody, req.headers)) {
      return res.status(401).json({ error: "Invalid or unverified webhook signature" });
    }
    const payload = req.body;
    // TODO: field names below are placeholders until the real payload shape
    // is confirmed from SeamlessChex's docs (see payments.js) — adjust to
    // match whatever they actually send.
    const purchaseId = Number(payload.reference);
    const status = payload.status; // expect something like 'completed' | 'failed'
    const providerReference = payload.id;

    const { rows } = await pool.query(`SELECT * FROM token_purchases WHERE id = $1`, [purchaseId]);
    const purchase = rows[0];
    if (!purchase) return res.status(404).json({ error: "Unknown purchase reference" });
    if (purchase.status === "completed") return res.json({ ok: true, already_processed: true }); // idempotent

    if (status === "completed" || status === "succeeded" || status === "paid") {
      await pool.query(`UPDATE token_purchases SET status = 'completed', provider_reference = $1 WHERE id = $2`, [providerReference, purchaseId]);
      await pool.query(`UPDATE wallets SET tokens = tokens + $1 WHERE user_id = $2`, [purchase.tokens, purchase.user_id]);
    } else {
      await pool.query(`UPDATE token_purchases SET status = 'failed', provider_reference = $1 WHERE id = $2`, [providerReference, purchaseId]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PayPal (Smart Buttons / Orders v2) ──────────────────────────────────────
// Same pending-then-confirm shape as the SeamlessChex path above: this route
// only creates the order, it never credits tokens. Crediting happens in
// /api/wallet/paypal/capture below, gated on PayPal itself reporting the
// capture as COMPLETED for the exact amount this pack costs — never on
// anything the client claims.
app.post("/api/wallet/paypal/create-order", requireAuth, async (req, res) => {
  try {
    if (!paypal.isConfigured()) return res.status(503).json({ error: "PayPal isn't configured on this server yet" });
    const { rows: packRows } = await pool.query(`SELECT * FROM token_packs WHERE id = $1 AND active = TRUE`, [req.body.pack_id]);
    const pack = packRows[0];
    if (!pack) return res.status(404).json({ error: "That token pack is no longer available" });
    const tokensToAdd = pack.tokens + Math.round((pack.tokens * (pack.bonus_pct || 0)) / 100);

    const { rows: pendingRows } = await pool.query(
      `INSERT INTO token_purchases (user_id, pack_id, tokens, price_usd_cents, status, provider) VALUES ($1,$2,$3,$4,'pending','paypal') RETURNING id`,
      [req.user.id, pack.id, tokensToAdd, pack.price_usd_cents]
    );
    const purchaseId = pendingRows[0].id;

    try {
      const { orderId } = await paypal.createOrder({
        referenceId: purchaseId,
        amountUsd: pack.price_usd_cents / 100,
        description: `FestiQ — ${pack.label} (${tokensToAdd} tokens)`,
      });
      await pool.query(`UPDATE token_purchases SET provider_reference = $1 WHERE id = $2`, [orderId, purchaseId]);
      res.json({ order_id: orderId, purchase_id: purchaseId });
    } catch (err) {
      await pool.query(`DELETE FROM token_purchases WHERE id = $1`, [purchaseId]);
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Called from the client's PayPal Buttons onApprove callback right after
// the buyer approves on PayPal's side. Still fully server-verified: we
// capture the order ourselves, check PayPal's own reported status/amount/
// reference against what we expect, and only THEN touch the wallet.
// Idempotent — a duplicate capture call (e.g. a flaky retry) can't double-
// credit because it checks purchase.status first.
app.post("/api/wallet/paypal/capture", requireAuth, async (req, res) => {
  try {
    const { order_id, purchase_id } = req.body;
    const { rows } = await pool.query(
      `SELECT * FROM token_purchases WHERE id = $1 AND provider_reference = $2 AND user_id = $3`,
      [purchase_id, order_id, req.user.id]
    );
    const purchase = rows[0];
    if (!purchase) return res.status(404).json({ error: "Unknown or mismatched purchase" });
    if (purchase.status === "completed") {
      const wallet = await getOrCreateWallet(req.user.id);
      return res.json({ ok: true, already_processed: true, tokens: wallet.tokens });
    }

    const capture = await paypal.captureOrder(order_id);
    const expectedAmount = purchase.price_usd_cents / 100;
    const amountMatches = capture.amountUsd != null && Math.abs(capture.amountUsd - expectedAmount) < 0.005;
    const referenceMatches = String(capture.referenceId) === String(purchase.id);

    if (capture.status !== "COMPLETED" || !amountMatches || !referenceMatches) {
      await pool.query(`UPDATE token_purchases SET status = 'failed' WHERE id = $1`, [purchase.id]);
      return res.status(402).json({ error: "Payment could not be confirmed" });
    }

    await pool.query(`UPDATE token_purchases SET status = 'completed' WHERE id = $1`, [purchase.id]);
    await pool.query(`UPDATE wallets SET tokens = tokens + $1 WHERE user_id = $2`, [purchase.tokens, req.user.id]);
    const wallet = await getOrCreateWallet(req.user.id);
    res.json({ ok: true, tokens: wallet.tokens, tokens_added: purchase.tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reconciliation backstop, not the primary crediting path (capture above
// is) — catches the case where a buyer pays but the browser tab closes or
// the network drops before the capture call above completes, and handles
// refund/dispute events PayPal sends after the fact. Fails closed on an
// unverified signature exactly like the SeamlessChex webhook, except this
// one's verification is real (PayPal's own /verify-webhook-signature API),
// not a stub.
app.post("/api/webhooks/paypal", async (req, res) => {
  try {
    const rawBodyText = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
    const verified = await paypal.verifyWebhookSignature(req.headers, rawBodyText);
    if (!verified) return res.status(401).json({ error: "Invalid or unverified webhook signature" });

    const event = req.body;
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const purchaseId = Number(event.resource?.custom_id);
      const { rows } = await pool.query(`SELECT * FROM token_purchases WHERE id = $1`, [purchaseId]);
      const purchase = rows[0];
      if (purchase && purchase.status !== "completed") {
        await pool.query(`UPDATE token_purchases SET status = 'completed' WHERE id = $1`, [purchaseId]);
        await pool.query(`UPDATE wallets SET tokens = tokens + $1 WHERE user_id = $2`, [purchase.tokens, purchase.user_id]);
      }
    } else if (event.event_type === "PAYMENT.CAPTURE.DENIED" || event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      const purchaseId = Number(event.resource?.custom_id);
      // Flagged for manual admin follow-up rather than auto-clawing back
      // tokens — by the time a refund lands, the player may have already
      // spent them, and silently deducting from a wallet that's gone
      // negative is worse than a human deciding case by case.
      await pool.query(`UPDATE token_purchases SET status = 'refunded' WHERE id = $1 AND status = 'completed'`, [purchaseId]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Everything the "My Account" page needs in one call: profile, wallet, every
// board the user has started (win/loss progress per festival), and every
// ticket they've won (with claim/fulfillment status).
app.get("/api/account", requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    const { rows: boards } = await pool.query(
      `SELECT b.lines_completed, b.won_ticket, b.created_at, f.slug, f.name, f.banner_color, f.ticket_prize_label,
              (SELECT COUNT(*)::int FROM board_cells bc WHERE bc.board_id = b.id AND bc.status = 'cleared') AS cleared_count,
              (SELECT COUNT(*)::int FROM board_cells bc WHERE bc.board_id = b.id) AS total_count
       FROM boards b JOIN festivals f ON f.id = b.festival_id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    const { rows: tickets } = await pool.query(
      `SELECT t.id, t.claim_code, t.fulfilled, t.won_at, f.slug, f.name, f.ticket_prize_label
       FROM tickets_won t JOIN festivals f ON f.id = t.festival_id
       WHERE t.user_id = $1 ORDER BY t.won_at DESC`,
      [req.user.id]
    );
    res.json({
      user: { email: req.user.email, display_name: req.user.display_name },
      wallet: { tokens: wallet.tokens, last_free_claim_at: wallet.last_free_claim_at },
      boards,
      tickets,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Play ───────────────────────────────────────────────────────────────────

app.post("/api/festivals/:slug/start", requireAuth, async (req, res) => {
  try {
    const { rows: fRows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const festival = fRows[0];
    if (!festival) return res.status(404).json({ error: "Festival not found" });
    if (festival.status !== "live") return res.status(400).json({ error: "This festival isn't live right now" });

    const { artist_id } = req.body;
    const { rows: aRows } = await pool.query(`SELECT * FROM artists WHERE id = $1 AND festival_id = $2`, [artist_id, festival.id]);
    const artist = aRows[0];
    if (!artist) return res.status(404).json({ error: "Artist not found in this lineup" });

    const { board, cells } = await getOrCreateBoard(req.user.id, festival);
    const { rows: allArtistsForBoard } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const boardGridSize = gridSizeForArtistCount(allArtistsForBoard.length);
    const cellsByPositionNow = allArtistsForBoard.map((a) => cells.find((c) => c.artist_id === a.id));
    const state = evaluateBoard(cellsByPositionNow, boardGridSize);
    const boardDone = state.busted || state.completedLines >= MAX_TIERS || (state.completedLines >= 1 && !state.nextLineReachable);
    if (boardDone) return res.status(400).json({ error: state.completedLines >= 1 ? "This board is done — no further lines are reachable" : "This board is busted — no line was still possible" });
    const cell = cells.find((c) => c.artist_id === artist.id);
    if (!cell || cell.status !== "available") return res.status(409).json({ error: "This artist square is no longer available" });

    // Clear any stale pending attempt for this square before starting fresh
    // — and mark its permanent game_attempts record abandoned rather than
    // just vanishing it, so a player who bailed mid-quiz (closed the tab,
    // let it expire) still leaves a row admin can find later.
    const { rows: staleRows } = await pool.query(`SELECT id FROM pending_attempts WHERE user_id = $1 AND festival_id = $2 AND artist_id = $3`, [req.user.id, festival.id, artist.id]);
    if (staleRows.length) {
      await pool.query(`DELETE FROM pending_attempts WHERE user_id = $1 AND festival_id = $2 AND artist_id = $3`, [req.user.id, festival.id, artist.id]);
      await pool.query(`UPDATE game_attempts SET status = 'abandoned', resolved_at = NOW() WHERE id = ANY($1) AND status = 'in_progress'`, [staleRows.map((r) => r.id)]);
    }

    // What this attempt actually costs: the square's own token_cost, plus —
    // only the very first time this board is played — the festival's
    // one-time board_entry_fee_tokens (0 for most festivals). Gated on
    // boards.entry_fee_charged rather than "does a board row exist yet",
    // since a board row gets created just from viewing the festival page
    // (see getOrCreateBoard) long before anyone spends a token on it.
    const artistCost = artist.token_cost ?? 1;
    const entryFeeDue = !board.entry_fee_charged && (festival.board_entry_fee_tokens || 0) > 0 ? festival.board_entry_fee_tokens : 0;
    const totalCost = artistCost + entryFeeDue;

    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.tokens < totalCost) {
      const breakdown = entryFeeDue ? ` (${entryFeeDue} one-time board entry + ${artistCost} for this artist)` : "";
      return res.status(402).json({ error: `Not enough tokens — need ${totalCost}${breakdown}. Buy more or claim your free daily token` });
    }

    // Reserve this board generation's question set for the whole lineup (a
    // no-op after the first square of this generation is started), then
    // read back just this artist's reserved set — a fixed pool chosen once
    // per generation rather than re-rolled from the full bank on every
    // /start call, so resets actually rotate the questions instead of
    // handing the player the same bank back every time.
    const { rows: lineupArtists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1`, [festival.id]);
    await ensureBoardQuestionSets(board, lineupArtists);
    const { rows: reservedRows } = await pool.query(
      `SELECT question_ids FROM board_question_sets WHERE board_id = $1 AND artist_id = $2 AND generation = $3`,
      [board.id, artist.id, board.generation || 0]
    );
    const reservedIds = reservedRows[0]?.question_ids || [];
    if (!reservedIds.length) return res.status(500).json({ error: "No questions available for this artist yet" });

    const { rows: allQuestions } = await pool.query(`SELECT * FROM questions WHERE id = ANY($1)`, [reservedIds]);
    const QUESTIONS_PER_QUIZ = 7;
    // Reserved set is already the quiz-sized draw — just randomize the
    // on-screen order each attempt.
    const questions = [...allQuestions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Shuffle choice order per question so the correct answer isn't always "A".
    const shuffled = questions.map((q) => {
      const choices = [
        { text: q.choice_a, correct: q.correct_choice === "a" },
        { text: q.choice_b, correct: q.correct_choice === "b" },
        { text: q.choice_c, correct: q.correct_choice === "c" },
        { text: q.choice_d, correct: q.correct_choice === "d" },
      ];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return { question: q.question_text, choices, answered: false, wasCorrect: null };
    });

    // Deduct tokens only after everything above succeeded.
    await pool.query(`UPDATE wallets SET tokens = tokens - $1 WHERE user_id = $2`, [totalCost, req.user.id]);
    if (entryFeeDue) {
      await pool.query(`UPDATE boards SET entry_fee_charged = TRUE WHERE id = $1`, [board.id]);
    }

    // Short (7-question) rounds with a difficulty-tuned pass bar: easy needs a
    // near-perfect score, medium/hard ease the bar slightly to offset
    // genuinely harder questions — same idea as PropQuix Solo's per-box
    // tiers, just mapped onto artist difficulty instead of board position.
    // This is the ACCURACY side of difficulty (how many you must get right);
    // the TIME side is handled separately by BOARD_PACE_SECONDS below, since
    // it escalates with how far into THIS board you are, not with which
    // artist you picked.
    const DIFFICULTY_LEVEL = {
      easy: { estPassRatePct: 55, passThreshold: 7 },
      medium: { estPassRatePct: 40, passThreshold: 6 },
      hard: { estPassRatePct: 22, passThreshold: 5 },
    };
    const level = DIFFICULTY_LEVEL[artist.difficulty] || DIFFICULTY_LEVEL.medium;
    const passThreshold = Math.min(level.passThreshold, shuffled.length);
    // How many squares on THIS board are already resolved (cleared or dead)
    // — 0 for your very first pick, climbing from there. A board reset sets
    // every square back to available, which naturally resets this to 0 too.
    const squaresPlayedSoFar = cells.filter((c) => c.status !== "available").length;
    const secondsPerQuestion = BOARD_PACE_SECONDS[Math.min(squaresPlayedSoFar, BOARD_PACE_SECONDS.length - 1)];
    const inserted = await pool.query(
      `INSERT INTO pending_attempts (user_id, festival_id, artist_id, questions_json) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, festival.id, artist.id, JSON.stringify({ items: shuffled, passThreshold })]
    );
    const attemptId = inserted.rows[0].id;
    // Permanent record, same id as the pending_attempts row above — this is
    // the "Game #N" a player sees on screen, and what admin looks up later
    // for stats or a support dispute. See db.js for why it's a separate
    // table from pending_attempts rather than just not deleting that one.
    await pool.query(
      `INSERT INTO game_attempts (id, user_id, festival_id, artist_id, tokens_spent, entry_fee_portion, question_count, pass_threshold, seconds_per_question, board_generation, squares_played_before, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'in_progress')`,
      [attemptId, req.user.id, festival.id, artist.id, totalCost, entryFeeDue, shuffled.length, passThreshold, secondsPerQuestion, board.generation || 0, squaresPlayedSoFar]
    );

    const updatedWallet = await getOrCreateWallet(req.user.id);
    res.json({
      attempt_id: attemptId,
      cost_breakdown: { artist_cost: artistCost, entry_fee: entryFeeDue, total: totalCost },
      artist: { id: artist.id, name: artist.name, genre: artist.genre, difficulty: artist.difficulty },
      pass_threshold: passThreshold,
      level: { ...level, secondsPerQuestion },
      squares_played_before: squaresPlayedSoFar,
      questions: shuffled.map((q) => ({ question: q.question, choices: q.choices.map((c) => c.text) })),
      tokens_remaining: updatedWallet.tokens,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One question at a time, instant right/wrong — mirrors PropQuix Solo's
// /api/solo/answer. The server grades each question the moment it's
// answered so the player gets immediate feedback; /submit below just
// finalizes whatever was (or wasn't) answered by the time it's called.
app.post("/api/festivals/:slug/answer", requireAuth, async (req, res) => {
  try {
    const { attempt_id, question_index, choice_index } = req.body;
    const { rows } = await pool.query(`SELECT * FROM pending_attempts WHERE id = $1 AND user_id = $2`, [attempt_id, req.user.id]);
    const pending = rows[0];
    if (!pending) return res.status(404).json({ error: "Attempt not found" });

    const age = Date.now() - new Date(pending.created_at).getTime();
    if (age > PENDING_TTL_MS) {
      await pool.query(`DELETE FROM pending_attempts WHERE id = $1`, [attempt_id]);
      await pool.query(`UPDATE game_attempts SET status = 'abandoned', resolved_at = NOW() WHERE id = $1 AND status = 'in_progress'`, [attempt_id]);
      return res.status(410).json({ error: "This quiz expired — start a new one" });
    }

    const data = JSON.parse(pending.questions_json);
    const item = data.items[question_index];
    if (!item) return res.status(400).json({ error: "Invalid question index" });
    if (item.answered) return res.status(409).json({ error: "That question was already answered" });

    const isCorrect = item.choices?.[choice_index]?.correct === true;
    item.answered = true;
    item.wasCorrect = isCorrect;
    await pool.query(`UPDATE pending_attempts SET questions_json = $1 WHERE id = $2`, [JSON.stringify(data), attempt_id]);
    res.json({ correct: isCorrect });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/festivals/:slug/submit", requireAuth, async (req, res) => {
  try {
    const { rows: fRows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const festival = fRows[0];
    if (!festival) return res.status(404).json({ error: "Festival not found" });

    const { attempt_id } = req.body;
    const { rows } = await pool.query(`SELECT * FROM pending_attempts WHERE id = $1 AND user_id = $2`, [attempt_id, req.user.id]);
    const pending = rows[0];
    if (!pending) return res.status(404).json({ error: "Attempt not found" });

    const { items, passThreshold } = JSON.parse(pending.questions_json);
    // Unanswered questions (timed out) simply count as wrong — the server
    // never locked in a guess for them.
    let correctCount = 0;
    const breakdown = items.map((q, i) => {
      const isCorrect = q.wasCorrect === true;
      if (isCorrect) correctCount++;
      return { index: i, correct: isCorrect };
    });
    const passed = correctCount >= passThreshold;

    const { board, cells } = await getOrCreateBoard(req.user.id, festival);
    const { rows: artistRows } = await pool.query(`SELECT * FROM artists WHERE id = $1`, [pending.artist_id]);
    const artist = artistRows[0];

    const cellUpdate = await pool.query(
      `UPDATE board_cells SET status = $1 WHERE board_id = $2 AND artist_id = $3 AND status = 'available'`,
      [passed ? "cleared" : "dead", board.id, artist.id]
    );
    if (cellUpdate.rowCount === 0) {
      await pool.query(`DELETE FROM pending_attempts WHERE id = $1`, [attempt_id]);
      await pool.query(`UPDATE game_attempts SET status = 'abandoned', resolved_at = NOW() WHERE id = $1 AND status = 'in_progress'`, [attempt_id]);
      return res.status(409).json({ error: "This square was already resolved — refresh your board" });
    }
    await pool.query(`DELETE FROM pending_attempts WHERE id = $1`, [attempt_id]);
    // Finalize the permanent record — full Q&A transcript included, since
    // this is exactly what admin needs to pull up for a "why is this dead,
    // I know I got that right" support conversation.
    await pool.query(
      `UPDATE game_attempts SET status = $1, correct_count = $2, questions_json = $3, resolved_at = NOW() WHERE id = $4`,
      [passed ? "passed" : "dead", correctCount, JSON.stringify({ items, breakdown }), attempt_id]
    );

    const { rows: artists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const gridSize = gridSizeForArtistCount(artists.length);
    const { rows: freshCells } = await pool.query(`SELECT * FROM board_cells WHERE board_id = $1`, [board.id]);
    const cellsByPosition = artists.map((a) => freshCells.find((c) => c.artist_id === a.id));
    const { completedLines, nextLineReachable, busted } = evaluateBoard(cellsByPosition, gridSize);

    // Award one ticket per newly-completed line beyond what this board
    // already had credit for — 1 line = 1 ticket, 2 lines = 2 tickets,
    // capped at MAX_TIERS and at the festival's remaining ticket supply.
    // Also capped at MAX_TIERS *lifetime, per user per festival* — board
    // resets (see POST /reset below) zero out lines_completed so a fresh
    // board can win again, but without this second check a bust-then-reset
    // loop could otherwise farm unlimited tickets off the same festival by
    // just re-clearing "line 1" over and over on each new generation.
    const previousLines = board.lines_completed || 0;
    const { rows: wonCountRows } = await pool.query(`SELECT COUNT(*)::int AS c FROM tickets_won WHERE user_id = $1 AND festival_id = $2`, [req.user.id, festival.id]);
    const alreadyWonLifetime = wonCountRows[0].c;
    const newLines = Math.max(0, Math.min(completedLines - previousLines, MAX_TIERS - alreadyWonLifetime));
    const ticketsWon = [];
    for (let i = 0; i < newLines; i++) {
      if (festival.tickets_awarded + ticketsWon.length >= festival.tickets_available) break;
      const claimCode = "FQ-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(`INSERT INTO tickets_won (user_id, festival_id, claim_code) VALUES ($1, $2, $3)`, [req.user.id, festival.id, claimCode]);
      ticketsWon.push({ claim_code: claimCode, prize: festival.ticket_prize_label });
    }
    if (ticketsWon.length) {
      await pool.query(`UPDATE festivals SET tickets_awarded = tickets_awarded + $1 WHERE id = $2`, [ticketsWon.length, festival.id]);
    }
    if (completedLines > previousLines) {
      await pool.query(`UPDATE boards SET lines_completed = $1, won_ticket = TRUE WHERE id = $2`, [completedLines, board.id]);
    }

    res.json({
      correct_count: correctCount,
      total: items.length,
      pass_threshold: passThreshold,
      passed,
      breakdown,
      artist: { id: artist.id, name: artist.name },
      just_completed_line: newLines > 0,
      next_line_reachable: nextLineReachable,
      busted,
      tickets_won: ticketsWon,
      // back-compat: first ticket won this call, if any
      ticket_won: ticketsWon[0] || null,
      board: boardPayload(festival, artists, freshCells, gridSize, completedLines >= 1, Math.max(completedLines, previousLines), board.generation, board.entry_fee_charged),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A dead or fully-resolved board gets to start clean rather than sitting
// there unplayable — same "drop another quarter in" idea as an arcade
// machine. Only allowed once the current board actually has nowhere left to
// go (see the same board_over math used everywhere else). Every square goes
// back to available, which — since BOARD_PACE_SECONDS is indexed by how
// many squares on the CURRENT board are resolved — also puts the clock back
// at the start of the curve (18s) for this fresh board; resetting isn't
// meant to punish you further, it's meant to give you a clean new card.
// `generation` still ticks up purely as a reset counter (handy for admin/
// support — "this board's been reset 4 times"), it just no longer feeds the
// pace curve. The lifetime ticket cap in /submit (not lines_completed,
// which this zeroes) is what actually stops a reset loop from farming
// unlimited tickets.
app.post("/api/festivals/:slug/reset", requireAuth, async (req, res) => {
  try {
    const { rows: fRows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const festival = fRows[0];
    if (!festival) return res.status(404).json({ error: "Festival not found" });
    if (festival.status !== "live") return res.status(400).json({ error: "This festival isn't live right now" });

    const { board, cells } = await getOrCreateBoard(req.user.id, festival);
    const { rows: artists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const gridSize = gridSizeForArtistCount(artists.length);
    const cellsByPosition = artists.map((a) => cells.find((c) => c.artist_id === a.id));
    const state = evaluateBoard(cellsByPosition, gridSize);
    const boardOver = state.busted || state.completedLines >= MAX_TIERS || (state.completedLines >= 1 && !state.nextLineReachable);
    if (!boardOver) return res.status(400).json({ error: "This board still has a line in play — no reset needed yet" });

    const nextGeneration = (board.generation || 0) + 1;
    await pool.query(`UPDATE board_cells SET status = 'available' WHERE board_id = $1`, [board.id]);
    await pool.query(`UPDATE boards SET lines_completed = 0, won_ticket = FALSE, generation = $1 WHERE id = $2`, [nextGeneration, board.id]);

    const { rows: freshCells } = await pool.query(`SELECT * FROM board_cells WHERE board_id = $1`, [board.id]);
    res.json({ board: boardPayload(festival, artists, freshCells, gridSize, false, 0, nextGeneration, board.entry_fee_charged) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin API ──────────────────────────────────────────────────────────────
// Everything below requires the x-admin-secret header to match ADMIN_SECRET
// (same pattern as PropQuix's admin panel). The UI lives at /admin.

app.post("/api/admin/reset-board", requireAdmin, async (req, res) => {
  try {
    const { email, slug } = req.body;
    const { rows: uRows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [(email || "").toLowerCase().trim()]);
    const { rows: fRows } = await pool.query(`SELECT id FROM festivals WHERE slug = $1`, [slug]);
    const user = uRows[0], festival = fRows[0];
    if (!user || !festival) return res.status(404).json({ error: "User or festival not found" });
    const { rows: bRows } = await pool.query(`SELECT id FROM boards WHERE user_id = $1 AND festival_id = $2`, [user.id, festival.id]);
    const board = bRows[0];
    if (board) {
      await pool.query(`DELETE FROM board_cells WHERE board_id = $1`, [board.id]);
      await pool.query(`DELETE FROM boards WHERE id = $1`, [board.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings (site lock / preview key, editable without a redeploy) ────────

app.get("/api/admin/settings", requireAdmin, (req, res) => {
  res.json({
    site_locked: siteSettings.site_locked,
    preview_key: siteSettings.preview_key,
    spotlight_festival_id: siteSettings.spotlight_festival_id,
  });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    if (typeof req.body.site_locked === "boolean") await saveSiteSetting("site_locked", req.body.site_locked);
    if (typeof req.body.preview_key === "string") await saveSiteSetting("preview_key", req.body.preview_key);
    // spotlight_festival_id: a number pins that festival; null/empty clears
    // it back to auto (soonest live/upcoming), same as before this existed.
    if ("spotlight_festival_id" in req.body) {
      const val = req.body.spotlight_festival_id;
      await saveSiteSetting("spotlight_festival_id", val === null || val === "" ? "" : String(parseInt(val, 10)));
    }
    res.json({
      site_locked: siteSettings.site_locked,
      preview_key: siteSettings.preview_key,
      spotlight_festival_id: siteSettings.spotlight_festival_id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ────────────────────────────────────────────────────────────

app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const [users, festivals, tokens, boards, ticketsAwarded, ticketsPending] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM users`),
      pool.query(`SELECT status, COUNT(*)::int AS n FROM festivals GROUP BY status`),
      pool.query(`SELECT COALESCE(SUM(tokens), 0)::int AS n FROM wallets`),
      pool.query(`SELECT COUNT(*)::int AS n FROM boards`),
      pool.query(`SELECT COUNT(*)::int AS n FROM tickets_won`),
      pool.query(`SELECT COUNT(*)::int AS n FROM tickets_won WHERE fulfilled = FALSE`),
    ]);
    const byStatus = Object.fromEntries(festivals.rows.map((r) => [r.status, r.n]));
    res.json({
      total_users: users.rows[0].n,
      total_festivals: festivals.rows.reduce((sum, r) => sum + r.n, 0),
      live_festivals: byStatus.live || 0,
      upcoming_festivals: byStatus.upcoming || 0,
      tokens_in_circulation: tokens.rows[0].n,
      boards_played: boards.rows[0].n,
      tickets_awarded: ticketsAwarded.rows[0].n,
      tickets_pending_fulfillment: ticketsPending.rows[0].n,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Festivals ────────────────────────────────────────────────────────────

app.get("/api/admin/festivals", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, COUNT(a.id)::int AS artist_count
      FROM festivals f
      LEFT JOIN artists a ON a.festival_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
    res.json(rows.map((f) => ({ ...f, suggested_entry_cost_tokens: suggestEntryCostTokens(f.avg_ga_price_usd_cents, f.artist_count) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/festivals", requireAdmin, async (req, res) => {
  try {
    const { slug, name, location, event_date, banner_color, entry_cost_tokens, board_entry_fee_tokens, ticket_prize_label, status, tickets_available, avg_ga_price_usd_cents } = req.body;
    if (!slug || !name) return res.status(400).json({ error: "slug and name are required" });
    const { rows } = await pool.query(
      `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, board_entry_fee_tokens, ticket_prize_label, status, tickets_available, avg_ga_price_usd_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        slug.trim(),
        name.trim(),
        location || null,
        event_date || null,
        banner_color || "#ff3d81",
        entry_cost_tokens ?? 1,
        board_entry_fee_tokens ?? 0,
        ticket_prize_label || "1 General Admission Ticket",
        status || "upcoming",
        tickets_available ?? 0,
        avg_ga_price_usd_cents || null,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "A festival with that slug already exists" });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/festivals/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["slug", "name", "location", "event_date", "banner_color", "entry_cost_tokens", "board_entry_fee_tokens", "ticket_prize_label", "status", "tickets_available", "tickets_awarded", "avg_ga_price_usd_cents"];
    const updates = fields.filter((f) => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = updates.map((f) => req.body[f]);
    const { rows } = await pool.query(`UPDATE festivals SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (!rows.length) return res.status(404).json({ error: "Festival not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/festivals/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query(`DELETE FROM board_cells WHERE board_id IN (SELECT id FROM boards WHERE festival_id = $1)`, [id]);
    await pool.query(`DELETE FROM boards WHERE festival_id = $1`, [id]);
    await pool.query(`DELETE FROM pending_attempts WHERE festival_id = $1`, [id]);
    await pool.query(`DELETE FROM game_attempts WHERE festival_id = $1`, [id]);
    await pool.query(`DELETE FROM tickets_won WHERE festival_id = $1`, [id]);
    await pool.query(`DELETE FROM questions WHERE artist_id IN (SELECT id FROM artists WHERE festival_id = $1)`, [id]);
    await pool.query(`DELETE FROM artists WHERE festival_id = $1`, [id]);
    const { rowCount } = await pool.query(`DELETE FROM festivals WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: "Festival not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Artists / lineup ─────────────────────────────────────────────────────

app.get("/api/admin/festivals/:id/artists", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, COUNT(q.id)::int AS question_count
      FROM artists a
      LEFT JOIN questions q ON q.artist_id = a.id
      WHERE a.festival_id = $1
      GROUP BY a.id
      ORDER BY a.position ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/festivals/:id/artists", requireAdmin, async (req, res) => {
  try {
    const { name, genre, set_time, position, difficulty, token_cost, target_pass_rate } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO artists (festival_id, name, genre, set_time, position, difficulty, token_cost, target_pass_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, name.trim(), genre || null, set_time || null, position ?? 0, difficulty || "medium", token_cost ?? 1, target_pass_rate ?? null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/artists/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["name", "genre", "set_time", "position", "difficulty", "token_cost", "target_pass_rate"];
    const updates = fields.filter((f) => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = updates.map((f) => req.body[f]);
    const { rows } = await pool.query(`UPDATE artists SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (!rows.length) return res.status(404).json({ error: "Artist not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/artists/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query(`DELETE FROM board_cells WHERE artist_id = $1`, [id]);
    await pool.query(`DELETE FROM pending_attempts WHERE artist_id = $1`, [id]);
    await pool.query(`DELETE FROM game_attempts WHERE artist_id = $1`, [id]);
    await pool.query(`DELETE FROM questions WHERE artist_id = $1`, [id]);
    const { rowCount } = await pool.query(`DELETE FROM artists WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: "Artist not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Trivia questions ─────────────────────────────────────────────────────

app.get("/api/admin/artists/:id/questions", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM questions WHERE artist_id = $1 ORDER BY id ASC`, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/artists/:id/questions", requireAdmin, async (req, res) => {
  try {
    const { question_text, choice_a, choice_b, choice_c, choice_d, correct_choice } = req.body;
    if (!question_text || !choice_a || !choice_b || !choice_c || !choice_d || !correct_choice) {
      return res.status(400).json({ error: "question_text, choice_a..d, and correct_choice are all required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO questions (artist_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["question_text", "choice_a", "choice_b", "choice_c", "choice_d", "correct_choice"];
    const updates = fields.filter((f) => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = updates.map((f) => req.body[f]);
    const { rows } = await pool.query(`UPDATE questions SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (!rows.length) return res.status(404).json({ error: "Question not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM questions WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Question not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Per-artist "top up the bank" button. Drafts with Claude, cross-checks each
// candidate with two independent blind judges (Claude + GPT), and only
// auto-approves a question into the live bank when both judges land on the
// drafted answer AND both call it the artist's assigned difficulty tier.
// Everything else lands in the review queue below instead of going live.
app.post("/api/admin/artists/:id/generate-questions", requireAdmin, async (req, res) => {
  try {
    const { rows: artistRows } = await pool.query(`SELECT * FROM artists WHERE id = $1`, [req.params.id]);
    const artist = artistRows[0];
    if (!artist) return res.status(404).json({ error: "Artist not found" });
    const { rows: festivalRows } = await pool.query(`SELECT * FROM festivals WHERE id = $1`, [artist.festival_id]);
    const festival = festivalRows[0];

    const requestedCount = Number(req.body.count);
    const count = Number.isFinite(requestedCount) && requestedCount > 0 ? Math.min(requestedCount, 60) : 10;

    const result = await generateAndVerifyQuestions(pool, artist, festival, count);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bank size targets by difficulty (see question_gen.js) — purely a UI hint
// for admin's "top up to target" button, never used to change pass rates.
app.get("/api/admin/question-bank-targets", requireAdmin, (req, res) => {
  res.json(TARGET_BANK_SIZE);
});

// Everything an AI draft didn't get unanimous sign-off on, across every
// artist — the human backstop before a generated question can ever reach a
// real, ticket-stakes game.
app.get("/api/admin/questions/review-queue", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.*, a.name AS artist_name, a.difficulty AS artist_difficulty, f.name AS festival_name
      FROM questions q
      JOIN artists a ON a.id = q.artist_id
      JOIN festivals f ON f.id = a.festival_id
      WHERE q.verification_status = 'needs_review'
      ORDER BY q.created_at ASC
    `);
    res.json(rows.map((r) => ({ ...r, review_notes: r.review_notes ? JSON.parse(r.review_notes) : null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/questions/:id/approve", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE questions SET verification_status = 'human' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Question not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/questions/:id/reject", requireAdmin, async (req, res) => {
  try {
    // Kept (not deleted) with status 'rejected' — excluded from every board
    // draw (see ensureBoardQuestionSets) but still around for audit trail.
    const { rows } = await pool.query(
      `UPDATE questions SET verification_status = 'rejected' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Question not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Users ────────────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.display_name, u.created_at,
             COALESCE(w.tokens, 0) AS tokens,
             (SELECT COUNT(*)::int FROM boards b WHERE b.user_id = u.id) AS boards_played,
             (SELECT COUNT(*)::int FROM tickets_won t WHERE t.user_id = u.id) AS tickets_won
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users/:id/tokens", requireAdmin, async (req, res) => {
  try {
    const { delta, set } = req.body;
    await pool.query(`INSERT INTO wallets (user_id, tokens) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`, [req.params.id]);
    let rows;
    if (typeof set === "number") {
      ({ rows } = await pool.query(`UPDATE wallets SET tokens = $2, updated_at = NOW() WHERE user_id = $1 RETURNING *`, [req.params.id, Math.max(0, set)]));
    } else if (typeof delta === "number") {
      ({ rows } = await pool.query(
        `UPDATE wallets SET tokens = GREATEST(0, tokens + $2), updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        [req.params.id, delta]
      ));
    } else {
      return res.status(400).json({ error: "Provide either delta or set" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query(`DELETE FROM board_cells WHERE board_id IN (SELECT id FROM boards WHERE user_id = $1)`, [id]);
    await pool.query(`DELETE FROM boards WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM pending_attempts WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM game_attempts WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM tickets_won WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM token_purchases WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM wallets WHERE user_id = $1`, [id]);
    const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tickets / winners ────────────────────────────────────────────────────

app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, u.email, u.display_name, f.name AS festival_name, f.slug AS festival_slug
      FROM tickets_won t
      JOIN users u ON u.id = t.user_id
      JOIN festivals f ON f.id = t.festival_id
      ORDER BY t.won_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/tickets/:id/claim-code", requireAdmin, async (req, res) => {
  try {
    const { claim_code } = req.body;
    if (!claim_code) return res.status(400).json({ error: "claim_code is required" });
    const { rows } = await pool.query(`UPDATE tickets_won SET claim_code = $2 WHERE id = $1 RETURNING *`, [req.params.id, claim_code]);
    if (!rows.length) return res.status(404).json({ error: "Ticket not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/tickets/:id/fulfill", requireAdmin, async (req, res) => {
  try {
    const fulfilled = req.body.fulfilled !== false;
    const { rows } = await pool.query(`UPDATE tickets_won SET fulfilled = $2 WHERE id = $1 RETURNING *`, [req.params.id, fulfilled]);
    if (!rows.length) return res.status(404).json({ error: "Ticket not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Game log (permanent per-attempt record) ────────────────────────────────
// Every "Game #N" a player sees in the confirm-play modal and the quiz
// header lives here forever, so a support conversation ("I answered that
// right, why did it die") or a stats question can be resolved by pulling
// up the exact record instead of trusting anyone's memory of what happened.
app.get("/api/admin/game-attempts", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const filters = [];
    const params = [];
    if (req.query.status) { params.push(req.query.status); filters.push(`ga.status = $${params.length}`); }
    if (req.query.user_email) { params.push(`%${req.query.user_email.toLowerCase()}%`); filters.push(`LOWER(u.email) LIKE $${params.length}`); }
    if (req.query.festival_id) { params.push(req.query.festival_id); filters.push(`ga.festival_id = $${params.length}`); }
    if (req.query.id) { params.push(req.query.id); filters.push(`ga.id = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT ga.id, ga.status, ga.tokens_spent, ga.question_count, ga.pass_threshold, ga.correct_count,
              ga.started_at, ga.resolved_at,
              u.email AS user_email, u.display_name AS user_name,
              f.name AS festival_name, f.slug AS festival_slug,
              a.name AS artist_name, a.difficulty AS artist_difficulty
       FROM game_attempts ga
       JOIN users u ON u.id = ga.user_id
       JOIN festivals f ON f.id = ga.festival_id
       JOIN artists a ON a.id = ga.artist_id
       ${where}
       ORDER BY ga.started_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/game-attempts/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ga.*, u.email AS user_email, u.display_name AS user_name,
              f.name AS festival_name, f.slug AS festival_slug,
              a.name AS artist_name, a.difficulty AS artist_difficulty
       FROM game_attempts ga
       JOIN users u ON u.id = ga.user_id
       JOIN festivals f ON f.id = ga.festival_id
       JOIN artists a ON a.id = ga.artist_id
       WHERE ga.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Game not found" });
    const game = rows[0];
    game.transcript = game.questions_json ? JSON.parse(game.questions_json) : null;
    delete game.questions_json;
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Token packs (sitewide pricing, editable without a redeploy) ───────────

app.get("/api/admin/token-packs", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM token_packs ORDER BY sort_order ASC, id ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/token-packs", requireAdmin, async (req, res) => {
  try {
    const { tokens, price_usd_cents, label, color_key, badge, bonus_pct, sort_order, active } = req.body;
    if (!tokens || !price_usd_cents || !label) return res.status(400).json({ error: "tokens, price_usd_cents, and label are required" });
    const { rows } = await pool.query(
      `INSERT INTO token_packs (tokens, price_usd_cents, label, color_key, badge, bonus_pct, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tokens, price_usd_cents, label.trim(), color_key || "blue", badge || null, bonus_pct || 0, sort_order ?? 0, active !== false]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/token-packs/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["tokens", "price_usd_cents", "label", "color_key", "badge", "bonus_pct", "sort_order", "active"];
    const updates = fields.filter((f) => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = updates.map((f) => req.body[f]);
    const { rows } = await pool.query(`UPDATE token_packs SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (!rows.length) return res.status(404).json({ error: "Pack not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/token-packs/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM token_packs WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Pack not found" });
    res.json({ success: true });
  } catch (err) {
    // A pack with purchase history hits the token_purchases FK — deactivate
    // instead of deleting so the revenue history it's attached to stays intact.
    if (err.code === "23503") return res.status(409).json({ error: "This pack has purchase history — deactivate it instead of deleting." });
    res.status(500).json({ error: err.message });
  }
});

// ── Cross-festival artist registry ──────────────────────────────────────
// See global_artists in db.js — this is the admin view onto the same-artist
// links seed-utils.js builds automatically. Mostly a read/cleanup surface:
// fix a genre, rename a canonical entry, or remove one nothing points to.

app.get("/api/admin/global-artists", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ga.id, ga.canonical_name, ga.genre,
             COUNT(a.id)::int AS appearances,
             COALESCE(jsonb_agg(DISTINCT jsonb_build_object('slug', f.slug, 'name', f.name)) FILTER (WHERE f.id IS NOT NULL), '[]'::jsonb) AS festivals
      FROM global_artists ga
      LEFT JOIN artists a ON a.global_artist_id = ga.id
      LEFT JOIN festivals f ON f.id = a.festival_id
      GROUP BY ga.id
      ORDER BY appearances DESC, ga.canonical_name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/global-artists/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["canonical_name", "genre"];
    const updates = fields.filter((f) => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const setClause = updates.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const values = updates.map((f) => req.body[f]);
    const { rows } = await pool.query(`UPDATE global_artists SET ${setClause} WHERE id = $1 RETURNING *`, [req.params.id, ...values]);
    if (!rows.length) return res.status(404).json({ error: "Artist not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Another artist already uses that canonical name" });
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/global-artists/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM global_artists WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Artist not found" });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "23503") return res.status(409).json({ error: "Still linked to lineup slots — unlink them first" });
    res.status(500).json({ error: err.message });
  }
});

// ── Analytics (revenue + gameplay usage) ────────────────────────────────
// Revenue is real math over token_purchases (logged by the demo-buy flow
// today, by a real payment processor later — same table either way).
// Usage comes straight from board_cells, which already permanently records
// every cleared/dead square, so none of this needed a new tracking table.

app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const [revenueTotals, revenueByPack, usageTotals, usageByFestival, byDifficulty, hardestArtists] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(price_usd_cents),0)::int AS total_revenue_usd_cents, COALESCE(SUM(tokens),0)::int AS total_tokens_sold, COUNT(*)::int AS purchases_count FROM token_purchases`),
      pool.query(`
        SELECT COALESCE(tp.label, 'Other / legacy') AS label, COUNT(*)::int AS purchases_count,
               COALESCE(SUM(p.tokens),0)::int AS tokens_sold, COALESCE(SUM(p.price_usd_cents),0)::int AS revenue_usd_cents
        FROM token_purchases p LEFT JOIN token_packs tp ON tp.id = p.pack_id
        GROUP BY tp.label ORDER BY revenue_usd_cents DESC
      `),
      pool.query(`
        SELECT (SELECT COUNT(*)::int FROM boards) AS boards_started,
               (SELECT COUNT(*)::int FROM boards WHERE won_ticket = TRUE) AS boards_won,
               (SELECT COALESCE(SUM(tickets_awarded),0)::int FROM festivals) AS tickets_awarded,
               (SELECT COALESCE(SUM(tickets_available),0)::int FROM festivals) AS tickets_available
      `),
      pool.query(`
        SELECT f.name, f.slug, f.status,
               (SELECT COUNT(*)::int FROM boards b WHERE b.festival_id = f.id) AS boards_started,
               (SELECT COUNT(*)::int FROM board_cells bc JOIN boards b ON b.id = bc.board_id WHERE b.festival_id = f.id AND bc.status = 'cleared') AS cleared,
               (SELECT COUNT(*)::int FROM board_cells bc JOIN boards b ON b.id = bc.board_id WHERE b.festival_id = f.id AND bc.status = 'dead') AS dead,
               f.tickets_awarded, f.tickets_available
        FROM festivals f
        ORDER BY boards_started DESC, f.name ASC
      `),
      pool.query(`
        SELECT a.difficulty,
               COUNT(*) FILTER (WHERE bc.status = 'cleared')::int AS cleared,
               COUNT(*) FILTER (WHERE bc.status = 'dead')::int AS dead
        FROM board_cells bc JOIN artists a ON a.id = bc.artist_id
        WHERE bc.status IN ('cleared', 'dead')
        GROUP BY a.difficulty
      `),
      pool.query(`
        SELECT * FROM (
          SELECT a.name, f.name AS festival_name, a.difficulty,
                 COUNT(*) FILTER (WHERE bc.status = 'cleared')::int AS cleared,
                 COUNT(*) FILTER (WHERE bc.status = 'dead')::int AS dead
          FROM board_cells bc
          JOIN artists a ON a.id = bc.artist_id
          JOIN festivals f ON f.id = a.festival_id
          WHERE bc.status IN ('cleared', 'dead')
          GROUP BY a.id, a.name, f.name, a.difficulty
        ) sub
        ORDER BY dead DESC, (dead::float / NULLIF(dead + cleared, 0)) DESC NULLS LAST
        LIMIT 10
      `),
    ]);
    res.json({
      revenue: { ...revenueTotals.rows[0], by_pack: revenueByPack.rows },
      usage: { ...usageTotals.rows[0], by_festival: usageByFestival.rows },
      difficulty: byDifficulty.rows,
      hardest_artists: hardestArtists.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Traffic (stopgap pageview log) ────────────────────────────────────────
app.get("/api/admin/traffic", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    const [totals, bySource, byDay, topPages, topReferrers] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total_views FROM page_views WHERE created_at > NOW() - ($1 || ' days')::interval`, [days]),
      pool.query(`
        SELECT source_type, COUNT(*)::int AS views
        FROM page_views WHERE created_at > NOW() - ($1 || ' days')::interval
        GROUP BY source_type ORDER BY views DESC
      `, [days]),
      pool.query(`
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS views,
               COUNT(*) FILTER (WHERE source_type = 'google')::int AS google_views
        FROM page_views WHERE created_at > NOW() - ($1 || ' days')::interval
        GROUP BY day ORDER BY day ASC
      `, [days]),
      pool.query(`
        SELECT path, COUNT(*)::int AS views
        FROM page_views WHERE created_at > NOW() - ($1 || ' days')::interval
        GROUP BY path ORDER BY views DESC LIMIT 15
      `, [days]),
      pool.query(`
        SELECT referrer_host, source_type, COUNT(*)::int AS views
        FROM page_views WHERE created_at > NOW() - ($1 || ' days')::interval AND referrer_host IS NOT NULL
        GROUP BY referrer_host, source_type ORDER BY views DESC LIMIT 15
      `, [days]),
    ]);
    res.json({
      days,
      total_views: totals.rows[0].total_views,
      by_source: bySource.rows,
      by_day: byDay.rows,
      top_pages: topPages.rows,
      top_referrers: topReferrers.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-time reset for when the log has been polluted by dev/QA/owner
// traffic that predates TRAFFIC_EXCLUDE_IPS being set — there's no per-row
// IP stored historically, so individual bad rows can't be picked out; this
// clears everything and lets the numbers start clean from here on.
app.delete("/api/admin/traffic", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM page_views`);
    res.json({ success: true, deleted: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4200;

(async () => {
  try {
    await initSchema();
    await seed();
    await loadSiteSettings();
    app.listen(PORT, () => console.log(`FestiQ running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start FestiQ:", err);
    process.exit(1);
  }
})();
