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
      difficulty TEXT NOT NULL DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      artist_id INTEGER NOT NULL REFERENCES artists(id),
      question_text TEXT NOT NULL,
      choice_a TEXT NOT NULL,
      choice_b TEXT NOT NULL,
      choice_c TEXT NOT NULL,
      choice_d TEXT NOT NULL,
      correct_choice TEXT NOT NULL
    );

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
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'live';
    -- Reference average general-admission ticket price for this show, in
    -- cents. When set, token pricing is derived from it (see
    -- deriveTokenPriceCents in server.js) instead of the flat manual
    -- token_price_usd_cents column, so the cost of playing always tracks
    -- what the actual show costs to get into.
    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS avg_ga_price_usd_cents INTEGER;

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
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

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
