const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, initSchema } = require("./db");
const { gridSizeForArtistCount, evaluateBoard, MAX_TIERS } = require("./board");
const { seed } = require("./seed");

const app = express();
app.use(cors());
app.use(express.json());

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
};

async function loadSiteSettings() {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM settings WHERE key IN ('site_locked', 'preview_key')`);
    for (const row of rows) {
      if (row.key === "site_locked") siteSettings.site_locked = row.value === "true";
      if (row.key === "preview_key") siteSettings.preview_key = row.value || "";
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

app.use((req, res, next) => {
  if (
    !siteSettings.site_locked ||
    req.path.startsWith("/api/") ||
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/admin")
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
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  if (siteSettings.site_locked) {
    res.send("User-agent: *\nDisallow: /\n");
  } else {
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${req.protocol}://${req.get("host")}/sitemap.xml\n`);
  }
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    res.type("application/xml");
    if (siteSettings.site_locked) return res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    const { rows: festivals } = await pool.query(`SELECT slug, status FROM festivals ORDER BY event_date ASC`);
    const urls = [`<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`];
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
// structured data baked in, then hands off to the normal SPA by setting the
// URL hash — so a human visiting the link gets the exact same app, while a
// crawler or scraper sees real, specific content before any JS runs.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

app.get("/festival/:slug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const f = rows[0];
    if (!f) return next(); // no such festival — fall through to the SPA's own "not found" UI
    const { rows: artists } = await pool.query(`SELECT name, genre FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [f.id]);

    const base = `${req.protocol}://${req.get("host")}`;
    const title = f.status === "live"
      ? `${f.name} Trivia — Win ${f.ticket_prize_label || "a Ticket"} | FestiQ`
      : `${f.name} — Coming to FestiQ`;
    const lineupNames = artists.map((a) => a.name).join(", ");
    const description = f.status === "live"
      ? `Play free festival trivia for ${f.name}${f.location ? " in " + f.location : ""}. Clear a row of artist quizzes — ${lineupNames ? "featuring " + lineupNames.slice(0, 180) + (lineupNames.length > 180 ? "…" : "") : "full lineup on the board"} — and win ${f.ticket_prize_label || "a ticket"}.`
      : `${f.name}${f.location ? " · " + f.location : ""}${f.event_date ? " · " + f.event_date : ""}. Lineup and trivia board drop soon on FestiQ.`;
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
<script>window.__FESTIQ_INITIAL_SLUG = ${JSON.stringify(f.slug)};</script>
</head>`);
    res.send(html);
  } catch (err) {
    next();
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

function boardPayload(festival, artists, cells, gridSize, wonTicket, linesCompleted) {
  const cellByArtist = Object.fromEntries(cells.map((c) => [c.artist_id, c.status]));
  return {
    grid_size: gridSize,
    won_ticket: !!wonTicket,
    lines_completed: linesCompleted || 0,
    max_tiers: MAX_TIERS,
    cells: artists.map((a) => ({
      artist_id: a.id,
      name: a.name,
      genre: a.genre,
      set_time: a.set_time,
      difficulty: a.difficulty,
      position: a.position,
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

// ─── Festivals ──────────────────────────────────────────────────────────────

app.get("/api/festivals", async (req, res) => {
  try {
    const { rows: festivals } = await pool.query(`SELECT * FROM festivals ORDER BY event_date ASC`);
    const out = [];
    for (const f of festivals) {
      const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS c FROM artists WHERE festival_id = $1`, [f.id]);
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
        token_price_usd_cents: f.token_price_usd_cents,
        lineup_count: parseInt(countRows[0].c, 10),
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/festivals/:slug", async (req, res) => {
  try {
    const { rows: fRows } = await pool.query(`SELECT * FROM festivals WHERE slug = $1`, [req.params.slug]);
    const festival = fRows[0];
    if (!festival) return res.status(404).json({ error: "Festival not found" });
    const { rows: artists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const gridSize = gridSizeForArtistCount(artists.length);

    let board = null;
    const header = req.headers.authorization;
    if (festival.status === "live" && header && header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
        const { board: b, cells } = await getOrCreateBoard(decoded.id, festival);
        board = boardPayload(festival, artists, cells, gridSize, b.won_ticket, b.lines_completed);
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
      token_price_usd_cents: festival.token_price_usd_cents,
      grid_size: gridSize,
      artists: artists.map((a) => ({ id: a.id, name: a.name, genre: a.genre, set_time: a.set_time, position: a.position, difficulty: a.difficulty })),
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
// same pattern as PropQuix's solo token packs.
app.post("/api/wallet/demo-buy-tokens", requireAuth, async (req, res) => {
  try {
    const quantity = Math.max(1, Math.min(20, parseInt(req.body?.quantity) || 1));
    await pool.query(`UPDATE wallets SET tokens = tokens + $1 WHERE user_id = $2`, [quantity, req.user.id]);
    const updated = await getOrCreateWallet(req.user.id);
    res.json({ tokens: updated.tokens, demo: true });
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

    // Clear any stale pending attempt for this square before starting fresh.
    await pool.query(`DELETE FROM pending_attempts WHERE user_id = $1 AND festival_id = $2 AND artist_id = $3`, [req.user.id, festival.id, artist.id]);

    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.tokens < festival.entry_cost_tokens) return res.status(402).json({ error: "Not enough tokens — buy more or claim your free daily token" });

    const { rows: allQuestions } = await pool.query(`SELECT * FROM questions WHERE artist_id = $1`, [artist.id]);
    if (!allQuestions.length) return res.status(500).json({ error: "No questions available for this artist yet" });

    // Shuffle question order too, then cap at QUESTIONS_PER_QUIZ — keeps every
    // quiz the same short length even if an artist's bank grows past 7.
    const QUESTIONS_PER_QUIZ = 7;
    const shuffledQuestionOrder = [...allQuestions];
    for (let i = shuffledQuestionOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestionOrder[i], shuffledQuestionOrder[j]] = [shuffledQuestionOrder[j], shuffledQuestionOrder[i]];
    }
    const questions = shuffledQuestionOrder.slice(0, QUESTIONS_PER_QUIZ);

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

    // Deduct the token only after everything above succeeded.
    await pool.query(`UPDATE wallets SET tokens = tokens - $1 WHERE user_id = $2`, [festival.entry_cost_tokens, req.user.id]);

    // Short (7-question) rounds with a difficulty-tuned pass bar: easy needs a
    // perfect score, medium/hard ease the bar slightly to offset genuinely
    // harder questions — same idea as PropQuix Solo's per-box tiers, just
    // mapped onto artist difficulty instead of board position.
    const DIFFICULTY_LEVEL = {
      easy: { secondsPerQuestion: 20, estPassRatePct: 55, passThreshold: 7 },
      medium: { secondsPerQuestion: 16, estPassRatePct: 40, passThreshold: 6 },
      hard: { secondsPerQuestion: 12, estPassRatePct: 22, passThreshold: 5 },
    };
    const level = DIFFICULTY_LEVEL[artist.difficulty] || DIFFICULTY_LEVEL.medium;
    const passThreshold = Math.min(level.passThreshold, shuffled.length);
    const inserted = await pool.query(
      `INSERT INTO pending_attempts (user_id, festival_id, artist_id, questions_json) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, festival.id, artist.id, JSON.stringify({ items: shuffled, passThreshold })]
    );

    const updatedWallet = await getOrCreateWallet(req.user.id);
    res.json({
      attempt_id: inserted.rows[0].id,
      artist: { id: artist.id, name: artist.name, genre: artist.genre, difficulty: artist.difficulty },
      pass_threshold: passThreshold,
      level,
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
      return res.status(409).json({ error: "This square was already resolved — refresh your board" });
    }
    await pool.query(`DELETE FROM pending_attempts WHERE id = $1`, [attempt_id]);

    const { rows: artists } = await pool.query(`SELECT * FROM artists WHERE festival_id = $1 ORDER BY position ASC`, [festival.id]);
    const gridSize = gridSizeForArtistCount(artists.length);
    const { rows: freshCells } = await pool.query(`SELECT * FROM board_cells WHERE board_id = $1`, [board.id]);
    const cellsByPosition = artists.map((a) => freshCells.find((c) => c.artist_id === a.id));
    const { completedLines, nextLineReachable, busted } = evaluateBoard(cellsByPosition, gridSize);

    // Award one ticket per newly-completed line beyond what this board
    // already had credit for — 1 line = 1 ticket, 2 lines = 2 tickets,
    // capped at MAX_TIERS and at the festival's remaining ticket supply.
    const previousLines = board.lines_completed || 0;
    const newLines = Math.max(0, completedLines - previousLines);
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
      board: boardPayload(festival, artists, freshCells, gridSize, completedLines >= 1, Math.max(completedLines, previousLines)),
    });
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
  res.json({ site_locked: siteSettings.site_locked, preview_key: siteSettings.preview_key });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    if (typeof req.body.site_locked === "boolean") await saveSiteSetting("site_locked", req.body.site_locked);
    if (typeof req.body.preview_key === "string") await saveSiteSetting("preview_key", req.body.preview_key);
    res.json({ site_locked: siteSettings.site_locked, preview_key: siteSettings.preview_key });
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
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/festivals", requireAdmin, async (req, res) => {
  try {
    const { slug, name, location, event_date, banner_color, entry_cost_tokens, ticket_prize_label, status, tickets_available } = req.body;
    if (!slug || !name) return res.status(400).json({ error: "slug and name are required" });
    const { rows } = await pool.query(
      `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, ticket_prize_label, status, tickets_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        slug.trim(),
        name.trim(),
        location || null,
        event_date || null,
        banner_color || "#ff3d81",
        entry_cost_tokens ?? 1,
        ticket_prize_label || "1 General Admission Ticket",
        status || "upcoming",
        tickets_available ?? 0,
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
    const fields = ["slug", "name", "location", "event_date", "banner_color", "entry_cost_tokens", "ticket_prize_label", "status", "tickets_available", "tickets_awarded"];
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
    const { name, genre, set_time, position, difficulty } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO artists (festival_id, name, genre, set_time, position, difficulty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, name.trim(), genre || null, set_time || null, position ?? 0, difficulty || "medium"]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/artists/:id", requireAdmin, async (req, res) => {
  try {
    const fields = ["name", "genre", "set_time", "position", "difficulty"];
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
    await pool.query(`DELETE FROM tickets_won WHERE user_id = $1`, [id]);
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
