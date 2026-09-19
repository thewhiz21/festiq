// One-time content seed for III Points 2026 (Oct 16-17, 2026, Miami, FL —
// eclectic electronic/hip-hop festival). Creates the festival row and its
// 16-artist lineup, corner-anchored by difficulty (see seed-utils.js).
//
// Usage: node server/seed-iii-points-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "iii-points-2026";

const FESTIVAL = {
  name: "III Points",
  location: "Miami, FL",
  event_date: "Oct. 16–17, 2026",
  banner_color: "#c084fc",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "Four Tet",
    genre: "Electronic",
    difficulty: "easy",
    questions: [
      ["What is Four Tet's real name?", ["Kieran Hebden", "Kieran Four", "Tet Hebden", "Kevin Hebden"], "a"],
      ["Four Tet is a producer from which country?", ["England", "Germany", "United States", "France"], "a"],
      ["Four Tet's music is often associated with a genre blend nicknamed:", ["Folktronica", "Bluegrass", "Trap", "Salsa"], "a"],
      ["Four Tet has released remixes for major pop artists, including which superstar's song \"Both Sides Now\"-adjacent work? (He is known broadly for remix work for artists like Radiohead and:)", ["Beyoncé", "Taylor Swift", "Ed Sheeran", "Adele"], "a"],
      ["Four Tet's acclaimed 2003 album, considered a genre landmark, is titled:", ["Rounds", "Pink", "There Is Love in You", "New Energy"], "a"],
      ["Four Tet was an early member of which post-rock band before going solo?", ["Fridge", "Radiohead", "Sigur Rós", "Explosions in the Sky"], "a"],
      ["Four Tet has frequently collaborated live and in the studio with which fellow electronic artist, touring together as a trio with Skrillex?", ["Fred again..", "Bonobo", "Jamie xx", "Bicep"], "a"],
    ],
  },
  {
    name: "Underworld",
    genre: "Electronic / Techno",
    difficulty: "easy",
    questions: [
      ["Underworld is an electronic duo best known for which massive 1996 track, featured in \"Trainspotting\"?", ["Born Slippy .NUXX", "Rez", "Two Months Off", "Cowgirl"], "a"],
      ["Underworld is from which country?", ["England", "Germany", "United States", "Netherlands"], "a"],
      ["Underworld's core members are Karl Hyde and:", ["Rick Smith", "Darren Emerson (an earlier member)", "Both Rick Smith and Darren Emerson at different points", "Moby"], "a"],
      ["Underworld co-composed music for the opening ceremony of which major global sporting event?", ["The 2012 London Olympics", "The 2016 Rio Olympics", "The 2008 Beijing Olympics", "FIFA World Cup 2010"], "a"],
      ["Underworld's breakthrough album, featuring \"Born Slippy .NUXX,\" is titled:", ["Second Toughest in the Infants", "Dubnobasswithmyheadman", "Beaucoup Fish", "Barbara Barbara, We Face a Shining Future"], "a"],
      ["Underworld's music is generally categorized within which genre?", ["Electronic / techno", "Bluegrass", "Reggae", "Opera"], "a"],
      ["Underworld formed originally in the 1980s as a different type of band before evolving into their electronic sound — what genre did they start in?", ["New wave / synth-pop", "Death metal", "Bluegrass", "Reggae"], "a"],
    ],
  },
  {
    name: "Danny Brown",
    genre: "Hip-Hop",
    difficulty: "easy",
    questions: [
      ["Danny Brown is a rapper from which U.S. city?", ["Detroit, Michigan", "Chicago, Illinois", "Atlanta, Georgia", "New York City"], "a"],
      ["Danny Brown is known for his distinctive, high-pitched vocal delivery and experimental production choices.", ["True", "False", "He is known for a deep baritone voice", "He never raps, only sings"], "a"],
      ["Danny Brown's acclaimed 2013 album is titled:", ["Old", "XXX", "Atrocity Exhibition", "Quaranta"], "a"],
      ["Danny Brown's 2016 album, drawing its title from a Joy Division song, is titled:", ["Atrocity Exhibition", "Old", "XXX", "uknowhatimsayin¿"], "a"],
      ["Danny Brown co-hosts a popular podcast with fellow rapper/producer:", ["Bruiser Brigade / Skywlkr, or notably \"The Danny Brown Show\"", "Kanye West", "Jay-Z", "Drake"], "a"],
      ["Danny Brown released a joint collaborative album with producer JPEGMAFIA titled:", ["Scaring the Hoes", "Old", "XXX", "Quaranta"], "a"],
      ["Danny Brown's 2023 album, reflecting on aging and sobriety, is titled:", ["Quaranta", "Atrocity Exhibition", "uknowhatimsayin¿", "Old"], "a"],
    ],
  },
  {
    name: "Blood Orange",
    genre: "R&B / Alt",
    difficulty: "easy",
    questions: [
      ["Blood Orange is the stage name of which musician/producer?", ["Dev Hynes", "Devonte Hynes Jr.", "Dev Blood", "Devon Orange"], "a"],
      ["Blood Orange is originally from which country?", ["England", "United States", "Canada", "Jamaica"], "a"],
      ["Before Blood Orange, Dev Hynes performed under which earlier stage name, fronting a dance-punk project?", ["Lightspeed Champion", "Test Icicles", "Blood Orange was his first project", "The Blessed Madonna"], "a"],
      ["Blood Orange has written and produced songs for major pop artists including Solange and:", ["Sky Ferreira", "Beyoncé exclusively", "Taylor Swift", "Adele"], "a"],
      ["Blood Orange's acclaimed 2016 album is titled:", ["Freetown Sound", "Cupid Deluxe", "Negro Swan", "Angel's Pulse"], "a"],
      ["Blood Orange's 2018 album, exploring themes of mental health and Black identity, is titled:", ["Negro Swan", "Freetown Sound", "Cupid Deluxe", "Angel's Pulse"], "a"],
      ["Blood Orange's sound blends R&B and funk influences with elements of which other genre?", ["1980s new wave / synth-pop", "Bluegrass", "Death metal", "Opera"], "a"],
    ],
  },
  {
    name: "Charlotte de Witte",
    genre: "Techno",
    difficulty: "medium",
    questions: [
      ["Charlotte de Witte is a techno DJ/producer from which country?", ["Belgium", "Germany", "Netherlands", "France"], "a"],
      ["Charlotte de Witte has topped influential techno industry polls, including DJ Mag's Top 100 in the techno category.", ["True", "False", "She has never been ranked in any poll", "She only performs house music, not techno"], "a"],
      ["Charlotte de Witte co-runs which record label, known for hard, driving techno releases?", ["KNTXT", "Drumcode", "Ovum Recordings", "Cocoon Recordings"], "a"],
      ["Charlotte de Witte performed under an earlier alias before becoming known by her own name — that alias was:", ["Raving George", "DJ Snake", "Amelie Lens", "Nina Kraviz"], "a"],
      ["Charlotte de Witte's music is generally classified as:", ["Techno", "Reggaeton", "Bluegrass", "Smooth jazz"], "a"],
      ["Charlotte de Witte has performed at major techno-focused stages at festivals such as Tomorrowland and:", ["Awakenings", "CMA Fest", "Stagecoach", "New Orleans Jazz Fest"], "a"],
      ["Charlotte de Witte's rise in the techno scene accelerated significantly starting in which decade?", ["2010s", "1990s", "1980s", "2000s"], "a"],
    ],
  },
  {
    name: "Honey Dijon",
    genre: "House",
    difficulty: "medium",
    questions: [
      ["Honey Dijon is a DJ/producer known for representing which house music scene's roots, having come up through Chicago's ballroom/club culture?", ["Chicago house", "Detroit techno exclusively", "UK garage", "Miami bass"], "a"],
      ["Honey Dijon is from which U.S. city?", ["Chicago, Illinois", "New York City", "Detroit, Michigan", "Los Angeles, California"], "a"],
      ["Honey Dijon has collaborated with major fashion houses, including designing a collection for:", ["Comme des Garçons", "Only Gucci", "Only Chanel", "She has no fashion collaborations"], "a"],
      ["Honey Dijon's music draws on Chicago house tradition blended with elements of:", ["Ballroom / vogue culture", "Bluegrass", "Death metal", "Opera"], "a"],
      ["Honey Dijon has produced remixes and music associated with major pop releases, including work related to Beyoncé's dance-focused album:", ["Renaissance", "Lemonade", "4", "B'Day"], "a"],
      ["Honey Dijon is an openly transgender artist and has spoken publicly about representation in the electronic music scene.", ["True", "False", "She avoids discussing her identity publicly", "She has never addressed this topic"], "a"],
      ["Honey Dijon's DJ sets are known for blending house with funk, disco, and:", ["Ballroom / vogue tracks", "Classical strings", "Bluegrass banjo", "Death metal riffs"], "a"],
    ],
  },
  {
    name: "Flying Lotus",
    genre: "Electronic / Experimental",
    difficulty: "medium",
    questions: [
      ["What is Flying Lotus's real name?", ["Steven Ellison", "Steven Lotus", "Flying Ellison", "Steve Flynn"], "a"],
      ["Flying Lotus is the great-nephew of which legendary jazz musician?", ["John Coltrane (via Alice Coltrane)", "Miles Davis", "Duke Ellington", "Charlie Parker"], "a"],
      ["Flying Lotus founded which record label, home to artists like Thundercat?", ["Brainfeeder", "Warp Records", "Stones Throw", "Ninja Tune"], "a"],
      ["Flying Lotus also makes music and film under an alternate rap persona named:", ["Captain Murphy", "MF DOOM", "Madlib", "Deltron"], "a"],
      ["Flying Lotus's acclaimed 2010 album, featuring Thundercat and Thom Yorke, is titled:", ["Cosmogramma", "You're Dead!", "Los Angeles", "Flamagra"], "a"],
      ["Flying Lotus directed a feature horror film released in 2017 titled:", ["Kuso", "Cosmogramma: The Movie", "Brainfeeder", "Until the Quiet Comes"], "a"],
      ["Flying Lotus's sound blends jazz, hip-hop, and electronic production into a genre sometimes called:", ["Beat music / experimental IDM", "Bluegrass fusion", "Yacht rock", "Death metal"], "a"],
    ],
  },
  {
    name: "Kelela",
    genre: "R&B / Electronic",
    difficulty: "medium",
    questions: [
      ["Kelela is an R&B singer known for blending vocals with which production style?", ["Experimental/electronic production", "Bluegrass instrumentation", "Death metal riffs", "Opera arrangements"], "a"],
      ["Kelela is from which U.S. city?", ["Washington, D.C.", "Atlanta, Georgia", "New York City", "Los Angeles, California"], "a"],
      ["Kelela's breakout 2013 mixtape is titled:", ["Cut 4 Me", "Take Me Apart", "Raven", "Hallucinogen"], "a"],
      ["Kelela's acclaimed 2017 debut studio album is titled:", ["Take Me Apart", "Cut 4 Me", "Raven", "Hallucinogen"], "a"],
      ["Kelela's 2023 album, exploring themes of identity and healing, is titled:", ["Raven", "Take Me Apart", "Cut 4 Me", "Hallucinogen"], "a"],
      ["Kelela has collaborated with producers and labels associated with experimental electronic music, including the UK label:", ["Warp Records", "Motown", "Def Jam", "Atlantic Records"], "a"],
      ["Kelela's parents emigrated to the United States from which country?", ["Ethiopia", "Nigeria", "Jamaica", "Ghana"], "a"],
    ],
  },
  {
    name: "Parcels",
    genre: "Funk / Disco",
    difficulty: "medium",
    questions: [
      ["Parcels is a five-piece band originally from which country?", ["Australia", "France", "United Kingdom", "Canada"], "a"],
      ["Parcels relocated early in their career to which European city, where they still are closely associated?", ["Berlin, Germany", "Paris, France", "Amsterdam, Netherlands", "London, England"], "a"],
      ["Parcels' sound blends funk and disco influences with:", ["Modern indie-pop production", "Bluegrass banjo", "Death metal riffs", "Gregorian chant"], "a"],
      ["Parcels collaborated with which French electronic duo on the single \"Overnight\"?", ["Daft Punk", "Justice", "Air", "Phoenix"], "a"],
      ["Parcels' self-titled debut album was released in which year?", ["2018", "2015", "2020", "2012"], "a"],
      ["Parcels' 2021 double album is titled:", ["Day/Night", "Live Vol. 1", "Parcels", "Circulate"], "a"],
      ["All five members of Parcels are known for sharing songwriting and vocal duties fairly evenly across the band.", ["True", "False", "Only one member writes all the songs", "The band has only two members"], "a"],
    ],
  },
  {
    name: "Purity Ring",
    genre: "Electropop",
    difficulty: "medium",
    questions: [
      ["Purity Ring is a duo from which country?", ["Canada", "United States", "United Kingdom", "Sweden"], "a"],
      ["Purity Ring is made up of Megan James and:", ["Corin Roddick", "Chad VanGaalen", "Devon Welsh", "Dan Boeckner"], "a"],
      ["Purity Ring's breakout 2012 debut album is titled:", ["Shrines", "Another Eternity", "WOMB", "Graves"], "a"],
      ["Purity Ring's music is known for pairing ethereal vocals with heavy, glitchy:", ["Trap/bass-influenced electronic production", "Bluegrass guitar picking", "Full orchestral arrangements", "A cappella harmonies"], "a"],
      ["Purity Ring's 2015 album is titled:", ["Another Eternity", "Shrines", "WOMB", "Graves"], "a"],
      ["Purity Ring's lyrics are frequently noted for their recurring imagery involving:", ["The body / anatomical and visceral imagery", "Space travel exclusively", "Sports and competition", "Cooking and food"], "a"],
      ["Purity Ring's 2020 album is titled:", ["WOMB", "Shrines", "Another Eternity", "Graves"], "a"],
    ],
  },
  {
    name: "Seth Troxler",
    genre: "Techno",
    difficulty: "medium",
    questions: [
      ["Seth Troxler is a techno/house DJ from which U.S. state?", ["Michigan", "California", "New York", "Florida"], "a"],
      ["Seth Troxler came up through the dance music scene closely associated with which city, historically a birthplace of techno?", ["Detroit", "Chicago", "Miami", "Los Angeles"], "a"],
      ["Seth Troxler co-founded which techno-focused record label/event brand?", ["Visionquest", "Drumcode", "Cocoon Recordings", "Ovum Recordings"], "a"],
      ["Seth Troxler's DJ sets are known for blending house and techno with an eclectic, genre-crossing approach.", ["True", "False", "He plays strictly one narrow subgenre", "He never mixes genres in a single set"], "a"],
      ["Seth Troxler has been a longtime resident/regular performer at events on which Mediterranean party island?", ["Ibiza, Spain", "Santorini, Greece", "Corsica, France", "Sicily, Italy"], "a"],
      ["Seth Troxler co-hosts a food and travel-themed media project outside of music called:", ["In Search Of Sunrise / his culinary ventures (he's also a chef/restaurateur)", "He has no ventures outside music", "A bluegrass podcast", "A sports talk show"], "a"],
      ["Seth Troxler is closely tied to the American techno/house lineage frequently cited alongside artists like Kyle Hall and Omar-S.", ["True", "False", "He has no ties to that scene", "He only performs classical music"], "a"],
    ],
  },
  {
    name: "Adam Port",
    genre: "House",
    difficulty: "medium",
    questions: [
      ["Adam Port is a house DJ/producer from which country?", ["Germany", "Netherlands", "United Kingdom", "France"], "a"],
      ["Adam Port co-founded which influential Berlin-based record label and event brand?", ["Keinemusik", "Innervisions", "Diynamic", "Drumcode"], "a"],
      ["Adam Port's collaborative project/trio work, alongside &ME and Rampa, is closely tied to which label collective?", ["Keinemusik", "Cocoon Recordings", "Ovum Recordings", "Anjunadeep"], "a"],
      ["Adam Port's music is generally classified within which genre?", ["Deep house / melodic house", "Bluegrass", "Death metal", "Reggaeton"], "a"],
      ["Adam Port's breakout single \"Move,\" a widely streamed melodic house track, features vocals from:", ["Stryv and Keinemusik collaborators", "Beyoncé", "Adele", "Taylor Swift"], "a"],
      ["Adam Port is based primarily out of which European city?", ["Berlin, Germany", "London, England", "Amsterdam, Netherlands", "Paris, France"], "a"],
      ["Adam Port's label Keinemusik has grown into both a music label and a lifestyle brand with its own festival stages worldwide.", ["True", "False", "It is strictly a small local record shop", "It only releases classical music"], "a"],
    ],
  },
  {
    name: "Men I Trust",
    genre: "Indie / Dream Pop",
    difficulty: "hard",
    questions: [
      ["Men I Trust is a band from which country?", ["Canada", "United States", "United Kingdom", "France"], "a"],
      ["Men I Trust formed in which Canadian province/city?", ["Montreal, Quebec", "Toronto, Ontario", "Vancouver, British Columbia", "Ottawa, Ontario"], "a"],
      ["Men I Trust's music is generally categorized as:", ["Dream pop / indie", "Death metal", "Bluegrass", "Opera"], "a"],
      ["Men I Trust's widely streamed 2019 single, which became a slow-building viral hit, is titled:", ["Show Me How", "Say, Can You Hear", "Numb", "Tailwhip"], "a"],
      ["Men I Trust is known for maintaining an independent, DIY approach, largely self-releasing their music without a major label.", ["True", "False", "They are signed to a major label", "They have never released music independently"], "a"],
      ["Men I Trust's lead vocalist is:", ["Emma Proulx", "Dragos Chiriac", "Jessy Caron", "Both Dragos Chiriac and Jessy Caron equally share lead vocals"], "a"],
      ["Men I Trust's sound is known for soft, breathy vocals over laid-back, groove-driven instrumentation.", ["True", "False", "Their sound is aggressive and loud", "They are an entirely instrumental band"], "a"],
    ],
  },
  {
    name: "GZA",
    genre: "Hip-Hop (Wu-Tang Clan)",
    difficulty: "hard",
    questions: [
      ["GZA is a founding member of which legendary hip-hop group?", ["Wu-Tang Clan", "N.W.A", "Public Enemy", "Run-DMC"], "a"],
      ["GZA's well-known nickname within Wu-Tang Clan is:", ["The Genius", "The Chef", "The GOAT", "The RZA"], "a"],
      ["GZA's acclaimed 1995 solo album, considered a classic of the genre, is titled:", ["Liquid Swords", "Legend of the Liquid Sword", "Pro Tools", "Grandmasters"], "a"],
      ["GZA is known for intricate, chess-and-science-referencing lyricism throughout his catalog.", ["True", "False", "His lyrics avoid any complex themes", "He never references chess or science"], "a"],
      ["GZA collaborated with which producer, a fellow Wu-Tang member, on \"Liquid Swords\"?", ["RZA", "Dr. Dre", "DJ Premier", "Pete Rock"], "a"],
      ["GZA is a cousin of which other founding Wu-Tang Clan member?", ["RZA", "Method Man", "Raekwon", "Inspectah Deck"], "a"],
      ["GZA has been involved in educational/science outreach initiatives later in his career, including work related to:", ["Science education programs for youth", "Professional football coaching", "Fashion design exclusively", "Classical music composition"], "a"],
    ],
  },
  {
    name: "Bone Thugs-N-Harmony",
    genre: "Hip-Hop",
    difficulty: "hard",
    questions: [
      ["Bone Thugs-N-Harmony is a hip-hop group from which U.S. city?", ["Cleveland, Ohio", "Detroit, Michigan", "Chicago, Illinois", "St. Louis, Missouri"], "a"],
      ["Bone Thugs-N-Harmony is known for pioneering a fast-paced, melodic rapping/harmonizing vocal style.", ["True", "False", "They are known for slow, spoken-word delivery", "They do not rap, only sing ballads"], "a"],
      ["Bone Thugs-N-Harmony's breakout hit \"Tha Crossroads\" won a Grammy Award in which category?", ["Best Rap Performance by a Duo or Group", "Best Rock Song", "Best R&B Album", "Best New Artist"], "a"],
      ["Bone Thugs-N-Harmony was closely mentored and signed early on by which legendary rapper's label?", ["Eazy-E (Ruthless Records)", "Dr. Dre", "Jay-Z", "Puff Daddy"], "a"],
      ["Bone Thugs-N-Harmony's group name reflects the members' shared harmony-based vocal approach alongside the word \"Bone.\"", ["True", "False", "Their name has no connection to their vocal style", "Bone refers to a member's last name only"], "a"],
      ["Bone Thugs-N-Harmony's 1995 album featuring \"Tha Crossroads\" is titled:", ["E. 1999 Eternal", "Creepin on ah Come Up", "The Art of War", "BTNHResurrection"], "a"],
      ["Bone Thugs-N-Harmony originally consisted of five members.", ["True", "False", "They originally had only two members", "They originally had ten members"], "a"],
    ],
  },
  {
    name: "Lil' Kim",
    genre: "Hip-Hop",
    difficulty: "hard",
    questions: [
      ["Lil' Kim is a rapper from which U.S. city?", ["Brooklyn, New York", "Atlanta, Georgia", "Los Angeles, California", "Detroit, Michigan"], "a"],
      ["Lil' Kim rose to prominence as a member of which hip-hop group led by The Notorious B.I.G.?", ["Junior M.A.F.I.A.", "Wu-Tang Clan", "Bad Boy Records (as a solo signee only)", "Terror Squad"], "a"],
      ["Lil' Kim's influential 1996 debut solo album is titled:", ["Hard Core", "The Notorious K.I.M.", "La Bella Mafia", "Naked Truth"], "a"],
      ["Lil' Kim is widely credited as a pioneering, boundary-pushing female voice in 1990s hip-hop alongside contemporaries like Foxy Brown.", ["True", "False", "She was not active until the 2010s", "She has never released a solo album"], "a"],
      ["Lil' Kim's real name is:", ["Kimberly Jones", "Kimberly Kim", "Kim Jones-Wallace", "Kimberly Wallace"], "a"],
      ["Lil' Kim won a Grammy Award as part of a collaborative group performance on \"Lady Marmalade,\" alongside Christina Aguilera, Mýa, and:", ["Pink", "Beyoncé", "Missy Elliott", "Alicia Keys"], "a"],
      ["Lil' Kim's 2000 album, following her debut, is titled:", ["The Notorious K.I.M.", "Hard Core", "La Bella Mafia", "Naked Truth"], "a"],
    ],
  },
];

async function seed() {
  await seedFestivalLineup(pool, { slug: FESTIVAL_SLUG, festival: FESTIVAL, lineup: LINEUP });
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { seed, LINEUP, FESTIVAL, FESTIVAL_SLUG };
