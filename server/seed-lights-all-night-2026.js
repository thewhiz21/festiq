// One-time content seed for Lights All Night 2026 (Dec 30-31, 2026, Dallas,
// TX — EDM New Year's Eve festival). Creates the festival row and its
// 16-artist lineup, corner-anchored by difficulty (see seed-utils.js). For
// the least-known acts questions stick to genre/scene facts rather than
// invented specifics.
//
// Usage: node server/seed-lights-all-night-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "lights-all-night-2026";

const FESTIVAL = {
  name: "Lights All Night",
  location: "Dallas, TX",
  event_date: "Dec. 30–31, 2026",
  banner_color: "#c084fc",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "Tiësto",
    genre: "EDM / Progressive House",
    difficulty: "easy",
    questions: [
      ["Tiësto is a DJ/producer from which country?", ["The Netherlands", "Germany", "Belgium", "Sweden"], "a"],
      ["What is Tiësto's real name?", ["Tijs Verwest", "Tijs Tiësto", "Verwest Tijs Jr.", "Tijs Michielsen"], "a"],
      ["Tiësto famously performed at the opening ceremony of which 2004 global sporting event?", ["The Athens Olympics", "The Beijing Olympics", "The FIFA World Cup", "The Winter Olympics"], "a"],
      ["Tiësto won a Grammy Award for Best Remixed Recording for his remix of a song by:", ["John Legend", "Beyoncé", "Ed Sheeran", "Adele"], "a"],
      ["Tiësto's collaborative trance project, revived after years apart, is called \"Gouryella,\" alongside:", ["Ferry Corsten", "Armin van Buuren", "Paul van Dyk", "Above & Beyond"], "a"],
      ["Tiësto's music has evolved over his career from trance to more mainstream:", ["Progressive house / pop-EDM", "Bluegrass", "Opera", "Classical"], "a"],
      ["Tiësto topped DJ Mag's Top 100 DJs poll multiple times, largely in which decade?", ["2000s", "1980s", "2010s only", "2020s only"], "a"],
    ],
  },
  {
    name: "Chris Lake",
    genre: "Tech House",
    difficulty: "easy",
    questions: [
      ["Chris Lake is a DJ/producer from which country?", ["United Kingdom", "Netherlands", "Germany", "United States"], "a"],
      ["Chris Lake founded which influential tech house record label?", ["Black Book Records", "Anjunadeep", "Drumcode", "Defected Records"], "a"],
      ["Chris Lake's massive collaborative single with Green Velvet, \"Turn Off the Lights,\" was a huge tech house hit.", ["True", "False", "This song does not exist", "It was a collaboration with a country artist instead"], "a"],
      ["Chris Lake's music is most associated with which house subgenre?", ["Tech house", "Trance", "Dubstep", "Reggaeton"], "a"],
      ["Chris Lake's popular single \"Operator (Ring Ring)\" features vocals from:", ["Nastia", "Sia", "Ellie Goulding", "Katy Perry"], "a"],
      ["Chris Lake has collaborated frequently with fellow tech house artists including Fisher and:", ["Green Velvet", "David Guetta", "Skrillex", "Tiësto"], "a"],
      ["Chris Lake was originally more rooted in progressive house before moving toward tech house later in his career.", ["True", "False", "He started in dubstep exclusively", "He started in bluegrass exclusively"], "a"],
    ],
  },
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
    name: "Gryffin",
    genre: "Progressive House",
    difficulty: "easy",
    questions: [
      ["Gryffin's real name is:", ["Daniel Griffith", "Daniel Gryffin", "Griffith Daniel Jr.", "Dan Gryffindor"], "a"],
      ["Gryffin is from which U.S. state?", ["California", "New York", "Texas", "Florida"], "a"],
      ["Gryffin's breakout remix, which helped launch his career, was of a song by which pop star?", ["Sia (\"Cheap Thrills\" remix)", "Adele", "Taylor Swift", "Ariana Grande"], "a"],
      ["Gryffin's music is most associated with which house subgenre?", ["Progressive / melodic house", "Trap", "Dubstep", "Reggaeton"], "a"],
      ["Gryffin's collaborative single \"Whole Heart\" features vocals from:", ["Bipolar Sunshine", "Sia", "Katy Perry", "Ellie Goulding"], "a"],
      ["Gryffin attended which university before pursuing a full-time music career?", ["Duke University", "Harvard University", "MIT", "Stanford University"], "a"],
      ["Gryffin's stage name is inspired by which fictional source?", ["The Harry Potter house Gryffindor", "A Greek mythological creature", "A city in Norway", "A character from a video game he designed"], "a"],
    ],
  },
  {
    name: "KETTAMA",
    genre: "Tech House",
    difficulty: "medium",
    questions: [
      ["KETTAMA is a DJ/producer from which country?", ["Ireland", "United Kingdom", "Scotland", "Wales"], "a"],
      ["KETTAMA co-founded which tech house-focused record label/event brand?", ["6 Figure Grip", "Anjunadeep", "Drumcode", "Cocoon Recordings"], "a"],
      ["KETTAMA's music is most associated with which house subgenre?", ["Tech house", "Trance", "Dubstep", "Reggaeton"], "a"],
      ["KETTAMA has performed at major house/tech house-focused festival stages internationally.", ["True", "False", "He has never performed at any festival", "He exclusively performs acoustic sets"], "a"],
      ["KETTAMA is part of a wave of Irish/UK tech house artists who rose to global prominence in which decade?", ["2020s", "1990s", "1980s", "2000s"], "a"],
      ["KETTAMA's sound is known for groove-driven basslines and a raw, club-focused tech house style.", ["True", "False", "His sound is ambient and beatless", "His sound is centered on orchestral strings"], "a"],
      ["KETTAMA has collaborated with other prominent house/tech house artists within the scene.", ["True", "False", "He has never collaborated with another artist", "He only produces solo classical piano pieces"], "a"],
    ],
  },
  {
    name: "I Hate Models",
    genre: "Techno",
    difficulty: "medium",
    questions: [
      ["I Hate Models is a techno producer from which country?", ["France", "Germany", "Netherlands", "Belgium"], "a"],
      ["I Hate Models' music is most associated with which electronic genre?", ["Techno", "Trap", "Reggaeton", "Bluegrass"], "a"],
      ["I Hate Models is known for a driving, hard-edged techno style popular within the modern European techno scene.", ["True", "False", "His style is soft ambient lounge music", "His style is exclusively acoustic folk"], "a"],
      ["I Hate Models has performed at major techno-focused festivals and club events internationally.", ["True", "False", "He has never performed outside his home country", "He exclusively performs private house parties"], "a"],
      ["I Hate Models' name is a stylized artist alias rather than a reference to fashion modeling specifically as a literal statement.", ["True", "False", "The name has an official, publicly confirmed meaning about fashion models", "He has never explained or been asked about his name"], "a"],
      ["I Hate Models has released music through labels associated with the contemporary hard techno scene.", ["True", "False", "He has never released any music", "He only releases through major pop labels"], "a"],
      ["I Hate Models is part of a wave of French techno artists who gained international recognition in the streaming era.", ["True", "False", "He is not French", "France has no notable techno scene"], "a"],
    ],
  },
  {
    name: "William Black",
    genre: "Melodic Bass",
    difficulty: "medium",
    questions: [
      ["William Black is a producer from which U.S. state?", ["Colorado", "California", "Texas", "Florida"], "a"],
      ["William Black's music is most associated with which bass subgenre, known for emotional, melodic production?", ["Melodic bass / future bass", "Trance", "Deep house", "Reggaeton"], "a"],
      ["William Black has released music on labels within the melodic bass scene, including Kasbo's Above & Beyond-adjacent circuit label, Foreign Family Collective.", ["True", "False", "He has never released on any label", "He exclusively releases classical symphonies"], "a"],
      ["William Black's productions are known for lush, atmospheric melodies layered over bass-driven rhythms.", ["True", "False", "His productions are stripped of any melody", "His productions are purely a cappella"], "a"],
      ["William Black has performed at festivals within the melodic bass and broader EDM circuit.", ["True", "False", "He has never performed at any festival", "He exclusively performs in symphony halls"], "a"],
      ["William Black's sound is often grouped alongside other melodic/future bass artists like Seven Lions and Kasbo.", ["True", "False", "His sound has no relation to that scene", "He exclusively produces country music"], "a"],
      ["William Black's stage name uses his given first and middle/chosen name rather than a completely invented alias.", ["True", "False", "William Black is entirely unrelated to his real identity", "He has never revealed any personal details"], "a"],
    ],
  },
  {
    name: "Ninajirachi",
    genre: "Hyperpop / Bass",
    difficulty: "medium",
    questions: [
      ["Ninajirachi is a producer from which country?", ["Australia", "New Zealand", "United Kingdom", "Canada"], "a"],
      ["Ninajirachi's music blends bass and electronic production with influences from which internet-born genre?", ["Hyperpop", "Bluegrass", "Opera", "Classical"], "a"],
      ["Ninajirachi's stage name references \"Jirachi,\" a character from which video game franchise?", ["Pokémon", "The Legend of Zelda", "Mario", "Sonic the Hedgehog"], "a"],
      ["Ninajirachi has released music independently and through boutique labels within the modern bass/pop-adjacent scene.", ["True", "False", "She has never released any music", "She exclusively releases through a major country label"], "a"],
      ["Ninajirachi's production style blends glitchy, high-energy electronic elements with catchy melodic hooks.", ["True", "False", "Her style is entirely ambient with no melodic hooks", "Her style is traditional orchestral"], "a"],
      ["Ninajirachi has performed at festivals within the bass/electronic and pop-adjacent circuit.", ["True", "False", "She has never performed at any festival", "She exclusively performs acoustic guitar sets"], "a"],
      ["Ninajirachi is part of a younger generation of internet-native producers blending pop, bass, and hyperpop sensibilities.", ["True", "False", "She predates the internet-music era entirely", "She has no connection to online music communities"], "a"],
    ],
  },
  {
    name: "Telykast",
    genre: "Future Bass",
    difficulty: "medium",
    questions: [
      ["Telykast is a production duo from which country?", ["United Kingdom", "United States", "Australia", "Canada"], "a"],
      ["Telykast's music is most associated with which bass subgenre?", ["Future bass", "Trance", "Deep house", "Reggaeton"], "a"],
      ["Telykast has released music on major dance labels including Ultra Music and:", ["Astralwerks", "Def Jam", "Motown", "Atlantic Records"], "a"],
      ["Telykast's productions are known for bright, melodic drops within the future bass genre.", ["True", "False", "Their productions avoid melody entirely", "Their productions are strictly ambient drone"], "a"],
      ["Telykast has collaborated with vocalists on tracks blending pop songwriting with electronic production.", ["True", "False", "They have never worked with any vocalist", "They exclusively produce instrumental classical works"], "a"],
      ["Telykast has performed at festivals within the future bass and broader EDM circuit.", ["True", "False", "They have never performed at any festival", "They exclusively perform in orchestral settings"], "a"],
      ["Telykast is composed of how many members?", ["Two", "One", "Three", "Five"], "a"],
    ],
  },
  {
    name: "GG Magree",
    genre: "Bass / Vocalist-Producer",
    difficulty: "medium",
    questions: [
      ["GG Magree is known within the bass music scene both as a producer and as a:", ["Vocalist / singer", "Classical violinist", "Orchestra conductor", "Radio host only"], "a"],
      ["GG Magree has collaborated as a featured vocalist on tracks with major bass/dubstep producers.", ["True", "False", "She has never collaborated with any producer", "She exclusively performs a cappella with no producers"], "a"],
      ["GG Magree's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["GG Magree has performed at festivals within the North American bass music circuit.", ["True", "False", "She has never performed at any festival", "She exclusively performs private weddings"], "a"],
      ["GG Magree is known for blending soulful vocal performances with heavy electronic bass production.", ["True", "False", "Her vocal style is operatic classical only", "She never sings on her own tracks"], "a"],
      ["GG Magree has released music independently and through labels within the bass/EDM scene.", ["True", "False", "She has never released any music", "She only performs live with no recorded releases"], "a"],
      ["GG Magree's dual role as vocalist and producer is relatively distinctive within the bass music scene, which skews instrumental.", ["True", "False", "Most bass producers are also lead vocalists", "Vocal-producer hybrids are the majority in bass music"], "a"],
    ],
  },
  {
    name: "ATLiens",
    genre: "Dubstep",
    difficulty: "medium",
    questions: [
      ["ATLiens is a bass music duo formed in which U.S. city (reflected in their name)?", ["Atlanta, Georgia", "Austin, Texas", "Los Angeles, California", "Miami, Florida"], "a"],
      ["ATLiens' name is a nod to a classic album by which hip-hop group?", ["OutKast", "Migos", "Run the Jewels", "Goodie Mob"], "a"],
      ["ATLiens' music is most associated with which electronic subgenre?", ["Dubstep / bass music", "Trance", "Tropical house", "Salsa"], "a"],
      ["ATLiens has toured extensively on the U.S. bass music festival circuit, including festivals such as:", ["Lost Lands and EDC", "Stagecoach and CMA Fest", "Newport Folk Festival", "New Orleans Jazz Fest"], "a"],
      ["ATLiens' sound draws on deep bass and dubstep, often featuring:", ["Heavy sub-bass drops", "Acoustic ballads", "Orchestral arrangements", "Bluegrass banjo"], "a"],
      ["ATLiens is composed of how many core members?", ["Two", "One", "Three", "Four"], "a"],
      ["ATLiens has released music on bass-focused labels within the broader dubstep/bass music scene.", ["True", "False", "They release exclusively on major pop labels", "They have never released recorded music"], "a"],
    ],
  },
  {
    name: "ARMNHMR",
    genre: "Melodic Bass",
    difficulty: "medium",
    questions: [
      ["ARMNHMR is a production duo from which country?", ["United States", "United Kingdom", "Canada", "Australia"], "a"],
["ARMNHMR's name is stylized without vowels, a naming convention shared by several other modern bass/dubstep acts.", ["True", "False", "ARMNHMR is the only artist to ever use this naming style", "The name is spelled out with every vowel included"], "a"],
      ["ARMNHMR's music is most associated with which bass subgenre?", ["Melodic bass / future bass", "Trance", "Deep house", "Reggaeton"], "a"],
      ["ARMNHMR has released music on record labels within the melodic bass and dubstep scene.", ["True", "False", "They have never released any music", "They only release classical symphonies"], "a"],
      ["ARMNHMR is composed of two members who often blend emotional storytelling with heavy bass drops in their tracks.", ["True", "False", "ARMNHMR is a solo project", "ARMNHMR has five members"], "a"],
      ["ARMNHMR has performed at major bass music festivals within the North American EDM circuit.", ["True", "False", "They have never performed at any festival", "They exclusively perform acoustic sets"], "a"],
      ["ARMNHMR's productions often combine cinematic builds with heavy dubstep-style bass drops.", ["True", "False", "Their productions avoid bass entirely", "Their productions are purely a cappella"], "a"],
    ],
  },
  {
    name: "WTCHCRFT",
    genre: "Dubstep",
    difficulty: "hard",
    questions: [
      ["WTCHCRFT is a producer within the modern dubstep/bass music scene, with a name stylized without vowels — a common naming trend among newer bass artists.", ["True", "False", "The name is spelled with all vowels included", "This naming style is unique to WTCHCRFT and no other artist"], "a"],
      ["WTCHCRFT's music is most associated with which genre?", ["Dubstep / bass music", "Bluegrass", "Opera", "Classical"], "a"],
      ["WTCHCRFT has performed at festivals within the North American bass music circuit.", ["True", "False", "WTCHCRFT has never performed at any festival", "WTCHCRFT exclusively performs classical piano recitals"], "a"],
      ["WTCHCRFT's productions fit within the heavier, riddim-influenced side of contemporary dubstep.", ["True", "False", "The productions are smooth jazz", "The productions contain no bass elements"], "a"],
      ["WTCHCRFT has released music through labels and platforms associated with the underground bass music scene.", ["True", "False", "WTCHCRFT has never released any music", "WTCHCRFT only releases through country music labels"], "a"],
      ["Emerging artists like WTCHCRFT typically build their following through online bass music communities and festival support slots.", ["True", "False", "All bass artists are discovered exclusively through television talent shows", "Online platforms have no role in bass music discovery"], "a"],
      ["WTCHCRFT fits within a wave of newer riddim/dubstep producers gaining traction on the U.S. festival circuit.", ["True", "False", "WTCHCRFT predates the dubstep genre entirely", "WTCHCRFT has no ties to the dubstep scene"], "a"],
    ],
  },
  {
    name: "Skull Machine",
    genre: "Bass (Black Tiger Sex Machine x Kai Wachi)",
    difficulty: "hard",
    questions: [
      ["Skull Machine is a collaborative bass music project combining Black Tiger Sex Machine with which fellow producer?", ["Kai Wachi", "Excision", "Marshmello", "Subtronics"], "a"],
      ["Skull Machine's music is most associated with which genre?", ["Bass music / dubstep", "Bluegrass", "Opera", "Classical"], "a"],
      ["Skull Machine's name blends visual/thematic elements from both contributing artists' branding.", ["True", "False", "The name has no connection to either artist's branding", "The project has never released any music"], "a"],
      ["Skull Machine has performed at bass music festivals as a collaborative live act.", ["True", "False", "The project has never performed live", "The project exclusively performs acoustic sets"], "a"],
      ["Skull Machine's sound blends heavy, aggressive bass drops consistent with both contributing artists' individual styles.", ["True", "False", "The sound is soft ambient lounge music", "The sound is exclusively orchestral"], "a"],
      ["Collaborative aliases like Skull Machine are common in the bass music scene as a way for two artists to release joint material.", ["True", "False", "Collaborative aliases are unheard of in electronic music", "Skull Machine is the only collaborative alias in bass music history"], "a"],
      ["Skull Machine's releases are distributed through labels associated with the contemporary bass/dubstep scene.", ["True", "False", "The project has never released any recorded music", "The project only releases through classical music labels"], "a"],
    ],
  },
  {
    name: "Sidequest",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["Sidequest is a producer within the modern bass music scene, with a name referencing a common term from which medium?", ["Video games (a \"side quest\")", "Classical literature", "Culinary arts", "Fashion design"], "a"],
      ["Sidequest's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["Sidequest has performed at festivals within the bass/EDM circuit alongside other contemporary producers.", ["True", "False", "Sidequest has never performed at any festival", "Sidequest exclusively performs in symphony halls"], "a"],
      ["Sidequest's productions are generally rooted in heavy, bass-forward electronic music.", ["True", "False", "Sidequest's productions are entirely acoustic folk", "Sidequest's productions contain no bass elements"], "a"],
      ["Sidequest has released music through platforms and labels associated with the underground/independent bass scene.", ["True", "False", "Sidequest has never released any music", "Sidequest only releases through major country labels"], "a"],
      ["Newer bass producers like Sidequest often build recognition through festival support slots and online streaming platforms.", ["True", "False", "Recognition in bass music comes exclusively from television appearances", "Streaming platforms play no role in an artist's rise"], "a"],
      ["Sidequest fits within the broader wave of contemporary bass music artists on the U.S. festival circuit.", ["True", "False", "Sidequest predates the existence of bass music as a genre", "Sidequest has no ties to the bass music scene"], "a"],
    ],
  },
  {
    name: "HHUNTER",
    genre: "Bass",
    difficulty: "hard",
    questions: [
      ["HHUNTER is a producer within the modern bass music scene, with a stylized name emphasizing a double letter, a common trend among newer artists.", ["True", "False", "The name contains no repeated letters", "This naming trend is unique to classical musicians"], "a"],
      ["HHUNTER's music is most associated with which broad genre?", ["Bass music / electronic", "Bluegrass", "Opera", "Classical"], "a"],
      ["HHUNTER has performed at festivals and events within the contemporary bass/EDM circuit.", ["True", "False", "HHUNTER has never performed at any event", "HHUNTER exclusively performs acoustic sets"], "a"],
      ["HHUNTER's productions are generally rooted in heavy, electronic bass-forward music.", ["True", "False", "HHUNTER's productions are entirely orchestral", "HHUNTER's productions contain no electronic elements"], "a"],
      ["HHUNTER has released music through platforms and labels associated with the independent/underground bass scene.", ["True", "False", "HHUNTER has never released any music", "HHUNTER only releases through major country labels"], "a"],
      ["Newer bass producers like HHUNTER often gain recognition through festival support slots and streaming/social platforms.", ["True", "False", "Recognition in bass music comes exclusively from print media", "Streaming platforms play no role in an artist's rise"], "a"],
      ["HHUNTER fits within the broader wave of contemporary bass music artists appearing on U.S. festival lineups.", ["True", "False", "HHUNTER predates the existence of bass music as a genre", "HHUNTER has no ties to the bass music scene"], "a"],
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
