const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool, initSchema } = require("./db");
const { gridSizeForArtistCount, evaluateBoard } = require("./board");
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
const SITE_LOCKED = process.env.SITE_LOCKED !== "false"; // locked by default
const PREVIEW_KEY = process.env.PREVIEW_KEY || "";
const PREVIEW_COOKIE = "festiq_preview";

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
  res.setHeader("X-Robots-Tag", "noindex, nofollow"); // never index while under wraps (or after, until you ask to)
  if (!SITE_LOCKED || req.path.startsWith("/api/")) return next();

  const cookies = parseCookies(req.headers.cookie);
  const keyFromQuery = req.query.key;

  if (PREVIEW_KEY && keyFromQuery === PREVIEW_KEY) {
    res.setHeader(
      "Set-Cookie",
      `${PREVIEW_COOKIE}=${encodeURIComponent(PREVIEW_KEY)}; Max-Age=${60 * 60 * 24 * 90}; Path=/; HttpOnly; SameSite=Lax`
    );
    return next();
  }
  if (PREVIEW_KEY && cookies[PREVIEW_COOKIE] === PREVIEW_KEY) return next();

  res.status(200).sendFile(path.join(__dirname, "..", "public", "coming-soon.html"));
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

function boardPayload(festival, artists, cells, gridSize, wonTicket) {
  const cellByArtist = Object.fromEntries(cells.map((c) => [c.artist_id, c.status]));
  return {
    grid_size: gridSize,
    won_ticket: !!wonTicket,
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
    if (header && header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
        const { board: b, cells } = await getOrCreateBoard(decoded.id, festival);
        board = boardPayload(festival, artists, cells, gridSize, b.won_ticket);
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
    if (board.won_ticket) return res.status(400).json({ error: "You've already won a ticket to this festival" });
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
    const { hasCompletedLine, busted } = evaluateBoard(cellsByPosition, gridSize);

    let ticketWon = null;
    const justCompletedLine = hasCompletedLine && !board.won_ticket;
    if (justCompletedLine && festival.tickets_awarded < festival.tickets_available) {
      const claimCode = "FQ-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(`INSERT INTO tickets_won (user_id, festival_id, claim_code) VALUES ($1, $2, $3)`, [req.user.id, festival.id, claimCode]);
      await pool.query(`UPDATE boards SET won_ticket = TRUE WHERE id = $1`, [board.id]);
      await pool.query(`UPDATE festivals SET tickets_awarded = tickets_awarded + 1 WHERE id = $1`, [festival.id]);
      ticketWon = { claim_code: claimCode, prize: festival.ticket_prize_label };
    }

    res.json({
      correct_count: correctCount,
      total: items.length,
      pass_threshold: passThreshold,
      passed,
      breakdown,
      artist: { id: artist.id, name: artist.name },
      just_completed_line: justCompletedLine,
      busted,
      ticket_won: ticketWon,
      board: boardPayload(festival, artists, freshCells, gridSize, board.won_ticket || !!ticketWon),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Minimal admin (dev only — no auth gate yet, prototype scope) ──────────

app.post("/api/admin/reset-board", async (req, res) => {
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

const PORT = process.env.PORT || 4200;

(async () => {
  try {
    await initSchema();
    await seed();
    app.listen(PORT, () => console.log(`FestiQ running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start FestiQ:", err);
    process.exit(1);
  }
})();
