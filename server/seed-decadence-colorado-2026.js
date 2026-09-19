// One-time content seed for Decadence Colorado 2026 (Dec 30-31, 2026,
// Denver, CO — bass/EDM New Year's Eve festival). Creates the festival row
// and its 16-artist lineup, corner-anchored by difficulty (see
// seed-utils.js). For the least-known acts (ISOxo, DEATHPACT, Kasbo, it's
// murph) questions stick to genre/scene facts that are safely verifiable
// rather than invented specifics.
//
// Usage: node server/seed-decadence-colorado-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "decadence-colorado-2026";

const FESTIVAL = {
  name: "Decadence Colorado",
  location: "Denver, CO",
  event_date: "Dec. 30–31, 2026",
  banner_color: "#ff3d81",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "DJ Snake",
    genre: "Trap / EDM",
    difficulty: "easy",
    questions: [
      ["DJ Snake is a producer from which country?", ["France", "Belgium", "Netherlands", "Germany"], "a"],
      ["DJ Snake's massive 2016 collaboration with Justin Bieber is titled:", ["Let Me Love You", "Turn Down for What", "Taki Taki", "Magenta Riddim"], "a"],
      ["DJ Snake's breakout single with Lil Jon, known for its distinctive drop, is titled:", ["Turn Down for What", "Bird Machine", "Middle", "Get Low"], "a"],
      ["DJ Snake's 2018 hit \"Taki Taki\" features Selena Gomez, Ozuna, and:", ["Cardi B", "Nicki Minaj", "Rihanna", "Beyoncé"], "a"],
      ["DJ Snake's real name is:", ["William Grigahcine", "William Snake", "Grigahcine William Jr.", "Karim Grigahcine"], "a"],
      ["DJ Snake is of which heritage, often reflected in tracks blending Middle Eastern/North African sounds with EDM?", ["Algerian", "Brazilian", "Nigerian", "Japanese"], "a"],
      ["DJ Snake's music is generally categorized within which genre blend?", ["Trap / moombahton-influenced EDM", "Bluegrass", "Opera", "Classical"], "a"],
    ],
  },
  {
    name: "Excision",
    genre: "Dubstep",
    difficulty: "easy",
    questions: [
      ["Excision is a dubstep producer from which country?", ["Canada", "United States", "United Kingdom", "Australia"], "a"],
      ["Excision's real name is:", ["Jeff Abel", "Jeff Excision", "Jeffrey Anderson", "Anderson Jeff"], "a"],
      ["Excision founded which annual bass music festival, held at Legend Valley?", ["Lost Lands", "HiJinx", "Cyclops Cove", "Bass Canyon"], "a"],
      ["Excision founded which record label?", ["Subsidia Records", "Never Say Die", "OWSLA", "Circus Records"], "a"],
      ["Excision's music is most associated with which heavy bass subgenre?", ["Dubstep / riddim", "Trance", "Deep house", "Tropical house"], "a"],
      ["Excision is known for elaborate stage production, including a signature giant robotic prop resembling:", ["A skull / \"Deathmau5\"-style rig — specifically his iconic \"Server Farm\" and skull stage designs", "A rocket ship only", "A pirate ship", "A dragon"], "a"],
      ["Excision has collaborated frequently with fellow dubstep artist Downlink and others under various group projects.", ["True", "False", "He has never collaborated with anyone", "He only performs classical music"], "a"],
    ],
  },
  {
    name: "Marshmello",
    genre: "EDM / Trap",
    difficulty: "easy",
    questions: [
      ["Marshmello is known for wearing a signature accessory that hides his identity — what is it?", ["A marshmallow-shaped helmet", "A wolf mask", "A pair of large sunglasses", "A hood only"], "a"],
      ["Marshmello's breakout 2016 single, a melodic future bass track, is titled:", ["Alone", "Happier", "Silence", "Wolves"], "a"],
      ["Marshmello's 2018 collaboration with Bastille, a huge global hit, is titled:", ["Happier", "Alone", "Silence", "Wolves"], "a"],
      ["Marshmello's collaboration with Selena Gomez, \"Wolves,\" was released in which year?", ["2017", "2015", "2019", "2020"], "a"],
      ["Marshmello performed a landmark live concert inside which popular video game in 2019?", ["Fortnite", "Minecraft", "Roblox", "Call of Duty"], "a"],
      ["Marshmello's music spans multiple genres including future bass, trap, and:", ["Pop-EDM crossover", "Bluegrass", "Opera", "Classical"], "a"],
      ["Marshmello's record label/imprint is called:", ["Joytime Collective", "Subsidia Records", "OWSLA", "Never Say Die"], "a"],
    ],
  },
  {
    name: "Zeds Dead",
    genre: "Dubstep",
    difficulty: "easy",
    questions: [
      ["Zeds Dead is a dubstep/bass duo from which country?", ["Canada", "United States", "United Kingdom", "Australia"], "a"],
      ["Zeds Dead's members are Dylan Mamid and:", ["Zach Rapp-Rovan", "Jeff Abel", "Marshall Mathers", "Kris Trindl"], "a"],
      ["Zeds Dead's name is a reference to a line from which Quentin Tarantino film?", ["Pulp Fiction", "Kill Bill", "Reservoir Dogs", "Django Unchained"], "a"],
      ["Zeds Dead founded which record label?", ["Deadbeats", "Never Say Die", "Circus Records", "Subsidia Records"], "a"],
      ["Zeds Dead's music spans dubstep along with elements of house and:", ["Trap / hip-hop influenced bass", "Bluegrass", "Opera", "Classical"], "a"],
      ["Zeds Dead's collaborative single \"Adrenaline\" features vocals from:", ["Twin Shadow", "Rivals", "Elohim", "Delaney Jane"], "a"],
      ["Zeds Dead has been active in the North American bass music scene since which decade?", ["Late 2000s", "1980s", "2010s only", "2020s only"], "a"],
    ],
  },
  {
    name: "Alesso",
    genre: "Progressive House",
    difficulty: "medium",
    questions: [
      ["What is Alesso's real name?", ["Alessandro Lindblad", "Alessandro Diamante", "Alex Ebert", "Alessio Alessi"], "a"],
      ["Alesso is a DJ/producer from which country?", ["Sweden", "Norway", "Denmark", "Finland"], "a"],
      ["Alesso's breakout collaboration with OneRepublic is titled:", ["If I Lose Myself", "Heroes (We Could Be)", "Cool", "Under Control"], "a"],
      ["Alesso's 2014 single \"Heroes (We Could Be)\" features vocals from:", ["Tove Lo", "Katy Perry", "Ellie Goulding", "Sia"], "a"],
      ["Alesso co-produced early tracks with which fellow Swedish superstar producer, a mentor figure to him?", ["Avicii", "Axwell", "Steve Angello", "Otto Knows"], "a"],
      ["Alesso's music is generally categorized as:", ["Progressive house", "Trap", "Dubstep", "Drum & bass"], "a"],
      ["Alesso's collaboration with Calvin Harris is titled:", ["Under Control", "Sweet Nothing", "Summer", "This Is What You Came For"], "a"],
    ],
  },
  {
    name: "Green Velvet",
    genre: "House / Techno",
    difficulty: "medium",
    questions: [
      ["Green Velvet is a house/techno artist from which U.S. city, closely tied to the genre's roots?", ["Chicago, Illinois", "Detroit, Michigan", "New York City", "Miami, Florida"], "a"],
      ["Green Velvet's real name is:", ["Curtis Jones", "Curtis Green", "Jones Curtis", "Velvet Curtis"], "a"],
      ["Green Velvet also performs under an earlier alias associated with the acid house sound, named:", ["Cajmere", "Cajun Velvet", "DJ Curtis", "Chicago Green"], "a"],
      ["Green Velvet's well-known single, featuring the recurring lyric \"I gotta bad ass weed,\" is titled:", ["La La Land", "Flash", "Answering Machine", "Bigger Than Prince"], "a"],
      ["Green Velvet co-founded which Chicago house record label?", ["Cajual Records", "Anjunabeats", "Drumcode", "Warp Records"], "a"],
      ["Green Velvet's music is most associated with which genre roots, historically tied to Chicago?", ["House / acid house", "Bluegrass", "Reggae", "Country"], "a"],
      ["Green Velvet has collaborated frequently with which fellow house artist under the \"Get Real\" and other joint projects?", ["Claude VonStroke", "David Guetta", "Skrillex", "Zedd"], "a"],
    ],
  },
  {
    name: "GRiZ",
    genre: "Funk / Bass",
    difficulty: "medium",
    questions: [
      ["GRiZ is a producer known for blending bass music with which genre, often playing live saxophone?", ["Funk", "Bluegrass", "Opera", "Classical"], "a"],
      ["GRiZ's real name is:", ["Grant Kwiecinski", "Grant Griz", "Kwiecinski Grant Jr.", "Gregory Kwiecinski"], "a"],
      ["GRiZ is from which U.S. state?", ["Michigan", "California", "Texas", "Florida"], "a"],
      ["GRiZ founded which record label, home to his own releases and collaborators?", ["All Good Records", "WAKAAN", "Circus Records", "Never Say Die"], "a"],
      ["GRiZ is known for performing live using a saxophone integrated into his electronic sets.", ["True", "False", "He never plays a physical instrument live", "He plays guitar exclusively, not saxophone"], "a"],
      ["GRiZ's music draws heavily on funk, soul, and hip-hop influences layered with electronic bass production.", ["True", "False", "His music has no funk or soul influence", "His music is purely classical"], "a"],
      ["GRiZ has been open about his personal health journey, including diabetes awareness advocacy, as part of his public persona.", ["True", "False", "He has never discussed personal health topics publicly", "He avoids all personal topics in interviews"], "a"],
    ],
  },
  {
    name: "Seven Lions",
    genre: "Melodic Dubstep",
    difficulty: "medium",
    questions: [
      ["Seven Lions is a producer known for pioneering a melodic, emotionally-driven style within which bass genre?", ["Melodic dubstep", "Trap", "Deep house", "Trance exclusively"], "a"],
      ["Seven Lions' real name is:", ["Jeff Montalvo", "Jeff Lions", "Montalvo Jeff Jr.", "Seven Montalvo"], "a"],
      ["Seven Lions is from which U.S. state?", ["California", "Colorado", "Texas", "Florida"], "a"],
      ["Seven Lions' breakout single, released in the early 2010s and considered a genre-defining track, is titled:", ["Strangers", "Days to Come", "Fiction", "Rush Over Me"], "a"],
      ["Seven Lions has collaborated frequently with fellow bass artists Jason Ross and:", ["Kill the Noise", "Kaskade", "Zedd", "David Guetta"], "a"],
      ["Seven Lions' music blends dubstep with elements of which other genre, giving it a distinctive melodic edge?", ["Trance", "Bluegrass", "Reggae", "Opera"], "a"],
      ["Seven Lions co-founded which touring festival brand focused on uplifting, melodic bass music?", ["Ophelia (record label) and the Dreamstate/Middlelands circuit", "HiJinx", "Cyclops Cove", "Lost Lands"], "a"],
    ],
  },
  {
    name: "Sullivan King",
    genre: "Dubstep / Rock",
    difficulty: "medium",
    questions: [
      ["Sullivan King is known for blending dubstep/bass music with which other genre, drawing on his background as a metal vocalist?", ["Rock / metal", "Bluegrass", "Classical", "Reggae"], "a"],
      ["Sullivan King's real name is:", ["Matt Wozniak", "Matt Sullivan", "King Matt Jr.", "Sullivan Wozniak"], "a"],
      ["Sullivan King is known for performing live vocals during his sets, a rarity among bass DJs/producers.", ["True", "False", "He never sings live during performances", "He only performs instrumental sets with no vocals"], "a"],
      ["Sullivan King's music is most associated with which bass subgenre?", ["Dubstep / bass with rock elements", "Trance", "Deep house", "Tropical house"], "a"],
      ["Sullivan King has released music on record labels within the bass music scene, including collaborations with Excision's Subsidia Records.", ["True", "False", "He has never released on any bass-focused label", "He only releases classical piano music"], "a"],
      ["Sullivan King's stage name references \"King\" as part of his artistic branding, distinct from his birth surname.", ["True", "False", "King is his actual legal surname", "He has never used a stage name"], "a"],
      ["Sullivan King has toured extensively on the U.S. bass music festival circuit alongside acts like Excision and Wooli.", ["True", "False", "He has never toured with any bass artists", "He exclusively performs solo acoustic shows"], "a"],
    ],
  },
  {
    name: "Black Tiger Sex Machine",
    genre: "Bass / Electro",
    difficulty: "medium",
    questions: [
      ["Black Tiger Sex Machine is a bass music group from which country?", ["Canada", "United States", "United Kingdom", "Australia"], "a"],
      ["Black Tiger Sex Machine is known for elaborate stage production featuring which recurring visual motif, matching their name?", ["Illuminated tiger masks/helmets", "Giant butterfly wings", "Cowboy hats", "Viking helmets"], "a"],
      ["Black Tiger Sex Machine's music is most associated with which genre?", ["Bass / electro house", "Bluegrass", "Reggae", "Opera"], "a"],
      ["Black Tiger Sex Machine is composed of how many core members?", ["Three", "One", "Two", "Five"], "a"],
      ["Black Tiger Sex Machine has collaborated with other bass artists under combined alias projects, including \"Skull Machine\" with Kai Wachi.", ["True", "False", "They have never collaborated with another artist", "They only perform classical remixes"], "a"],
      ["Black Tiger Sex Machine is based out of which Canadian city?", ["Montreal, Quebec", "Toronto, Ontario", "Vancouver, British Columbia", "Calgary, Alberta"], "a"],
      ["Black Tiger Sex Machine's live shows are known for high-energy visuals and heavy bass drops within the electronic music scene.", ["True", "False", "Their live shows are entirely acoustic with no visual production", "They have never performed a live show"], "a"],
    ],
  },
  {
    name: "Lane 8",
    genre: "Melodic House",
    difficulty: "medium",
    questions: [
      ["Lane 8's real name is:", ["Daniel Goldstein", "Daniel Lane", "Lane Daniel Jr.", "Goldstein Daniel"], "a"],
      ["Lane 8 is from which country?", ["United States", "United Kingdom", "Germany", "Netherlands"], "a"],
      ["Lane 8 founded which record label, also the name of his radio show?", ["This Never Happened", "Anjunadeep", "Anjunabeats", "Kompakt"], "a"],
      ["Lane 8's music is most associated with which house subgenre?", ["Melodic / deep house", "Trap", "Dubstep", "Reggaeton"], "a"],
      ["Lane 8 is known for enforcing a distinctive no-phone-photography policy at some of his live shows to encourage presence in the moment.", ["True", "False", "He requires all attendees to film the entire show", "He has never held any live shows"], "a"],
      ["Lane 8's sound is generally described as atmospheric and emotionally driven, often contrasted with harder-edged EDM styles.", ["True", "False", "His sound is aggressive hardstyle", "His sound is centered on rap vocals"], "a"],
      ["Lane 8 attended which prestigious university before pursuing music full-time?", ["Georgetown University", "Harvard University", "MIT", "Stanford University"], "a"],
    ],
  },
  {
    name: "Crankdat",
    genre: "Dubstep",
    difficulty: "medium",
    questions: [
      ["Crankdat's real name is:", ["Kile Bristow", "Kile Crankdat", "Crank Bristow", "Kyle Dathan"], "a"],
      ["Crankdat is from which U.S. state?", ["California", "Colorado", "Texas", "Florida"], "a"],
      ["Crankdat's music is most associated with which bass subgenre?", ["Dubstep / riddim", "Trance", "Deep house", "Reggaeton"], "a"],
      ["Crankdat has frequently collaborated and toured alongside fellow dubstep artist Wooli, including performing under joint alias sets.", ["True", "False", "He has never collaborated with Wooli", "He exclusively performs solo with no collaborations ever"], "a"],
      ["Crankdat has released music on Excision's record label, Subsidia Records, among others in the bass scene.", ["True", "False", "He has never released on any bass-focused label", "He only releases classical compositions"], "a"],
      ["Crankdat's production style is known for heavy, aggressive bass drops within the North American dubstep scene.", ["True", "False", "His production style is smooth jazz", "His production style avoids bass entirely"], "a"],
      ["Crankdat has performed at major U.S. bass music festivals, including Lost Lands and EDC.", ["True", "False", "He has never performed at any bass-focused festival", "He exclusively performs at country music festivals"], "a"],
    ],
  },
  {
    name: "ISOxo",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["ISOxo has frequently collaborated and toured alongside fellow modern bass producer:", ["Knock2", "David Guetta", "Tiësto", "Kaskade"], "a"],
      ["ISOxo's music is most associated with which broad electronic genre?", ["Bass music", "Bluegrass", "Reggae", "Classical"], "a"],
      ["ISOxo rose to prominence largely through which online music-sharing and scene-building platform?", ["SoundCloud / online bass music communities", "Traditional radio only", "Major label A&R exclusively", "Broadway"], "a"],
      ["ISOxo is part of a newer generation of bass producers who gained traction significantly in which decade?", ["2020s", "1990s", "1980s", "2000s"], "a"],
      ["ISOxo has performed at major U.S. festivals within the bass and EDM circuit, including sets alongside other modern bass artists.", ["True", "False", "He has never performed at any festival", "He exclusively performs in acoustic settings"], "a"],
      ["ISOxo's production style is generally described as heavy, futuristic, and rooted in:", ["Modern bass / dubstep-adjacent sound design", "Traditional orchestral composition", "1950s doo-wop", "Bluegrass banjo picking"], "a"],
      ["ISOxo has released collaborative tracks with other bass producers within the contemporary bass music scene.", ["True", "False", "He has never collaborated with another producer", "He only performs classical piano covers"], "a"],
    ],
  },
  {
    name: "DEATHPACT",
    genre: "Bass / Cinematic",
    difficulty: "hard",
    questions: [
      ["DEATHPACT is a producer known for blending bass music with a dark, atmospheric style often described as:", ["Cinematic / dark bass", "Bluegrass", "Reggae", "Classical chamber music"], "a"],
      ["DEATHPACT performs while typically obscuring their identity, similar to some other electronic artists who use masks or personas.", ["True", "False", "DEATHPACT always performs without any visual persona", "DEATHPACT has never performed live"], "a"],
      ["DEATHPACT's music is most associated with which broad electronic genre?", ["Bass music", "Bluegrass", "Reggae", "Opera"], "a"],
      ["DEATHPACT has released music through labels associated with the bass and dark electronic music scenes.", ["True", "False", "DEATHPACT has never released any music", "DEATHPACT only releases through classical labels"], "a"],
      ["DEATHPACT's sound is often noted for combining heavy bass with moody, film-score-like atmosphere.", ["True", "False", "The sound is upbeat tropical house with no dark elements", "The sound is purely acoustic folk"], "a"],
      ["DEATHPACT has performed at bass-focused festivals within the North American electronic music circuit.", ["True", "False", "DEATHPACT has never performed at any festival", "DEATHPACT exclusively performs classical recitals"], "a"],
      ["DEATHPACT's name and branding reflect the dark, intense aesthetic present throughout the project's music and visuals.", ["True", "False", "The name has no connection to the music's aesthetic", "The project avoids any thematic branding"], "a"],
    ],
  },
  {
    name: "Kasbo",
    genre: "Melodic Bass",
    difficulty: "hard",
    questions: [
      ["Kasbo is a producer from which country?", ["Sweden", "Norway", "Denmark", "Finland"], "a"],
      ["Kasbo's music is most associated with which style, known for lush, emotive melodies?", ["Melodic bass / future bass", "Bluegrass", "Reggae", "Opera"], "a"],
      ["Kasbo has released music on record labels associated with the melodic electronic/future bass scene, including Foreign Family Collective.", ["True", "False", "Kasbo has never released on any label", "Kasbo exclusively releases classical symphonies"], "a"],
      ["Kasbo's real name is:", ["Kasper Sundberg", "Kasper Björke", "Kasbo Kasper", "Sundberg Kasbo"], "a"],
      ["Kasbo's sound blends atmospheric electronic production with emotionally rich, often wordless melodies.", ["True", "False", "Kasbo's sound is aggressive hardstyle with no melody", "Kasbo's sound is spoken-word only"], "a"],
      ["Kasbo has performed at festivals within the melodic bass and broader EDM circuit.", ["True", "False", "Kasbo has never performed at any festival", "Kasbo exclusively performs in a symphony orchestra"], "a"],
      ["Kasbo's music is often associated with a dreamy, cinematic quality that sets it apart from harder-edged bass music.", ["True", "False", "Kasbo's music is known for being harsh and abrasive", "Kasbo's music contains no melodic elements"], "a"],
    ],
  },
  {
    name: "it's murph",
    genre: "Bass / Electronic",
    difficulty: "hard",
    questions: [
      ["\"it's murph\" is an artist name stylized in lowercase, part of a newer generation of independent bass/electronic producers.", ["True", "False", "The name is always written in all capital letters", "The name has nothing to do with bass music"], "a"],
      ["\"it's murph\" is most associated with which broad genre space?", ["Bass / electronic music", "Bluegrass", "Opera", "Classical"], "a"],
      ["Artists like \"it's murph\" have typically built their audience largely through which modern promotional channel?", ["Online streaming and social platforms (SoundCloud, TikTok, Spotify)", "Exclusively vinyl record sales", "Radio jingles only", "Print magazine ads only"], "a"],
      ["\"it's murph\" has performed at festivals within the North American bass/EDM circuit alongside other contemporary producers.", ["True", "False", "This artist has never performed live", "This artist only performs at classical music halls"], "a"],
      ["The lowercase, stylized naming convention (like \"it's murph\") is a stylistic choice seen among several newer electronic artists.", ["True", "False", "No electronic artists use lowercase stylized names", "This is exclusive to country music artists"], "a"],
      ["\"it's murph\" fits within the broader melodic/future bass scene alongside artists producing similarly atmospheric electronic music.", ["True", "False", "This artist's music has no relation to bass music at all", "This artist exclusively produces death metal"], "a"],
      ["Emerging bass producers such as \"it's murph\" frequently release music independently or through boutique electronic labels rather than major labels.", ["True", "False", "All bass producers are signed to major pop labels", "Independent releases don't exist in electronic music"], "a"],
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
