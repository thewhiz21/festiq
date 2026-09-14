// One-time content seed for the real Austin City Limits 2026 lineup.
//
// The "austin-city-limits" festival row already exists (added by seed.js on
// 2026-09-06, status "upcoming", no artists yet — see server/seed.js). This
// script does NOT touch that row's festival-level fields; it only inserts
// the 16-artist lineup + trivia questions onto it. Board size is derived
// automatically from artist count (see board.js: 16 artists -> 4x4), so
// nothing else needs to change for the board to go from "3x3, lineup TBA"
// to a real 4x4 board.
//
// Ordering is intentional, not alphabetical: position 0 (top-left) is the
// biggest headliner with the easiest trivia, and it gets harder square by
// square down to position 15 (bottom-right), which is FCUKERS — a genuinely
// obscure/underground act most casual fans won't recognize. difficulty
// drives the actual pass bar / time-per-question via DIFFICULTY_LEVEL in
// server.js (easy/medium/hard), so this isn't just cosmetic ordering.
//
// Facts were researched per-artist (web search, cross-checked against
// Wikipedia + music press) rather than invented — see the PR/commit message
// for sources. For the two most obscure acts (Rusowsky, FCUKERS), questions
// stick to only the facts that were corroborated across multiple sources.
//
// Usage: node server/seed-acl-2026.js
// Requires DATABASE_URL in the environment (same as `npm start`) pointing
// at the real database. Safe to re-run: it skips the whole lineup if
// austin-city-limits already has any artists, so it will never double-insert.

const { pool } = require("./db");

const FESTIVAL_SLUG = "austin-city-limits";

const LINEUP = [
  // ── Position 0-4: headliners, easy — instantly recognizable mainstream acts ──
  {
    name: "Charli XCX",
    genre: "Pop",
    difficulty: "easy",
    questions: [
      ["What is Charli XCX's real name?", ["Charlotte Aitchison", "Charlotte Emma", "Charli Adkins", "Charlotte Church"], "a"],
      ["Which 2024 album cemented Charli XCX's cultural moment as the face of \"brat summer\"?", ["Brat", "Pop 2", "True Romance", "Vroom Vroom"], "a"],
      ["Charli XCX won three Grammy Awards in 2025 largely on the strength of which album?", ["Brat", "Sucker", "Charli", "How I'm Feeling Now"], "a"],
      ["Charli XCX is originally from which country?", ["England", "Australia", "Canada", "Ireland"], "a"],
      ["Which of these is a genuine Charli XCX single?", ["Boom Clap", "Sunflower", "Levitating", "Blinding Lights"], "a"],
      ["Charli XCX's music is most associated with which genre?", ["Pop / hyperpop", "Bluegrass", "Reggae", "Heavy metal"], "a"],
      ["Which single from Brat won Best Dance Pop Recording at the 2025 Grammys?", ["Von Dutch", "Closer", "Levitating", "Espresso"], "a"],
    ],
  },
  {
    name: "Twenty One Pilots",
    genre: "Alt Pop / Rock",
    difficulty: "easy",
    questions: [
      ["Twenty One Pilots is a duo from which U.S. city?", ["Columbus, Ohio", "Cleveland, Ohio", "Chicago, Illinois", "Cincinnati, Ohio"], "a"],
      ["Who are the two members of Twenty One Pilots?", ["Tyler Joseph and Josh Dun", "Tyler Joseph and Josh Ramsay", "Josh Dun and Dan Reynolds", "Tyler Joseph and Patrick Stump"], "a"],
      ["Which massive Twenty One Pilots single includes the line \"Wish we could turn back time\"?", ["Stressed Out", "Ride", "Chlorine", "My Blood"], "a"],
      ["Twenty One Pilots' 2024 album that returns to the world of their earlier record \"Trench\" is called:", ["Clancy", "Scaled and Icy", "Blurryface", "Vessel"], "a"],
      ["What instrument does Josh Dun play in Twenty One Pilots?", ["Drums", "Bass", "Keyboard", "Trumpet"], "a"],
      ["Twenty One Pilots' sound blends rock with which other genres?", ["Rap and electropop", "Bluegrass and jazz", "Opera and classical", "Reggaeton and salsa"], "a"],
      ["Which Twenty One Pilots song won a Grammy for Best Pop Duo/Group Performance?", ["Stressed Out", "Heathens", "Ride", "House of Gold"], "a"],
    ],
  },
  {
    name: "Lorde",
    genre: "Pop",
    difficulty: "easy",
    questions: [
      ["What is Lorde's real name?", ["Ella Yelich-O'Connor", "Ella Marija Lani", "Ella Fitzgerald", "Eleanor O'Connor"], "a"],
      ["Lorde is from which country?", ["New Zealand", "Australia", "England", "Canada"], "a"],
      ["Lorde's breakout 2013 hit that topped charts worldwide was:", ["Royals", "Team", "Green Light", "Solar Power"], "a"],
      ["Lorde's 2025 album is titled:", ["Virgin", "Melodrama", "Pure Heroine", "Solar Power"], "a"],
      ["Lorde's debut album, featuring \"Royals,\" was called:", ["Pure Heroine", "Melodrama", "Virgin", "Solar Power"], "a"],
      ["Lorde was a teenager when she first became famous — how old was she when \"Royals\" broke through?", ["16", "21", "25", "19"], "a"],
      ["Which 2017 Lorde album features the singles \"Green Light\" and \"Perfect Places\"?", ["Melodrama", "Pure Heroine", "Solar Power", "Virgin"], "a"],
    ],
  },
  {
    name: "The Chainsmokers",
    genre: "EDM / Pop",
    difficulty: "easy",
    questions: [
      ["The Chainsmokers are a duo made up of Drew Taggart and:", ["Alex Pall", "Zedd", "Kygo", "Marshmello"], "a"],
      ["Which 2016 Chainsmokers single featuring Halsey became a global No. 1 hit?", ["Closer", "Paris", "Something Just Like This", "Don't Let Me Down"], "a"],
      ["The Chainsmokers first went viral with which 2014 track?", ["#Selfie", "Roses", "Inside Out", "Sick Boy"], "a"],
      ["The Chainsmokers are based out of which U.S. city?", ["New York City", "Los Angeles", "Miami", "Las Vegas"], "a"],
      ["\"Something Just Like This,\" a Chainsmokers hit, was made in collaboration with which band?", ["Coldplay", "Imagine Dragons", "OneRepublic", "Maroon 5"], "a"],
      ["The Chainsmokers primarily perform as:", ["A DJ/production duo", "A four-piece rock band", "A solo singer-songwriter", "An orchestra"], "a"],
      ["Which Chainsmokers song features vocals from Daya?", ["Don't Let Me Down", "Closer", "Paris", "Sick Boy"], "a"],
    ],
  },
  {
    name: "Kings of Leon",
    genre: "Rock",
    difficulty: "easy",
    questions: [
      ["Kings of Leon formed in which U.S. city?", ["Nashville, Tennessee", "Memphis, Tennessee", "Atlanta, Georgia", "Austin, Texas"], "a"],
      ["Three of Kings of Leon's members share which last name?", ["Followill", "Kings", "Leon", "Caleb"], "a"],
      ["Which 2008 Kings of Leon single won Record of the Year at the Grammys?", ["Use Somebody", "Sex on Fire", "Radioactive", "Closer"], "a"],
      ["Kings of Leon is made up of three brothers plus which relative?", ["A cousin", "Their father", "A brother-in-law", "An uncle"], "a"],
      ["Kings of Leon's breakthrough album featuring \"Sex on Fire\" and \"Use Somebody\" is titled:", ["Only by the Night", "Aha Shake Heartbreak", "Come Around Sundown", "Youth & Young Manhood"], "a"],
      ["Kings of Leon's sound is generally described as:", ["Southern rock / alternative rock", "Bluegrass", "Synthpop", "Hip-hop"], "a"],
      ["Kings of Leon's lead singer, Caleb Followill, is also known for playing:", ["Guitar", "Drums", "Saxophone", "Violin"], "a"],
    ],
  },
  // ── Position 5-10: medium — well-known within their genres, not universally mainstream ──
  {
    name: "Skrillex",
    genre: "EDM",
    difficulty: "medium",
    questions: [
      ["What is Skrillex's real name?", ["Sonny Moore", "Sonny Diaz", "Steve Aoki", "Sonny Skrillex"], "a"],
      ["Before going solo, Skrillex was the frontman of which post-hardcore band?", ["From First to Last", "Pierce the Veil", "Bring Me the Horizon", "A Day to Remember"], "a"],
      ["Skrillex's breakout 2010 EP that helped define the dubstep sound is:", ["Scary Monsters and Nice Sprites", "Bangarang", "Recess", "Quest for Fire"], "a"],
      ["Skrillex released two companion albums in 2023 titled \"Quest for Fire\" and:", ["Don't Get Too Close", "Recess", "Bangarang", "Not Alone"], "a"],
      ["Skrillex is widely credited as a major pioneer of which electronic subgenre in the U.S.?", ["Dubstep", "Trance", "Ambient", "Drum & bass"], "a"],
      ["Skrillex has won multiple Grammy Awards primarily in which category?", ["Dance/Electronic", "Country", "Rock", "Gospel"], "a"],
      ["Skrillex's stage name is a nod to which niche computing/internet term he liked as a teenager?", ["\"Skrill\" slang for money, stylized with an X", "His childhood nickname", "A video game character", "His hometown"], "a"],
    ],
  },
  {
    name: "RÜFÜS DU SOL",
    genre: "Dance / House",
    difficulty: "medium",
    questions: [
      ["RÜFÜS DU SOL formed in which city?", ["Sydney, Australia", "Melbourne, Australia", "Los Angeles, USA", "London, England"], "a"],
      ["How many members are in RÜFÜS DU SOL?", ["Three", "Two", "Four", "Five"], "a"],
      ["RÜFÜS DU SOL won their first Grammy (Best Dance/Electronic Recording) for which song?", ["Alive", "Innerbloom", "You Were Right", "Underwater"], "a"],
      ["RÜFÜS DU SOL's music is best described as:", ["Alternative dance / melodic house", "Bluegrass", "Trap", "Punk rock"], "a"],
      ["Which RÜFÜS DU SOL song won the 2015 ARIA Award for Best Dance Release?", ["You Were Right", "Alive", "Innerbloom", "Underwater"], "a"],
      ["RÜFÜS DU SOL formed in which year?", ["2010", "2005", "2015", "2000"], "a"],
      ["RÜFÜS DU SOL's albums have frequently topped the charts in which home country?", ["Australia", "United Kingdom", "Germany", "Canada"], "a"],
    ],
  },
  {
    name: "The xx",
    genre: "Indie",
    difficulty: "medium",
    questions: [
      ["The xx formed in which city?", ["London, England", "Manchester, England", "Dublin, Ireland", "Bristol, England"], "a"],
      ["Which member of the xx is also a successful solo electronic producer under the name Jamie xx?", ["Jamie Smith", "Oliver Sim", "Romy Madley Croft", "Baria Qureshi"], "a"],
      ["The xx's breakout self-titled debut album was released in which year?", ["2009", "2005", "2012", "2007"], "a"],
      ["The xx is known for a minimalist sound built around guitar, bass, and:", ["Sparse vocal duets", "A full horn section", "Orchestral strings", "Heavy metal riffs"], "a"],
      ["Which xx song is one of their most recognizable, featured in many film/TV syncs?", ["Angels", "Levitating", "Sunflower", "Closer"], "a"],
      ["The xx's two vocalists trade lead vocal duties — they are Romy Madley Croft and:", ["Oliver Sim", "Jamie Smith", "Baria Qureshi", "Sim Oliver"], "a"],
      ["Jamie xx's acclaimed solo album, released outside of the band, is titled:", ["In Colour", "In Waves", "In Motion", "In Bloom"], "a"],
    ],
  },
  {
    name: "Turnstile",
    genre: "Hardcore",
    difficulty: "medium",
    questions: [
      ["Turnstile formed in which U.S. city, growing out of its hardcore punk scene?", ["Baltimore, Maryland", "Boston, Massachusetts", "Richmond, Virginia", "Philadelphia, Pennsylvania"], "a"],
      ["Turnstile's style is often described as blending hardcore punk with:", ["Alternative rock and melody", "Country twang", "Smooth jazz", "Classical orchestration"], "a"],
      ["At the 2026 Grammy Awards, Turnstile won Best Rock Album for which record?", ["Never Enough", "Glow On", "Time & Space", "Nonstop Feeling"], "a"],
      ["Turnstile's acclaimed 2021 album that broke them into the mainstream is titled:", ["Glow On", "Never Enough", "Time & Space", "Nonstop Feeling"], "a"],
      ["Turnstile formed in which year?", ["2010", "2005", "2015", "2000"], "a"],
      ["Turnstile's frontman, who handles lead vocals, is:", ["Brendan Yates", "Pat McCrory", "Franz Lyons", "Daniel Fang"], "a"],
      ["Turnstile was notably nominated for Grammys across rock, alternative, AND which other category in the same year?", ["Metal", "Country", "Jazz", "Gospel"], "a"],
    ],
  },
  {
    name: "Labrinth",
    genre: "Pop / R&B",
    difficulty: "medium",
    questions: [
      ["What is Labrinth's real name?", ["Timothy Lee McKenzie", "Timothy Labrinth", "Tim McKenzie Jr.", "Timbaland"], "a"],
      ["Labrinth is best known for composing the score of which hit HBO series?", ["Euphoria", "Succession", "The White Lotus", "Insecure"], "a"],
      ["Labrinth co-founded the supergroup LSD alongside Sia and which producer/DJ?", ["Diplo", "Calvin Harris", "Zedd", "Skrillex"], "a"],
      ["Labrinth won an Emmy for his work on \"All for Us,\" a song from Euphoria performed with:", ["Zendaya", "Ariana Grande", "Billie Eilish", "Doja Cat"], "a"],
      ["Labrinth is originally from which city?", ["London, England", "Manchester, England", "Los Angeles, USA", "Toronto, Canada"], "a"],
      ["Labrinth's breakout hit \"Beneath Your Beautiful\" featured which vocalist?", ["Emeli Sandé", "Adele", "Jessie J", "Sia"], "a"],
      ["Labrinth works across a wide range of genres, including pop, R&B, hip-hop, and:", ["Electronic / grime", "Bluegrass", "Opera", "Salsa"], "a"],
    ],
  },
  {
    name: "Bleachers",
    genre: "Indie Pop",
    difficulty: "medium",
    questions: [
      ["Bleachers is fronted by which musician/producer?", ["Jack Antonoff", "Jack White", "Justin Vernon", "Dave Grohl"], "a"],
      ["Bleachers' breakout single \"I Wanna Get Better\" came from which debut album?", ["Strange Desire", "Gone Now", "Take the Sadness Out of Saturday Night", "Bleachers"], "a"],
      ["Bleachers' song \"Chinatown\" features which iconic rock artist?", ["Bruce Springsteen", "Bono", "Tom Petty", "Billy Joel"], "a"],
      ["Bleachers began in which year, as largely a solo project for its frontman?", ["2013", "2005", "2018", "2010"], "a"],
      ["Jack Antonoff, beyond Bleachers, is also known as a prolific producer/songwriter for artists including Taylor Swift and:", ["Lorde", "Adele", "Beyoncé", "Rihanna"], "a"],
      ["Bleachers' sound draws heavily on the aesthetics of which era?", ["Late 1980s / early 1990s", "1950s doo-wop", "1970s disco", "2000s nu-metal"], "a"],
      ["Bleachers' song \"Margaret\" is a collaboration with which artist?", ["Lana Del Rey", "Taylor Swift", "St. Vincent", "Halsey"], "a"],
    ],
  },
  // ── Position 11-15: hard — real acts, but far less broadly known ──
  {
    name: "Amyl and the Sniffers",
    genre: "Punk",
    difficulty: "hard",
    questions: [
      ["Amyl and the Sniffers formed in which Australian city?", ["Melbourne", "Sydney", "Brisbane", "Perth"], "a"],
      ["Who is the lead vocalist of Amyl and the Sniffers?", ["Amy Taylor", "Amyl Taylor", "Amy Sniffer", "Taylor Amy"], "a"],
      ["Amyl and the Sniffers' raw sound is frequently compared to which pioneering punk act?", ["Iggy and the Stooges", "The Ramones", "Sex Pistols", "The Clash"], "a"],
      ["Amyl and the Sniffers' debut EP, recorded in just 12 hours, was titled:", ["Giddy Up", "Comfort to Me", "Cartoon Darkness", "Big Attraction"], "a"],
      ["Amyl and the Sniffers received a Grammy nomination for Best Rock Performance in which year?", ["2026", "2020", "2018", "2022"], "a"],
      ["Amyl and the Sniffers formed in the same house where members were living, in which year?", ["2016", "2010", "2019", "2005"], "a"],
      ["Amyl and the Sniffers' genre is best described as:", ["Pub rock / garage punk", "Smooth jazz", "Synthpop", "Bluegrass"], "a"],
    ],
  },
  {
    name: "CMAT",
    genre: "Indie Pop / Country",
    difficulty: "hard",
    questions: [
      ["What is CMAT's real name?", ["Ciara Mary-Alice Thompson", "Catherine Mary Thompson", "Ciara McAteer", "Carla Thompson"], "a"],
      ["CMAT hails from which country?", ["Ireland", "Scotland", "Wales", "England"], "a"],
      ["CMAT's genre blends indie pop with which other style, reflected in her album \"Euro-Country\"?", ["Country", "Reggae", "Heavy metal", "Jazz"], "a"],
      ["CMAT has won Ireland's Choice Music Prize for Album of the Year more than once — how many times, as of 2025?", ["Twice", "Once", "Three times", "Never"], "a"],
      ["CMAT's breakthrough single is titled:", ["I Wanna Be a Cowboy, Baby!", "Royals", "Von Dutch", "Malibu"], "a"],
      ["CMAT won an Ivor Novello Award for Best Album in which year?", ["2025", "2020", "2018", "2022"], "a"],
      ["CMAT has been nominated for the Brit Awards' International Artist of the Year category.", ["True", "False", "Only as part of a group", "Only for a music video"], "a"],
    ],
  },
  {
    name: "Geese",
    genre: "Indie Rock",
    difficulty: "hard",
    questions: [
      ["Geese formed in which U.S. city?", ["Brooklyn, New York", "Los Angeles, California", "Chicago, Illinois", "Austin, Texas"], "a"],
      ["Who is the lead vocalist of Geese?", ["Cameron Winter", "Cameron Geese", "Winter Cameron", "Dominic DiGesu"], "a"],
      ["Geese's acclaimed 2023 album, produced by James Ford, is titled:", ["3D Country", "A Beautiful Memory", "Getting Killed", "Projector"], "a"],
      ["Geese's members originally met and formed the band while still:", ["In high school", "In college", "Touring with another band", "Working at the same label"], "a"],
      ["Geese's 2025 album \"Getting Killed\" was named a best album of the year by Stereogum and which other publication?", ["The New Yorker", "Rolling Stone", "Pitchfork", "NME"], "a"],
      ["Geese's frontman released a solo album, separate from the band, called:", ["Heavy Metal", "3D Country", "Projector", "A Beautiful Memory"], "a"],
      ["Geese is signed to which independent record label?", ["Partisan Records", "Sub Pop", "Domino", "4AD"], "a"],
    ],
  },
  {
    name: "Rusowsky",
    genre: "Alt-Pop",
    difficulty: "hard",
    questions: [
      ["Rusowsky is an artist from which country?", ["Spain", "Mexico", "Argentina", "Colombia"], "a"],
      ["Rusowsky's music blends bedroom pop with which style of Latin/electronic influence?", ["Alternative reggaeton", "Salsa", "Tango", "Mariachi"], "a"],
      ["Rusowsky's debut studio album, released in 2025, is titled:", ["Daisy", "Malibu", "Ö", "Baggy$$"], "a"],
      ["Rusowsky's single \"Malibu\" was certified multi-Platinum in which country?", ["Spain", "Mexico", "United States", "Brazil"], "a"],
      ["Rusowsky is signed to which major music group?", ["Warner Music Group", "Universal Music Group", "Sony Music", "Independent, unsigned"], "a"],
      ["Rusowsky's debut album \"Daisy\" received a nomination at which awards show?", ["Latin Grammy Awards", "Grammy Awards", "Brit Awards", "MTV VMAs"], "a"],
      ["Rusowsky trained in which discipline from a young age before turning to pop production?", ["Classical piano", "Ballet", "Opera singing", "Violin"], "a"],
    ],
  },
  {
    name: "FCUKERS",
    genre: "Electronic",
    difficulty: "hard",
    questions: [
      ["FCUKERS formed as an underground act in which city?", ["Brooklyn, New York", "London, England", "Los Angeles, California", "Berlin, Germany"], "a"],
      ["FCUKERS' sound draws heavily on which dance genre?", ["UK garage", "Trap", "Bluegrass", "Reggaeton"], "a"],
      ["FCUKERS signed to which record label (an imprint of Ninja Tune) in 2024?", ["Technicolour", "Warp Records", "Domino", "4AD"], "a"],
      ["FCUKERS is fronted in part by Shanny Wise, formerly of which other band?", ["The Shacks", "Haim", "Warpaint", "Girlpool"], "a"],
      ["FCUKERS' other core member, Jackson Walker Lewis, was formerly in which band?", ["Spud Cannon", "Vampire Weekend", "MGMT", "Parquet Courts"], "a"],
      ["FCUKERS' debut EP, released in 2024, is titled:", ["Baggy$$", "Daisy", "Glow On", "3D Country"], "a"],
      ["FCUKERS opened for which major act on the 2025 Deadbeat Tour?", ["Tame Impala", "The Weeknd", "Arctic Monkeys", "Vampire Weekend"], "a"],
    ],
  },
];

async function seedACL2026() {
  const { rows: fRows } = await pool.query(`SELECT id, name FROM festivals WHERE slug = $1`, [FESTIVAL_SLUG]);
  if (!fRows.length) {
    throw new Error(`No festival found with slug "${FESTIVAL_SLUG}" — run server/seed.js first (it creates the placeholder row), then re-run this script.`);
  }
  const festivalId = fRows[0].id;

  const { rows: existingArtists } = await pool.query(`SELECT COUNT(*)::int AS count FROM artists WHERE festival_id = $1`, [festivalId]);
  if (existingArtists[0].count > 0) {
    console.log(`"${fRows[0].name}" already has ${existingArtists[0].count} artist(s) — skipping to avoid duplicating the lineup. Delete its artists first (via the admin panel) if you want to reseed from scratch.`);
    return;
  }

  for (let position = 0; position < LINEUP.length; position++) {
    const artist = LINEUP[position];
    const artistResult = await pool.query(
      `INSERT INTO artists (festival_id, name, genre, set_time, position, difficulty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [festivalId, artist.name, artist.genre, null, position, artist.difficulty]
    );
    const artistId = artistResult.rows[0].id;
    for (const [q, choices, correct] of artist.questions) {
      await pool.query(
        `INSERT INTO questions (artist_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [artistId, q, choices[0], choices[1], choices[2], choices[3], correct]
      );
    }
  }

  console.log(`Seeded ${LINEUP.length} artists (with ${LINEUP.reduce((n, a) => n + a.questions.length, 0)} total questions) onto "${fRows[0].name}". Board is now a 4x4 (auto-derived from artist count).`);
}

if (require.main === module) {
  seedACL2026()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { seedACL2026, LINEUP };
