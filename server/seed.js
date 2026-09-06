// One-time / idempotent demo seed: a single fictional festival with a 9-slot
// (3x3) lineup, each artist carrying a tiny hand-written question bank. Real
// content would come from a research pass per artist (bio, discography,
// setlists) the same way PropQuix's question_bank was pre-generated — this
// is just enough to prove the mechanic end to end.

const { pool } = require("./db");
const { gridSizeForArtistCount } = require("./board");

// Fictional "coming soon" festivals — lineup TBA, not playable yet. Just
// enough to show on the lobby with an "Upcoming" tag until the real lineup
// (and its trivia question bank) is ready to seed.
const UPCOMING_FESTIVALS = [
  { slug: "amber-fields-2026", name: "Amber Fields Festival", location: "Prescott Valley, AZ", event_date: "2026-11-14", banner_color: "#ff9d3d" },
  { slug: "north-static-2027", name: "North Static Festival", location: "Duluth, MN", event_date: "2027-01-23", banner_color: "#4da6ff" },
  { slug: "glasshouse-2027", name: "Glasshouse Festival", location: "Asheville, NC", event_date: "2027-03-06", banner_color: "#c084fc" },
];

async function seed() {
  // Idempotent upgrade for boards already seeded before the 2-ticket tier
  // model existed — bump the ticket supply so a 2nd line is actually
  // claimable, without touching anything else about the festival row.
  await pool.query(
    `UPDATE festivals SET tickets_available = 2 WHERE slug = 'sunset-waves-2026' AND tickets_available < 2`
  );

  for (const f of UPCOMING_FESTIVALS) {
    const { rows } = await pool.query(`SELECT id FROM festivals WHERE slug = $1`, [f.slug]);
    if (rows.length) continue;
    await pool.query(
      `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, token_price_usd_cents, ticket_prize_label, status, tickets_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'upcoming', $9)`,
      [f.slug, f.name, f.location, f.event_date, f.banner_color, 3, 1000, "Tickets TBA", 0]
    );
  }

  const existing = await pool.query(`SELECT id FROM festivals WHERE slug = $1`, ["sunset-waves-2026"]);
  if (existing.rows.length) {
    console.log("Demo festival already seeded — skipping.");
    return;
  }

  const festivalResult = await pool.query(
    `INSERT INTO festivals (slug, name, location, event_date, banner_color, entry_cost_tokens, token_price_usd_cents, ticket_prize_label, tickets_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name`,
    ["sunset-waves-2026", "Sunset Waves Festival", "Marina Bluffs, CA", "2026-10-17", "#ff3d81", 1, 1000, "1 General Admission Weekend Pass", 2]
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
        ["Nova Ridge's debut album was titled...", ["Coastline Static", "Midnight Harbor", "Faded Signals", "Low Tide"], "a"],
        ["Nova Ridge is best described as...", ["A four-piece band", "A solo act", "A trio", "A duo"], "a"],
        ["Nova Ridge's sound is most often compared to...", ["90s indie rock", "80s hair metal", "2000s emo", "Classic disco"], "a"],
        ["Nova Ridge's live sets typically open with...", ["Their most upbeat song", "A cover song", "An acoustic ballad", "A DJ set"], "a"],
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
        ["Kilowatt performs primarily as...", ["A solo producer/DJ", "A three-piece live band", "A vocal duo", "An orchestra"], "a"],
        ["Kilowatt's sets are known for featuring...", ["Elaborate light rigs", "Acoustic breakdowns", "Guest rappers only", "No visuals at all"], "a"],
        ["Kilowatt's last EP was named...", ["Afterglow Cycles", "Silent Static", "Paper Weather", "Slow Bloom"], "a"],
        ["Kilowatt got their start playing...", ["Warehouse parties", "Stadium tours", "Jazz clubs", "Wedding gigs"], "a"],
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
        ["Marlow most often performs with...", ["A full live band", "Backing tracks only", "A string quartet", "A DJ"], "a"],
        ["Marlow's most-streamed single features a guest verse from...", ["Another R&B artist", "A country singer", "A metal vocalist", "No guest at all"], "a"],
        ["Marlow's stage presence is most often described as...", ["Smooth and understated", "High-energy and chaotic", "Theatrical and costumed", "Silent and minimal"], "a"],
        ["Marlow's most recent single was released as a...", ["Surprise drop", "Lead single with a music video rollout", "Vinyl-only release", "Festival exclusive"], "b"],
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
        ["The Drift Collective's name references...", ["A recurring lyrical theme", "Their hometown", "A former band member", "A record label"], "a"],
        ["Their live shows typically feature...", ["Analog synths and visual projections", "A brass section", "Choreographed dancing", "No lighting at all"], "a"],
        ["The Drift Collective's most acclaimed album was produced by...", ["A member of the band itself", "A major-label producer", "An AI tool", "A rival band"], "a"],
        ["The Drift Collective is closing out a run of shows on this tour that started...", ["Overseas", "At a small local venue", "On a livestream", "At a different festival"], "a"],
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
        ["Peach Static first gained an audience through...", ["Posting songs online", "A record label bidding war", "A reality TV show", "A movie soundtrack"], "a"],
        ["Peach Static's most popular song is about...", ["A long-distance relationship", "A road trip", "A breakup at a festival", "A childhood memory"], "a"],
        ["Peach Static's live setup typically includes...", ["A laptop and a guitar", "A full horn section", "An orchestra", "No instruments, vocals only"], "a"],
        ["Peach Static's most recent release was a...", ["Short EP", "Double album", "Live album", "Holiday single"], "a"],
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
        ["Rowan James's songs are mostly about...", ["Personal relationships", "Political movements", "Fictional characters", "Video games"], "a"],
        ["Rowan James typically performs...", ["Solo, just voice and guitar", "With a full backing band", "With a DJ", "With a string quartet"], "a"],
        ["Rowan James's most popular song was featured in...", ["A film trailer", "A video game", "A commercial for a car", "None of the above"], "a"],
        ["Rowan James's next album is described as...", ["More stripped-down than the last", "A full electronic departure", "A covers album", "A live-only release"], "a"],
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
        ["Static Parade's most popular track was featured in...", ["A retro-themed video game", "A children's show", "A courtroom drama", "A cooking show"], "a"],
        ["Static Parade usually performs...", ["As a duo", "As a solo act", "As a five-piece band", "With a full orchestra"], "a"],
        ["Static Parade's most recent album cover features...", ["A neon cityscape", "A forest scene", "A blank canvas", "A family photo"], "a"],
        ["Static Parade names which act as a major influence?", ["Classic 80s synth acts", "90s grunge bands", "Modern country artists", "Classical composers"], "a"],
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
        ["Coral & Bone typically tours with...", ["Just acoustic instruments", "A full electronic rig", "A brass band", "A DJ booth"], "a"],
        ["Coral & Bone's songwriting is most often inspired by...", ["Nature and travel", "City nightlife", "Science fiction", "Sports"], "a"],
        ["Coral & Bone's name comes from...", ["A line in one of their early songs", "Their hometown", "A record label", "A festival they played"], "a"],
        ["Coral & Bone's most recent single was recorded...", ["Outdoors, live to tape", "In a major studio with a full production team", "Entirely on a phone", "As a group improvisation on stage"], "a"],
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
        ["Vessel Deluxe's live shows are known for...", ["Long improvisational grooves", "Strict, short setlists", "No live instruments", "Silent intermissions"], "a"],
        ["Vessel Deluxe's horn section typically includes...", ["Trumpet and saxophone", "Just a tuba", "A string quartet", "No horns at all"], "a"],
        ["Vessel Deluxe's most popular track samples...", ["A classic funk breakbeat", "A classical symphony", "A field recording of rain", "Nothing — it's fully original"], "a"],
        ["Vessel Deluxe has headlined a festival closing slot...", ["Multiple times before", "Never before this one", "Only once, years ago", "Only on livestreams"], "a"],
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
