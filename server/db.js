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
  `);
}

module.exports = { pool, initSchema };
