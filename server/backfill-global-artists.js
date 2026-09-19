// One-time backfill: links artists rows seeded before global_artists existed
// (e.g. seed-acl-2026.js, which predates seed-utils.js) into the canonical
// registry, by exact name match. Safe to re-run — only touches rows where
// global_artist_id IS NULL.
//
// Usage: node server/backfill-global-artists.js

const { pool } = require("./db");
const { upsertGlobalArtist } = require("./seed-utils");

async function backfill() {
  const { rows } = await pool.query(`SELECT id, name, genre FROM artists WHERE global_artist_id IS NULL`);
  let linked = 0;
  for (const artist of rows) {
    const globalId = await upsertGlobalArtist(pool, artist.name, artist.genre);
    await pool.query(`UPDATE artists SET global_artist_id = $1 WHERE id = $2`, [globalId, artist.id]);
    linked++;
  }
  console.log(`Backfilled global_artist_id for ${linked} artist row(s).`);
}

if (require.main === module) {
  backfill()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { backfill };
