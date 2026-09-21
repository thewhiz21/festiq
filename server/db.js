const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wallets (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      tokens INTEGER NOT NULL DEFAULT 0,
      last_free_claim_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- One "room" per festival. grid_size is the board's NxN dimension,
    -- derived from how many artists are in the lineup (capped at 5x5).
    CREATE TABLE IF NOT EXISTS festivals (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      event_date TEXT,
      banner_color TEXT DEFAULT '#ff3d81',
      entry_cost_tokens INTEGER NOT NULL DEFAULT 1,
      token_price_usd_cents INTEGER NOT NULL DEFAULT 1000,
      ticket_prize_label TEXT DEFAULT '1 General Admission Ticket',
      status TEXT NOT NULL DEFAULT 'live',
      tickets_available INTEGER NOT NULL DEFAULT 1,
      tickets_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- One row per lineup slot / board square.
    CREATE TABLE IF NOT EXISTS artists (
      id SERIAL PRIMARY KEY,
      festival_id INTEGER NOT NULL REFERENCES festivals(id),
      name TEXT NOT NULL,
      genre TEXT,
      set_time TEXT,
      position INTEGER NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      -- How many tokens ONE attempt at this specific square costs. Separate
      -- from difficulty on purpose: difficulty is how hard the trivia
      -- actually is (drives the pass bar), token_cost is what the market
      -- will bear for a shot at this artist (drives revenue) — a headliner
      -- can be priced high because of demand even if it isn't the hardest
      -- square on the board, and vice versa. Replaces the old flat
      -- per-festival festivals.entry_cost_tokens as the actual charge.
      token_cost INTEGER NOT NULL DEFAULT 1,
      -- Admin's intended clearance rate for this square (0-100, nullable).
      -- Not yet wired to auto-tune anything — it's the target half of a
      -- target-vs-actual comparison once there's real play data; question
      -- count, pass threshold, and timer are what admin tunes by hand to
      -- try to hit it.
      target_pass_rate INTEGER
    );
    ALTER TABLE artists ADD COLUMN IF NOT EXISTS token_cost INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE artists ADD COLUMN IF NOT EXISTS target_pass_rate INTEGER;

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      question_text TEXT NOT NULL,
      choice_a TEXT NOT NULL,
      choice_b TEXT NOT NULL,
      choice_c TEXT NOT NULL,
      choice_d TEXT NOT NULL,
      correct_choice TEXT NOT NULL,
      -- Provenance for AI-generated questions (NULL/'human' for hand-written
      -- ones like the seed data). drafted_by/verified_by name which models
      -- were involved; verification_status gates whether a question is
      -- actually playable (see server/question_gen.js). estimated_difficulty
      -- is what the two verifying models judged the question to be, checked
      -- against this artist's assigned difficulty tier — a mismatch is a
      -- reason to hold a question for review even if both models agree on
      -- the correct answer, since bank size must never be the thing that
      -- quietly changes how easy an artist's square actually is.
      drafted_by TEXT,
      verified_by TEXT,
      verification_status TEXT NOT NULL DEFAULT 'human', -- human | auto_approved | needs_review | rejected
      estimated_difficulty TEXT,
      review_notes TEXT, -- JSON: both verifying models' answer + difficulty verdicts, for the admin review queue
      source_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS drafted_by TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS verified_by TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'human';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS estimated_difficulty TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS review_notes TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_note TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    -- One board per user per festival. Resets only if the admin resets the
    -- festival (e.g. after tickets are awarded / a new lineup posts).
    CREATE TABLE IF NOT EXISTS boards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      festival_id INTEGER NOT NULL REFERENCES festivals(id),
      won_ticket BOOLEAN NOT NULL DEFAULT FALSE,
      lines_completed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, festival_id)
    );
    ALTER TABLE boards ADD COLUMN IF NOT EXISTS lines_completed INTEGER NOT NULL DEFAULT 0;
    -- Bumped every time a player resets a dead/done board for a fresh one
    -- (see POST /reset in server.js) — purely a "how many times has this
    -- board been reset" counter for admin/support now; it no longer drives
    -- the pace curve (see BOARD_PACE_SECONDS in server.js, which is keyed
    -- off how many squares on the CURRENT board are resolved instead).
    ALTER TABLE boards ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 0;
    -- Whether the one-time board_entry_fee_tokens (see festivals below) has
    -- already been charged for this board. Set once, on the first /start
    -- call for a board — never re-charged on a reset, since a reset is the
    -- same board getting a fresh card, not a new entry.
    ALTER TABLE boards ADD COLUMN IF NOT EXISTS entry_fee_charged BOOLEAN NOT NULL DEFAULT FALSE;

    -- Which questions were actually drawn for a given board generation, per
    -- artist. Reserved once, lazily, the first time any square is started
    -- on a fresh board (see ensureBoardQuestionSets in server.js) — not
    -- re-rolled on every /start call — so a Try Again reset (which bumps
    -- boards.generation) always pulls a fresh set per artist, deliberately
    -- excluding whatever was used last generation, rather than every reset
    -- handing the player back the exact same questions they already saw.
    CREATE TABLE IF NOT EXISTS board_question_sets (
      board_id INTEGER NOT NULL REFERENCES boards(id),
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      generation INTEGER NOT NULL,
      question_ids INTEGER[] NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (board_id, artist_id, generation)
    );

    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'live';
    -- Reference average general-admission ticket price for this show, in
    -- cents. When set, token pricing is derived from it (see
    -- deriveTokenPriceCents in server.js) instead of the flat manual
    -- token_price_usd_cents column, so the cost of playing always tracks
    -- what the actual show costs to get into.
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS avg_ga_price_usd_cents INTEGER;
    -- One-time cost (in tokens) to enter this festival's board at all, on
    -- top of whatever each individual square then costs to attempt. 0 (the
    -- default) means no separate entry fee — existing festivals are
    -- unaffected. Charged once per user per festival, the first time they
    -- start a quiz on that board; never re-charged on a board reset.
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS board_entry_fee_tokens INTEGER NOT NULL DEFAULT 0;

    -- Canonical cross-festival artist registry. Multiple festivals' "artists"
    -- rows (one lineup slot each) can point at the same global_artists row
    -- when it's literally the same act, so the API can answer "where else is
    -- this artist playing" instead of every festival's lineup being an
    -- island. Seeded by seed-utils.js's upsertGlobalArtist for every artist
    -- added through it; older festivals seeded before this existed just have
    -- artists.global_artist_id = NULL, which is fine (no also-playing data
    -- for those rows, nothing else breaks).
    CREATE TABLE IF NOT EXISTS global_artists (
      id SERIAL PRIMARY KEY,
      canonical_name TEXT UNIQUE NOT NULL,
      genre TEXT
    );
    ALTER TABLE artists ADD COLUMN IF NOT EXISTS global_artist_id INTEGER REFERENCES global_artists(id);

    CREATE TABLE IF NOT EXISTS board_cells (
      board_id INTEGER NOT NULL REFERENCES boards(id),
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      status TEXT NOT NULL DEFAULT 'available', -- available | cleared | dead
      PRIMARY KEY (board_id, artist_id)
    );

    -- Holds the answer key server-side between start and submit, same
    -- pattern as PropQuix Solo's solo_pending_attempts.
    CREATE TABLE IF NOT EXISTS pending_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      festival_id INTEGER NOT NULL REFERENCES festivals(id),
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      questions_json TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Permanent, immutable per-game record — one row per artist attempt,
    -- kept forever (unlike pending_attempts, which is just ephemeral
    -- in-progress state and gets deleted once an attempt resolves). Shares
    -- its id with the pending_attempts row that spawned it, so the same
    -- number shown to the player as "Game #123" during play is exactly
    -- what admin looks up later — for stats, for a customer dispute
    -- ("I answered that right"), for anything that needs to reconstruct
    -- exactly what happened in one specific game.
    CREATE TABLE IF NOT EXISTS game_attempts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      festival_id INTEGER NOT NULL REFERENCES festivals(id),
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      tokens_spent INTEGER NOT NULL, -- total charged for this attempt, including any entry_fee_portion below
      entry_fee_portion INTEGER NOT NULL DEFAULT 0, -- how much of tokens_spent was the one-time board entry fee (0 unless this was the attempt that triggered it)
      question_count INTEGER NOT NULL,
      pass_threshold INTEGER NOT NULL,
      seconds_per_question INTEGER,
      board_generation INTEGER NOT NULL DEFAULT 0, -- how many times this board had been reset
      squares_played_before INTEGER NOT NULL DEFAULT 0, -- squares already resolved on THIS board — what actually set seconds_per_question
      correct_count INTEGER,
      status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | passed | dead | abandoned
      questions_json TEXT, -- full Q&A + per-question correctness, filled in at resolution
      started_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
    ALTER TABLE game_attempts ADD COLUMN IF NOT EXISTS seconds_per_question INTEGER;
    ALTER TABLE game_attempts ADD COLUMN IF NOT EXISTS board_generation INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE game_attempts ADD COLUMN IF NOT EXISTS squares_played_before INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE game_attempts ADD COLUMN IF NOT EXISTS entry_fee_portion INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_game_attempts_user ON game_attempts (user_id);
    CREATE INDEX IF NOT EXISTS idx_game_attempts_festival ON game_attempts (festival_id);

    CREATE TABLE IF NOT EXISTS tickets_won (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      festival_id INTEGER NOT NULL REFERENCES festivals(id),
      claim_code TEXT NOT NULL,
      fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
      won_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Admin-editable runtime settings (site lock / preview key overrides,
    -- homepage spotlight override, etc.) so the admin panel can flip these
    -- without a redeploy. Falls back to the env vars of the same name (or
    -- to auto-computed behavior) when a row isn't set.
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Sitewide token bundles shown on the Trivia Tokens page and in the
    -- buy-tokens modal. Used to be a hardcoded array in the frontend, which
    -- meant changing a price meant shipping new code — now it's plain data
    -- the admin panel edits directly. color_key picks one of the site's
    -- existing accent colors (blue/purple/gold/pink) rather than storing
    -- raw CSS, so a pack always matches the site's palette.
    CREATE TABLE IF NOT EXISTS token_packs (
      id SERIAL PRIMARY KEY,
      tokens INTEGER NOT NULL,
      price_usd_cents INTEGER NOT NULL,
      label TEXT NOT NULL,
      color_key TEXT NOT NULL DEFAULT 'blue',
      badge TEXT,
      bonus_pct INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    -- Log of every token purchase (real once a payment processor is wired
    -- up; for now these come from the demo-buy flow, but the shape is the
    -- real one so revenue analytics don't need to change later). pack_id is
    -- nullable so a legacy/arbitrary quantity purchase doesn't break.
    CREATE TABLE IF NOT EXISTS token_purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      pack_id INTEGER REFERENCES token_packs(id),
      tokens INTEGER NOT NULL,
      price_usd_cents INTEGER,
      -- 'completed' for the existing demo-buy flow (kept as the default so
      -- old rows and demo purchases don't need backfilling) and for any
      -- real purchase once its webhook confirms. A real purchase is
      -- inserted as 'pending' the moment a checkout link is created and
      -- ONLY flips to 'completed' — crediting the wallet — when
      -- SeamlessChex's webhook confirms the charge; it never gets tokens
      -- from just visiting a checkout page. See server/payments.js.
      status TEXT NOT NULL DEFAULT 'completed',
      provider TEXT,
      -- SeamlessChex's own id for this checkout/charge — UNIQUE so a
      -- retried or duplicate-delivered webhook can never credit twice.
      provider_reference TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE token_purchases ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
    ALTER TABLE token_purchases ADD COLUMN IF NOT EXISTS provider TEXT;
    ALTER TABLE token_purchases ADD COLUMN IF NOT EXISTS provider_reference TEXT UNIQUE;

    -- Minimal in-house pageview log so we can see traffic sources (Google
    -- vs. direct vs. social vs. other referrers) before a real analytics
    -- tool (GTM/GA) is wired up. One row per page render on the public
    -- site; source_type is pre-classified server-side at write time from
    -- the referrer's hostname so the admin dashboard doesn't need to
    -- reimplement that logic in every query. Admin panel and bot traffic
    -- are filtered out before this table is ever written to (see
    -- isKnownCrawler / the /admin path check in server.js), not here.
    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      referrer_host TEXT,
      source_type TEXT NOT NULL DEFAULT 'direct', -- google | other_search | social | referral | direct
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at);
  `);
}

module.exports = { pool, initSchema };
