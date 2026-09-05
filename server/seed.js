// One-time / idempotent demo seed: a single fictional festival with a 9-slot
// (3x3) lineup, each artist carrying a tiny hand-written question bank. Real
// content would come from a research pass per artist (bio, discography,
// setlists) the same way PropQuix's question_bank was pre-generated — this
// is just enough to prove the mechanic end to end.

const { pool } = require("./db");
const { gridSizeForArtistCount } = require("./board");

async function seed() {
  const existing = await pool.query(`SELECT id FROM festivals WHERE slug = $1`, ["sunset-waves-2026"]);
  if (existing.rows.length) {
    console.log("Demo festival already seeded — skipping.");
    return;
  }

  const festivalResult = await pool.query(
    `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, token_price_usd_cents, ticket_prize_label, tickets_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name`,
    ["sunset-waves-2026", "Sunset Waves Festival", "Marina Bluffs, CA", "2026-10-17", "#ff3d81", 1, 1000, "1 General Admission Weekend Pass", 1]
  );
  const festivalId = festivalResult.rows[0].id;
  const festivalName = festivalResult.rows[0].name;

  const lineup = [
    {
      name: "Nova Ridge",
      genre: "Indie Rock",
      set_time: "Fri 6:00 PM — Main Stage",
      difficulty: "easy",
      questions: [
        ["Nova Ridge's breakout single is titled...", ["Glass Coast", "Paper Tigers", "Static Bloom", "Amber Hour"], "a"],
        ["What instrument does Nova Ridge's frontperson play live?", ["Guitar", "Drums", "Bass", "Keys"], "a"],
        ["Nova Ridge formed in which city?", ["Portland", "Austin", "Denver", "Nashville"], "a"],
      ],
    },
    {
      name: "Kilowatt",
      genre: "Electronic / House",
      set_time: "Fri 8:30 PM — Dune Stage",
      difficulty: "medium",
      questions: [
        ["Kilowatt's most-streamed track is...", ["Voltage", "Circuit City", "Aftercurrent", "Neon Tide"], "d"],
        ["Kilowatt is best known for blending house with which genre?", ["Trap", "Ambient", "Disco", "Drum & Bass"], "c"],
        ["Kilowatt headlined which festival stage last year?", ["Dune Stage", "Main Stage", "Grove Stage", "Boardwalk Tent"], "a"],
      ],
    },
    {
      name: "Marlow",
      genre: "R&B / Soul",
      set_time: "Fri 9:45 PM — Grove Stage",
      difficulty: "medium",
      questions: [
        ["Marlow's debut album is called...", ["Slow Static", "Velvet Hours", "Low Light", "Honeyglass"], "b"],
        ["Marlow is signed to which type of label?", ["Major", "Independent", "Self-released", "Festival-exclusive"], "b"],
        ["Marlow's sound draws most heavily from which decade?", ["70s Soul", "90s R&B", "80s Synth", "2010s Trap"], "b"],
      ],
    },
    {
      name: "The Drift Collective",
      genre: "Psych Rock",
      set_time: "Sat 5:00 PM — Main Stage",
      difficulty: "hard",
      questions: [
        ["The Drift Collective's live shows are known for...", ["Extended jam sections", "Strict 20-min sets", "Acoustic-only sets", "No instruments"], "a"],
        ["How many members are in The Drift Collective?", ["3", "5", "7", "4"], "c"],
        ["Their most recent record was recorded in...", ["A desert studio", "A moving tour bus", "A converted barn", "A city loft"], "c"],
      ],
    },
    {
      name: "Peach Static",
      genre: "Bedroom Pop",
      set_time: "Sat 6:30 PM — Grove Stage",
      difficulty: "easy",
      questions: [
        ["Peach Static is primarily a...", ["Solo act", "Duo", "Full band", "DJ collective"], "a"],
        ["Peach Static's songs are mostly recorded...", ["In a home studio", "In an orchestra hall", "Live at festivals only", "By other artists"], "a"],
        ["Peach Static's genre blends bedroom pop with...", ["Dream pop", "Metal", "Country", "Reggaeton"], "a"],
      ],
    },
    {
      name: "Rowan James",
      genre: "Singer-Songwriter",
      set_time: "Sat 7:45 PM — Boardwalk Tent",
      difficulty: "easy",
      questions: [
        ["Rowan James performs mainly with...", ["An acoustic guitar", "A full orchestra", "A drum machine", "A cappella"], "a"],
        ["Rowan James's songwriting is most compared to which era?", ["70s folk", "90s grunge", "2000s pop-punk", "Disco"], "a"],
        ["Rowan James released their first EP in...", ["A small local venue", "A stadium tour", "A festival headline slot", "A TV special"], "a"],
      ],
    },
    {
      name: "Static Parade",
      genre: "Synthwave",
      set_time: "Sat 9:00 PM — Dune Stage",
      difficulty: "medium",
      questions: [
        ["Static Parade's visual aesthetic leans heavily on...", ["Retro-futurism", "Minimalism", "Folk imagery", "Black and white film"], "a"],
        ["Static Parade's sound is most influenced by which decade?", ["1980s", "1950s", "2000s", "1970s"], "a"],
        ["Static Parade typically performs with...", ["Synth racks and visuals", "A brass section", "Acoustic instruments only", "No stage production"], "a"],
      ],
    },
    {
      name: "Coral & Bone",
      genre: "Folk",
      set_time: "Sun 4:30 PM — Grove Stage",
      difficulty: "hard",
      questions: [
        ["Coral & Bone is composed of how many core members?", ["2", "4", "6", "1"], "a"],
        ["Coral & Bone's harmonies are most often compared to...", ["Classic folk duos", "Opera singers", "Rap groups", "EDM producers"], "a"],
        ["Coral & Bone's last release was a...", ["Live album", "Remix EP", "Instrumental record", "Holiday single"], "a"],
      ],
    },
    {
      name: "Vessel Deluxe",
      genre: "Funk / Groove",
      set_time: "Sun 8:00 PM — Main Stage (Closing)",
      difficulty: "hard",
      questions: [
        ["Vessel Deluxe closes most of their sets with...", ["An extended horn jam", "A cover song", "An acoustic ballad", "A DJ set"], "a"],
        ["Vessel Deluxe's rhythm section is anchored by...", ["Bass and drums", "Strings", "Synths only", "A choir"], "a"],
        ["Vessel Deluxe is closing which stage this year?", ["Main Stage", "Dune Stage", "Grove Stage", "Boardwalk Tent"], "a"],
      ],
    },
  ];

  const gridSize = gridSizeForArtistCount(lineup.length);

  for (let position = 0; position < lineup.length; position++) {
    const artist = lineup[position];
    const artistResult = await pool.query(
      `INSERT INTO artists (festival_id, name, genre, set_time, position, difficulty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [festivalId, artist.name, artist.genre, artist.set_time, position, artist.difficulty]
    );
    const artistId = artistResult.rows[0].id;
    for (const [q, choices, correct] of artist.questions) {
      await pool.query(
        `INSERT INTO questions (artist_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [artistId, q, choices[0], choices[1], choices[2], choices[3], correct]
      );
    }
  }

  console.log(`Seeded "${festivalName}" — ${lineup.length} artists, ${gridSize}x${gridSize} board.`);
}

module.exports = { seed };
