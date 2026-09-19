// Shared helpers for the per-festival lineup seed scripts (seed-acl-2026.js
// was the original one-off; every festival added after it uses these so the
// "corner headliners, harder toward the middle" placement and the
// cross-festival artist database are consistent everywhere instead of
// reinvented per script).
//
// ── Corner-anchored difficulty placement ────────────────────────────────────
// For a 4x4 board (16 artists — every festival seeded with this helper uses
// exactly 16), the four biggest headliners go in the four corners, the next
// tier fills the outer edge ring, and the hardest/most obscure acts land in
// the dead-center 2x2 — so difficulty visibly radiates outward from the
// corners toward the middle, not just top-to-bottom.
//
//   0  1  2  3       corners: 0, 3, 12, 15  (headliners, easy)
//   4  5  6  7       edge ring: 1,2,4,7,8,11,13,14  (medium)
//   8  9 10 11       center: 5,6,9,10  (hardest / most obscure)
//  12 13 14 15
const CORNER_RING_ORDER_4X4 = [0, 3, 12, 15, 1, 2, 4, 7, 8, 11, 13, 14, 5, 6, 9, 10];

// ── Cross-festival artist database ──────────────────────────────────────────
// global_artists is a canonical registry (see db.js) so the same artist
// playing two different festivals in FestiQ shares one row, letting the API
// answer "where else is this artist playing" instead of every festival's
// lineup being an island.
async function upsertGlobalArtist(pool, name, genre) {
  const { rows } = await pool.query(
    `INSERT INTO global_artists (canonical_name, genre)
     VALUES ($1, $2)
     ON CONFLICT (canonical_name) DO UPDATE SET genre = COALESCE(global_artists.genre, EXCLUDED.genre)
     RETURNING id`,
    [name, genre || null]
  );
  return rows[0].id;
}

// Creates the festival row if it doesn't exist yet, then seeds its 16-artist
// lineup (skipping if it already has artists, so this is safe to re-run).
// `lineup` must be exactly 16 entries, already ordered easy -> hard (index 0
// is the biggest headliner, index 15 the most obscure act) — this function
// maps that order onto CORNER_RING_ORDER_4X4 for you.
async function seedFestivalLineup(pool, { slug, festival, lineup }) {
  if (lineup.length !== 16) {
    throw new Error(`seedFestivalLineup(${slug}): expected exactly 16 artists for a 4x4 corner-ring board, got ${lineup.length}`);
  }

  let { rows: fRows } = await pool.query(`SELECT id, name FROM festivals WHERE slug = $1`, [slug]);
  if (!fRows.length) {
    const inserted = await pool.query(
      `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, ticket_prize_label, status, tickets_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8) RETURNING id, name`,
      [
        slug,
        festival.name,
        festival.location || null,
        festival.event_date || null,
        festival.banner_color || "#ff3d81",
        festival.entry_cost_tokens ?? 3,
        festival.ticket_prize_label || "1 General Admission Ticket",
        festival.tickets_available ?? 1,
      ]
    );
    fRows = inserted.rows;
    console.log(`Created festival row "${festival.name}" (${slug}).`);
  }
  const festivalId = fRows[0].id;

  const { rows: existingArtists } = await pool.query(`SELECT COUNT(*)::int AS count FROM artists WHERE festival_id = $1`, [festivalId]);
  if (existingArtists[0].count > 0) {
    console.log(`"${fRows[0].name}" already has ${existingArtists[0].count} artist(s) — skipping to avoid duplicating the lineup.`);
    return;
  }

  let totalQuestions = 0;
  for (let i = 0; i < lineup.length; i++) {
    const artist = lineup[i];
    const position = CORNER_RING_ORDER_4X4[i];
    const globalArtistId = await upsertGlobalArtist(pool, artist.name, artist.genre);
    const artistResult = await pool.query(
      `INSERT INTO artists (festival_id, name, genre, set_time, position, difficulty, global_artist_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [festivalId, artist.name, artist.genre, null, position, artist.difficulty, globalArtistId]
    );
    const artistId = artistResult.rows[0].id;
    for (const [q, choices, correct] of artist.questions) {
      await pool.query(
        `INSERT INTO questions (artist_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [artistId, q, choices[0], choices[1], choices[2], choices[3], correct]
      );
      totalQuestions++;
    }
  }

  console.log(`Seeded ${lineup.length} artists (${totalQuestions} questions) onto "${fRows[0].name}" — 4x4 board, headliners in the corners.`);
}

module.exports = { CORNER_RING_ORDER_4X4, upsertGlobalArtist, seedFestivalLineup };
