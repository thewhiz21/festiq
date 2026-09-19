// One-time content seed for HiJinx Festival 2026 (Dec 30-31, 2026,
// Philadelphia, PA — bass/dubstep New Year's Eve festival). Creates the
// festival row and its 16-artist lineup, corner-anchored by difficulty (see
// seed-utils.js). For the least-known acts questions stick to genre/scene
// facts rather than invented specifics.
//
// Usage: node server/seed-hijinx-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "hijinx-2026";

const FESTIVAL = {
  name: "HiJinx Festival",
  location: "Philadelphia, PA",
  event_date: "Dec. 30–31, 2026",
  banner_color: "#ff9d3d",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "Subtronics",
    genre: "Dubstep",
    difficulty: "easy",
    questions: [
      ["Subtronics is a dubstep producer from which U.S. state?", ["Florida", "California", "Colorado", "Texas"], "a"],
      ["Subtronics' real name is:", ["Jesse Kardon", "Jesse Subtronics", "Kardon Jesse Jr.", "Jesse Anderson"], "a"],
      ["Subtronics founded which annual bass music festival, held in Florida?", ["Cyclops Cove", "Lost Lands", "HiJinx", "Bass Canyon"], "a"],
      ["Subtronics is known for a distinctive stage prop resembling giant, glowing eyes as part of his live show branding.", ["True", "False", "His stage prop is a giant dragon", "He performs with no visual stage production"], "a"],
      ["Subtronics' music is most associated with which heavy bass genre?", ["Dubstep", "Trance", "Deep house", "Tropical house"], "a"],
      ["Subtronics has frequently collaborated with fellow dubstep artist Wooli, including performing joint back-to-back sets.", ["True", "False", "He has never collaborated with Wooli", "He exclusively performs classical piano"], "a"],
      ["Subtronics is signed to Excision's record label, called:", ["Subsidia Records", "Never Say Die", "OWSLA", "Circus Records"], "a"],
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
      ["Excision is known for elaborate stage production, including large-scale robotic and skull-themed visual elements.", ["True", "False", "He performs with no visual stage production", "His stage design is a simple acoustic setup"], "a"],
      ["Excision has collaborated frequently with fellow dubstep artist Downlink and others under various group projects.", ["True", "False", "He has never collaborated with anyone", "He only performs classical music"], "a"],
    ],
  },
  {
    name: "Wooli",
    genre: "Dubstep",
    difficulty: "easy",
    questions: [
      ["Wooli is a dubstep producer from which U.S. state?", ["Colorado", "California", "Texas", "Florida"], "a"],
      ["Wooli's music is most associated with which electronic subgenre?", ["Dubstep / riddim", "Trance", "Deep house", "Tropical house"], "a"],
      ["Wooli has frequently collaborated and toured alongside which fellow dubstep artist, appearing together at major bass festivals?", ["Crankdat", "David Guetta", "Kaskade", "Tiësto"], "a"],
      ["Wooli's rise came largely through the underground bass/dubstep scene circuit, including festivals like:", ["Lost Lands", "Stagecoach", "CMA Fest", "Coachella's main stage exclusively"], "a"],
      ["Wooli's production style is known for heavy use of:", ["Distorted bass drops", "Acoustic guitar", "Orchestral strings", "A cappella vocals"], "a"],
      ["Wooli has released music through the record label owned by Excision, called:", ["Subsidia Records", "Dim Mak", "OWSLA", "Never Say Die"], "a"],
      ["Wooli is part of the broader U.S. bass/dubstep touring circuit that overlaps heavily with festivals such as EDC and:", ["HiJinx and Lost Lands", "Stagecoach and CMA Fest", "Newport Folk Festival", "New Orleans Jazz Fest"], "a"],
    ],
  },
  {
    name: "Tape B",
    genre: "Dubstep / Bass",
    difficulty: "easy",
    questions: [
      ["Tape B is a bass music producer from which country?", ["United States", "United Kingdom", "Canada", "Australia"], "a"],
      ["Tape B's music is most associated with which broad bass genre?", ["Dubstep / bass music", "Trance", "Deep house", "Reggaeton"], "a"],
      ["Tape B has released music on labels associated with the modern bass music scene, including collaborations circulated widely online.", ["True", "False", "He has never released any music", "He exclusively releases classical symphonies"], "a"],
      ["Tape B is known for tracks that blend heavy bass drops with catchy, meme-friendly online virality within the bass scene.", ["True", "False", "His tracks have never gained any online attention", "He refuses to release music digitally"], "a"],
      ["Tape B has performed at major U.S. bass music festivals as part of the touring dubstep circuit.", ["True", "False", "He has never performed at any festival", "He exclusively performs acoustic shows"], "a"],
      ["Tape B's productions are generally characterized by aggressive, high-energy bass drops.", ["True", "False", "His productions are ambient and beatless", "His productions are orchestral only"], "a"],
      ["Tape B is part of the contemporary wave of U.S. bass producers who built an audience through online platforms.", ["True", "False", "He predates the internet music era entirely", "He has no online presence"], "a"],
    ],
  },
  {
    name: "Ray Volpe",
    genre: "Dubstep",
    difficulty: "medium",
    questions: [
      ["Ray Volpe is a dubstep producer from which U.S. state?", ["Pennsylvania", "California", "Texas", "Florida"], "a"],
      ["Ray Volpe's music is most associated with which electronic subgenre?", ["Dubstep / melodic bass", "Trance", "Deep house", "Reggaeton"], "a"],
      ["Ray Volpe has performed at major U.S. bass music festivals including EDC and Lost Lands.", ["True", "False", "He has never performed at any festival", "He exclusively performs acoustic sets"], "a"],
      ["Ray Volpe's productions are known for blending heavy dubstep bass with melodic, anime-influenced aesthetics in visuals and branding.", ["True", "False", "His visuals avoid any anime or melodic influence", "He performs with no visual branding at all"], "a"],
      ["Ray Volpe has released music on record labels within the bass and dubstep scene.", ["True", "False", "He has never released any music", "He only releases through country music labels"], "a"],
      ["Ray Volpe rose to prominence significantly through online platforms and festival support slots in which decade?", ["2020s", "1990s", "1980s", "2000s"], "a"],
      ["Ray Volpe has collaborated with other bass producers within the contemporary dubstep scene.", ["True", "False", "He has never collaborated with another producer", "He only produces classical piano covers"], "a"],
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
    name: "Dabin",
    genre: "Melodic Dubstep",
    difficulty: "medium",
    questions: [
      ["Dabin is a producer from which country?", ["Canada", "United States", "United Kingdom", "Australia"], "a"],
      ["Dabin's music is most associated with which style, known for combining live guitar with bass music production?", ["Melodic dubstep", "Trance", "Deep house", "Reggaeton"], "a"],
      ["Dabin is known for incorporating live guitar playing into his electronic productions and live performances.", ["True", "False", "He never plays a live instrument", "He performs exclusively a cappella"], "a"],
      ["Dabin has released music on record labels within the melodic bass scene, including collaborations with artists like Seven Lions.", ["True", "False", "He has never collaborated with any artist", "He only releases classical guitar solos"], "a"],
      ["Dabin's productions are known for combining emotional, melodic songwriting with heavier bass drops.", ["True", "False", "His productions have no melodic elements", "His productions are purely spoken word"], "a"],
      ["Dabin has performed at festivals within the melodic bass and broader EDM circuit, including Dreamstate and EDC.", ["True", "False", "He has never performed at any festival", "He exclusively performs in symphony halls"], "a"],
      ["Dabin's sound is often grouped alongside other melodic bass artists producing emotionally driven dubstep.", ["True", "False", "His sound has no relation to melodic bass at all", "He exclusively produces death metal"], "a"],
    ],
  },
  {
    name: "TroyBoi",
    genre: "Trap / Bass",
    difficulty: "medium",
    questions: [
      ["TroyBoi is a producer from which country?", ["England", "United States", "Jamaica", "Canada"], "a"],
      ["TroyBoi's production style blends trap and bass music with influences from which other genre?", ["Grime / UK bass music", "Bluegrass", "Opera", "Salsa"], "a"],
      ["TroyBoi's breakout track, widely circulated in the mid-2010s bass scene, is titled:", ["Do You...?", "Afterparty", "Rager", "Mantra"], "a"],
      ["TroyBoi has collaborated with major hip-hop/pop artists as a producer.", ["True", "False", "He has never produced for any vocalist", "He exclusively produces classical works"], "a"],
      ["TroyBoi's sound is frequently described as a fusion of bass music with trap and:", ["Global/world music influences", "Bluegrass fusion", "Baroque pop", "Yacht rock"], "a"],
      ["TroyBoi released a project titled \"V!BEZ\" as part of an ongoing EP series.", ["True", "False", "It doesn't exist", "It was a full-length rock album"], "a"],
      ["TroyBoi has performed at major bass-focused festivals including which Las Vegas-based EDM festival?", ["EDC Las Vegas", "Stagecoach", "Life Is Beautiful", "CMA Fest"], "a"],
    ],
  },
  {
    name: "Moore Kismet",
    genre: "Bass / EDM",
    difficulty: "medium",
    questions: [
      ["Moore Kismet is a bass music producer from which U.S. state?", ["Maryland", "California", "Texas", "Florida"], "a"],
      ["Moore Kismet gained early recognition for beginning their music career at a notably young age, becoming one of the youngest artists to perform at major EDM festivals.", ["True", "False", "Moore Kismet began their career after age 40", "Moore Kismet has never performed at a festival"], "a"],
      ["Moore Kismet's music is most associated with which broad genre?", ["Bass music / dubstep", "Bluegrass", "Opera", "Classical"], "a"],
      ["Moore Kismet has been openly nonbinary and has spoken publicly about representation in the electronic music scene.", ["True", "False", "Moore Kismet has never discussed identity publicly", "Moore Kismet avoids all public statements"], "a"],
      ["Moore Kismet has released music on labels within the bass/dubstep scene and performed at major U.S. festivals.", ["True", "False", "Moore Kismet has never released any music", "Moore Kismet only performs private events"], "a"],
      ["Moore Kismet's productions are known for blending intricate sound design with heavy bass elements.", ["True", "False", "Moore Kismet's productions avoid bass entirely", "Moore Kismet only produces acoustic folk"], "a"],
      ["Moore Kismet has been recognized within the industry as one of the prominent younger voices in modern bass music.", ["True", "False", "Moore Kismet has received no industry recognition", "Moore Kismet is considered a veteran from the 1990s scene"], "a"],
    ],
  },
  {
    name: "DJ Diesel",
    genre: "Bass (Shaquille O'Neal's DJ persona)",
    difficulty: "medium",
    questions: [
      ["DJ Diesel is the DJ persona of which famous retired NBA player?", ["Shaquille O'Neal", "LeBron James", "Kobe Bryant", "Michael Jordan"], "a"],
      ["DJ Diesel's music is most associated with which heavy electronic genre?", ["Bass music / dubstep", "Bluegrass", "Opera", "Classical"], "a"],
      ["DJ Diesel has performed at major EDM and bass festivals, including collaborative sets with dubstep artists like Deorro.", ["True", "False", "DJ Diesel has never performed publicly", "DJ Diesel only performs classical piano"], "a"],
      ["Shaquille O'Neal's nickname \"Diesel\" predates his DJ career, originally referencing his powerful playing style on the basketball court.", ["True", "False", "The nickname was invented specifically for his DJ persona", "Shaquille O'Neal has never been called \"Diesel\""], "a"],
      ["DJ Diesel released an album showcasing his work as a producer/DJ in the bass music space.", ["True", "False", "DJ Diesel has never released any music", "DJ Diesel only performs live with no recordings"], "a"],
      ["DJ Diesel has collaborated with electronic artists including Lil Jon on bass-driven tracks.", ["True", "False", "DJ Diesel has never collaborated with any artist", "DJ Diesel exclusively performs solo"], "a"],
      ["Shaquille O'Neal, as DJ Diesel, is known for headlining sets at major EDM festivals despite his primary fame coming from professional basketball.", ["True", "False", "He has never headlined any set", "He is primarily known as a musician, not a basketball player"], "a"],
    ],
  },
  {
    name: "Level Up",
    genre: "Bass",
    difficulty: "medium",
    questions: [
      ["Level Up is a bass music producer whose stage name references a common term from which medium?", ["Video games", "Classical literature", "Culinary arts", "Fashion design"], "a"],
      ["Level Up's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["Level Up has performed at festivals within the bass/EDM circuit alongside other contemporary producers.", ["True", "False", "Level Up has never performed at any festival", "Level Up exclusively performs in symphony halls"], "a"],
      ["Level Up's productions are generally rooted in heavy, bass-forward electronic music.", ["True", "False", "Level Up's productions are entirely acoustic folk", "Level Up's productions contain no bass elements"], "a"],
      ["Level Up has released music through platforms and labels associated with the underground/independent bass scene.", ["True", "False", "Level Up has never released any music", "Level Up only releases through major country labels"], "a"],
      ["Newer bass producers like Level Up often build recognition through festival support slots and online streaming platforms.", ["True", "False", "Recognition in bass music comes exclusively from television appearances", "Streaming platforms play no role in an artist's rise"], "a"],
      ["Level Up fits within the broader wave of contemporary bass music artists on the U.S. festival circuit.", ["True", "False", "Level Up predates the existence of bass music as a genre", "Level Up has no ties to the bass music scene"], "a"],
    ],
  },
  {
    name: "INZO",
    genre: "Melodic Bass",
    difficulty: "medium",
    questions: [
      ["INZO is a producer known for blending bass music with which cinematic/atmospheric quality?", ["Ambient, film-score-like textures", "Bluegrass banjo picking", "A cappella gospel", "Traditional mariachi"], "a"],
      ["INZO's breakout track, widely circulated in the bass music scene for its ambient buildup, is titled:", ["Overworld", "Rager", "Do You...?", "Afterparty"], "a"],
      ["INZO's music is most associated with which broad genre?", ["Melodic bass / dubstep", "Bluegrass", "Opera", "Classical"], "a"],
      ["INZO has performed at major bass/EDM festivals within the U.S. touring circuit.", ["True", "False", "INZO has never performed at any festival", "INZO exclusively performs classical recitals"], "a"],
      ["INZO's productions are known for combining atmospheric intros with heavier bass drops later in tracks.", ["True", "False", "INZO's productions never build or change intensity", "INZO's productions are purely spoken word"], "a"],
      ["INZO has released music through labels and platforms associated with the melodic bass scene.", ["True", "False", "INZO has never released any music", "INZO only releases through country labels"], "a"],
      ["INZO is recognized within the bass scene for a distinctive, cinematic approach to sound design.", ["True", "False", "INZO's sound design is considered generic and indistinct", "INZO has no recognizable style"], "a"],
    ],
  },
  {
    name: "Mary Droppinz",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["Mary Droppinz is a producer within the modern bass music scene, with a stage name playing on the phrase \"dropping\" a bass drop.", ["True", "False", "The name has no connection to bass music terminology", "The name references a classical composer"], "a"],
      ["Mary Droppinz's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["Mary Droppinz has performed at festivals and events within the contemporary bass/EDM circuit.", ["True", "False", "Mary Droppinz has never performed at any event", "Mary Droppinz exclusively performs acoustic sets"], "a"],
      ["Mary Droppinz's productions are generally rooted in heavy, electronic bass-forward music.", ["True", "False", "Mary Droppinz's productions are entirely orchestral", "Mary Droppinz's productions contain no electronic elements"], "a"],
      ["Mary Droppinz has released music through platforms and labels associated with the independent/underground bass scene.", ["True", "False", "Mary Droppinz has never released any music", "Mary Droppinz only releases through major country labels"], "a"],
      ["Newer bass producers like Mary Droppinz often gain recognition through festival support slots and streaming/social platforms.", ["True", "False", "Recognition in bass music comes exclusively from print media", "Streaming platforms play no role in an artist's rise"], "a"],
      ["Mary Droppinz fits within the broader wave of contemporary bass music artists appearing on U.S. festival lineups.", ["True", "False", "Mary Droppinz predates the existence of bass music as a genre", "Mary Droppinz has no ties to the bass music scene"], "a"],
    ],
  },
  {
    name: "CALCIUM",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["CALCIUM is a producer within the modern bass music scene, with a stage name referencing an element/mineral rather than a personal name.", ["True", "False", "The name references a mythological figure", "The name is a play on a classical composer's surname"], "a"],
      ["CALCIUM's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["CALCIUM has performed at festivals and events within the contemporary bass/EDM circuit.", ["True", "False", "CALCIUM has never performed at any event", "CALCIUM exclusively performs acoustic sets"], "a"],
      ["CALCIUM's productions are generally rooted in heavy, electronic bass-forward music.", ["True", "False", "CALCIUM's productions are entirely orchestral", "CALCIUM's productions contain no electronic elements"], "a"],
      ["CALCIUM has released music through platforms and labels associated with the independent/underground bass scene.", ["True", "False", "CALCIUM has never released any music", "CALCIUM only releases through major country labels"], "a"],
      ["Newer bass producers like CALCIUM often gain recognition through festival support slots and streaming/social platforms.", ["True", "False", "Recognition in bass music comes exclusively from print media", "Streaming platforms play no role in an artist's rise"], "a"],
      ["CALCIUM fits within the broader wave of contemporary bass music artists appearing on U.S. festival lineups.", ["True", "False", "CALCIUM predates the existence of bass music as a genre", "CALCIUM has no ties to the bass music scene"], "a"],
    ],
  },
  {
    name: "Brainrack",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["Brainrack is a producer within the modern bass music scene, with a stage name evoking intense, high-energy branding common in the genre.", ["True", "False", "The name is a reference to a classical symphony", "The name is a chain of restaurants"], "a"],
      ["Brainrack's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["Brainrack has performed at festivals and events within the contemporary bass/EDM circuit.", ["True", "False", "Brainrack has never performed at any event", "Brainrack exclusively performs acoustic sets"], "a"],
      ["Brainrack's productions are generally rooted in heavy, electronic bass-forward music.", ["True", "False", "Brainrack's productions are entirely orchestral", "Brainrack's productions contain no electronic elements"], "a"],
      ["Brainrack has released music through platforms and labels associated with the independent/underground bass scene.", ["True", "False", "Brainrack has never released any music", "Brainrack only releases through major country labels"], "a"],
      ["Newer bass producers like Brainrack often gain recognition through festival support slots and streaming/social platforms.", ["True", "False", "Recognition in bass music comes exclusively from print media", "Streaming platforms play no role in an artist's rise"], "a"],
      ["Brainrack fits within the broader wave of contemporary bass music artists appearing on U.S. festival lineups.", ["True", "False", "Brainrack predates the existence of bass music as a genre", "Brainrack has no ties to the bass music scene"], "a"],
    ],
  },
  {
    name: "Rad Cat",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["Rad Cat is a producer within the modern bass music scene, with a playful, animal-referencing stage name.", ["True", "False", "The name has no connection to any animal reference", "The name is a reference to a classical ballet"], "a"],
      ["Rad Cat's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["Rad Cat has performed at festivals and events within the contemporary bass/EDM circuit.", ["True", "False", "Rad Cat has never performed at any event", "Rad Cat exclusively performs acoustic sets"], "a"],
      ["Rad Cat's productions are generally rooted in heavy, electronic bass-forward music.", ["True", "False", "Rad Cat's productions are entirely orchestral", "Rad Cat's productions contain no electronic elements"], "a"],
      ["Rad Cat has released music through platforms and labels associated with the independent/underground bass scene.", ["True", "False", "Rad Cat has never released any music", "Rad Cat only releases through major country labels"], "a"],
      ["Newer bass producers like Rad Cat often gain recognition through festival support slots and streaming/social platforms.", ["True", "False", "Recognition in bass music comes exclusively from print media", "Streaming platforms play no role in an artist's rise"], "a"],
      ["Rad Cat fits within the broader wave of contemporary bass music artists appearing on U.S. festival lineups.", ["True", "False", "Rad Cat predates the existence of bass music as a genre", "Rad Cat has no ties to the bass music scene"], "a"],
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
