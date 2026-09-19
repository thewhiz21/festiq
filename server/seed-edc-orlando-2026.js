// One-time content seed for EDC Orlando 2026 (Nov 6-8, 2026, Orlando, FL).
// Creates the festival row (doesn't exist yet) and its 16-artist lineup,
// corner-anchored by difficulty (see seed-utils.js): the 4 biggest
// headliners sit in the board's four corners, the next tier fills the outer
// edge, and the hardest/least-known acts land in the dead center.
//
// Usage: node server/seed-edc-orlando-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "edc-orlando-2026";

const FESTIVAL = {
  name: "EDC Orlando",
  location: "Orlando, FL",
  event_date: "Nov. 6–8, 2026",
  banner_color: "#4da6ff",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

// Order below is intentional: index 0 is the corner headliner with the
// easiest trivia, index 15 is the center-of-the-board hardest act.
const LINEUP = [
  {
    name: "David Guetta",
    genre: "Progressive House",
    difficulty: "easy",
    questions: [
      ["David Guetta is a globally famous DJ/producer originally from which country?", ["France", "Germany", "Netherlands", "Belgium"], "a"],
      ["Which 2009 David Guetta single featuring Kelly Rowland and Akon became a worldwide No. 1 hit?", ["When Love Takes Over", "Titanium", "Sexy Bitch", "Memories"], "a"],
      ["David Guetta's massive 2011 single \"Titanium\" features vocals from:", ["Sia", "Rihanna", "Kelly Rowland", "Nicki Minaj"], "a"],
      ["David Guetta has won multiple Grammy Awards, including for Best Dance Recording for:", ["\"When Love Takes Over\"", "\"Titanium\"", "\"Sexy Bitch\"", "\"Memories\""], "a"],
      ["David Guetta's alter-ego / alternate persona used for a more underground techno sound is called:", ["Jack Back", "MORTEN", "Gesaffelstein", "Boys Noize"], "a"],
      ["David Guetta co-produced the global smash \"I Gotta Feeling\" for which group?", ["The Black Eyed Peas", "Maroon 5", "Coldplay", "Imagine Dragons"], "a"],
      ["David Guetta's music is most associated with which genre?", ["Progressive house / EDM", "Bluegrass", "Reggae", "Death metal"], "a"],
    ],
  },
  {
    name: "Martin Garrix",
    genre: "Big Room EDM",
    difficulty: "easy",
    questions: [
      ["Martin Garrix is a DJ/producer from which country?", ["The Netherlands", "Sweden", "Germany", "Belgium"], "a"],
      ["Martin Garrix's breakout 2013 single that became a huge EDM anthem is titled:", ["Animals", "Tremor", "In the Name of Love", "Scared to Be Lonely"], "a"],
      ["At what age did Martin Garrix first top DJ Mag's Top 100 DJs poll?", ["19", "25", "16", "30"], "a"],
      ["Martin Garrix's 2016 collaboration with Bebe Rexha, \"In the Name of Love,\" became a major pop crossover hit.", ["True", "False", "It was never released", "It was a collaboration with Dua Lipa instead"], "a"],
      ["Martin Garrix owns which record label, home to acts like Julian Jordan and Brooks?", ["STMPD RCRDS", "Spinnin' Records", "Anjunabeats", "Monstercat"], "a"],
      ["Martin Garrix co-wrote the official 2016 UEFA Champions League anthem remix alongside which artists?", ["Dimitri Vegas & Like Mike and Like Mike", "Tiësto and Hardwell", "Zedd and Alesso", "Kygo and Avicii"], "a"],
      ["Martin Garrix has topped DJ Mag's Top 100 DJs poll a record number of times, including consecutive years.", ["True", "False", "He has never won", "Only once, in 2013"], "a"],
    ],
  },
  {
    name: "Hardwell",
    genre: "Big Room EDM",
    difficulty: "easy",
    questions: [
      ["What is Hardwell's real name?", ["Robbert van de Corput", "Robbert Hardwell", "Robbin van Persie", "Rick van de Corput"], "a"],
      ["Hardwell is a DJ/producer from which country?", ["The Netherlands", "Sweden", "Belgium", "Germany"], "a"],
      ["Hardwell topped DJ Mag's Top 100 DJs poll in which two consecutive years?", ["2013 and 2014", "2010 and 2011", "2016 and 2017", "2018 and 2019"], "a"],
      ["Hardwell's breakout collaborative anthem with Tiësto is titled:", ["Zero 76", "Spaceman", "Apollo", "Dare You"], "a"],
      ["Hardwell's huge solo hit \"Spaceman\" was released in which year?", ["2012", "2008", "2015", "2010"], "a"],
      ["Hardwell owns which record label?", ["Revealed Recordings", "STMPD RCRDS", "Spinnin' Records", "Musical Freedom"], "a"],
      ["Hardwell announced a temporary retirement from touring in which year, before later returning?", ["2016", "2013", "2020", "2018"], "a"],
    ],
  },
  {
    name: "Kaskade",
    genre: "Progressive House",
    difficulty: "easy",
    questions: [
      ["What is Kaskade's real name?", ["Ryan Raddon", "Ryan Kaskade", "Ryan Tedder", "Kyle Raddon"], "a"],
      ["Kaskade is a DJ/producer from which country?", ["United States", "Canada", "Netherlands", "Sweden"], "a"],
      ["Kaskade won a Grammy Award for Best Remixed Recording for his remix of a song by:", ["Deadmau5", "Zedd", "Avicii", "Calvin Harris"], "a"],
      ["Kaskade's music is most closely associated with which house subgenre?", ["Progressive house", "Dubstep", "Trap", "Drum & bass"], "a"],
      ["Kaskade's popular collaborative single with deadmau5 is titled:", ["Move for Me", "Ghosts 'n' Stuff", "Strobe", "I Remember"], "a"],
      ["Kaskade has headlined the Coachella and EDC festival circuits and is based out of which U.S. state?", ["California", "Nevada", "Florida", "New York"], "a"],
      ["Kaskade's 2018 collaboration \"Disarm You\" features vocals from:", ["Ilsey", "Skylar Grey", "Haley", "Meghan Trainor"], "a"],
    ],
  },
  {
    name: "Steve Aoki",
    genre: "EDM / Electro House",
    difficulty: "medium",
    questions: [
      ["Steve Aoki is well known for a signature stage stunt involving throwing what into the crowd?", ["Cakes", "Confetti cannons", "T-shirts", "Water balloons"], "a"],
      ["Steve Aoki founded which record label, home to early acts like The Bloody Beetroots?", ["Dim Mak Records", "Mad Decent", "OWSLA", "Ultra Records"], "a"],
      ["Steve Aoki's father, Rocky Aoki, founded which restaurant chain?", ["Benihana", "P.F. Chang's", "Nobu", "Wagamama"], "a"],
      ["Steve Aoki's collaborative single \"Boneless\" features which two rappers?", ["Waka Flocka Flame and Lil Jon", "Migos and Travis Scott", "Kendrick Lamar and 2 Chainz", "Lil Wayne and Chief Keef"], "a"],
      ["Steve Aoki has been nominated for multiple Grammy Awards, primarily in which category?", ["Best Dance/Electronic Album", "Best Rock Album", "Best Country Album", "Best R&B Album"], "a"],
      ["Steve Aoki's popular collaboration with Louis Tomlinson (of One Direction) is titled:", ["Just Hold On", "Wild Hearts", "Livin' My Best Life", "Delirious"], "a"],
      ["Steve Aoki's genre is often described as a mix of EDM with which rock-adjacent style, reflecting his early career in DIY punk?", ["Electro house with punk/DIY roots", "Classical crossover", "Country", "Smooth jazz"], "a"],
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
    name: "SLANDER",
    genre: "Melodic Dubstep",
    difficulty: "medium",
    questions: [
      ["SLANDER is a duo made up of which two producers?", ["Derek Andersen and Scott Land", "Derek Andersen and Marcus Andersen", "Scott Land and Josh Ramsay", "Derek Andersen and Kevin Gould"], "a"],
      ["SLANDER's music is best described as a melodic style within which broader genre?", ["Dubstep / bass music", "Trance", "Reggaeton", "Country"], "a"],
      ["SLANDER co-founded which touring festival brand centered on uplifting, melodic bass music?", ["Heaven & Hell", "Dreamstate", "Nocturnal Wonderland", "HARD Summer"], "a"],
      ["SLANDER's popular collaborative single with Dabin, \"Superhuman,\" features vocals from:", ["Eric Leva", "Rivals", "Kiiara", "Chris Lake"], "a"],
      ["SLANDER often performs with a fellow bass artist under the collaborative alias \"Kompany\" — but their heavy touring circuit is primarily what type of music?", ["Melodic dubstep / bass", "Techno", "Salsa", "Classical"], "a"],
      ["SLANDER's collaboration \"Love Is Gone\" with Dylan Matthew became one of the most streamed dance tracks of its era.", ["True", "False", "It was never released", "It charted only in Japan"], "a"],
      ["SLANDER is based out of which U.S. city?", ["Los Angeles, California", "New York City", "Miami, Florida", "Las Vegas, Nevada"], "a"],
    ],
  },
  {
    name: "Afrojack",
    genre: "Electro House",
    difficulty: "medium",
    questions: [
      ["What is Afrojack's real name?", ["Nick van de Wall", "Nick Afrojack", "Nick de Vries", "Niels van de Wall"], "a"],
      ["Afrojack is a DJ/producer from which country?", ["The Netherlands", "South Africa", "Belgium", "Germany"], "a"],
      ["Afrojack won a Grammy Award for co-producing which David Guetta collaboration?", ["\"Levels\" remix / \"Bangduck\"", "\"Titanium\"", "\"Sexy Bitch\"", "\"Memories\""], "a"],
      ["Afrojack's breakout solo hit, released in 2010, is titled:", ["Take Over Control", "Ten Feet Tall", "Unstoppable", "Freedom"], "a"],
      ["Afrojack co-produced and remixed a well-known track for which superstar producer/DJ, helping define the \"Dutch house\" sound?", ["David Guetta", "Skrillex", "Tiësto", "Zedd"], "a"],
      ["Afrojack owns which record label?", ["Wall Recordings", "STMPD RCRDS", "Revealed Recordings", "Spinnin' Records"], "a"],
      ["Afrojack's collaboration \"Ten Feet Tall\" features vocals from:", ["Wrabel", "Sia", "Ellie Goulding", "Bebe Rexha"], "a"],
    ],
  },
  {
    name: "Alan Walker",
    genre: "Progressive House",
    difficulty: "medium",
    questions: [
      ["Alan Walker is a DJ/producer born in England but raised primarily in which country?", ["Norway", "Sweden", "Denmark", "Finland"], "a"],
      ["Alan Walker's breakout global smash hit, released in 2015, is titled:", ["Faded", "Alone", "Darkside", "Sing Me to Sleep"], "a"],
      ["Alan Walker performs wearing a signature accessory that obscures much of his face — what is it?", ["A hooded mask", "Sunglasses only", "A full-face helmet", "A bandana"], "a"],
      ["\"Faded\" by Alan Walker was originally released as an instrumental track before gaining vocals from which singer?", ["Iselin Solheim", "Sabrina Carpenter", "Julie Bergan", "Ina Wroldsen"], "a"],
      ["Alan Walker's music project involves an ongoing narrative/lore referred to as the \"Walkers.\"", ["True", "False", "It has no narrative concept", "It is based on a video game only"], "a"],
      ["Alan Walker's single \"Alone,\" a follow-up to \"Faded,\" features vocals from:", ["Noonie Bao", "Iselin Solheim", "Sabrina Carpenter", "Ina Wroldsen"], "a"],
      ["Alan Walker's sound is generally classified as:", ["Progressive house / electropop", "Dubstep", "Trap", "Drum & bass"], "a"],
    ],
  },
  {
    name: "Mau P",
    genre: "Tech House",
    difficulty: "medium",
    questions: [
      ["Mau P is a DJ/producer from which country?", ["The Netherlands", "Germany", "Belgium", "United Kingdom"], "a"],
      ["Mau P's breakout 2022 single that became a massive tech house anthem is titled:", ["Drugs From Amsterdam", "Beats", "Metro", "Gimme That Bounce"], "a"],
      ["Mau P's music is most associated with which house subgenre?", ["Tech house", "Trance", "Dubstep", "Drum & bass"], "a"],
      ["Mau P's single \"Gimme That Bounce\" became a major hit on which streaming/chart circuit?", ["Dance/electronic charts", "Country charts", "Classical charts", "Jazz charts"], "a"],
      ["Mau P performed at which prestigious dance music residency city, known as a global clubbing hub?", ["Ibiza, Spain", "Reykjavik, Iceland", "Helsinki, Finland", "Oslo, Norway"], "a"],
      ["Mau P is signed to which record label associated with tech house?", ["Repopulate Mars", "Anjunadeep", "Monstercat", "Armada Music"], "a"],
      ["Mau P rose to prominence relatively recently, breaking out in which decade?", ["2020s", "1990s", "2000s", "1980s"], "a"],
    ],
  },
  {
    name: "Alison Wonderland",
    genre: "Bass / Electronic",
    difficulty: "medium",
    questions: [
      ["What is Alison Wonderland's real name?", ["Alexandra Sholler", "Alison Wonder", "Alexandra Wonderland", "Alice Sholler"], "a"],
      ["Alison Wonderland is a DJ/producer from which country?", ["Australia", "New Zealand", "United States", "Canada"], "a"],
      ["Before her solo career, Alison Wonderland played which instrument in a metalcore band?", ["Cello", "Guitar", "Drums", "Violin"], "a"],
      ["Alison Wonderland's debut studio album, released in 2015, is titled:", ["Run", "Awake", "Loner", "American Dream"], "a"],
      ["Alison Wonderland's music blends bass and electronic production with her own:", ["Singing / vocals", "Rapping only", "Classical opera training", "Beatboxing"], "a"],
      ["Alison Wonderland's 2018 album is titled:", ["Awake", "Run", "Loner", "American Dream"], "a"],
      ["Alison Wonderland has performed at major U.S. festivals including Coachella and which Las Vegas-based EDM festival?", ["EDC Las Vegas", "Stagecoach", "Life Is Beautiful", "iHeartRadio Music Festival"], "a"],
    ],
  },
  {
    name: "Meduza",
    genre: "House",
    difficulty: "medium",
    questions: [
      ["Meduza is a production trio from which country?", ["Italy", "Spain", "France", "Portugal"], "a"],
      ["Meduza's breakout 2019 single, a massive global house hit, is titled:", ["Piece of Your Heart", "Paradise", "Tell It to My Heart", "Lose Control"], "a"],
      ["\"Piece of Your Heart\" by Meduza features vocals from:", ["Goodboys", "Becky Hill", "Hozier", "Elley Duhé"], "a"],
      ["Meduza won a Grammy Award (Best Dance Recording) for their collaboration with Becky Hill and Goodboys, titled:", ["\"Lose Control\"", "\"Paradise\"", "\"Piece of Your Heart\"", "\"Tell It to My Heart\""], "a"],
      ["Meduza's sound is generally classified within which genre?", ["House / dance-pop", "Trap", "Drum & bass", "Trance"], "a"],
      ["Meduza is composed of three members: Simone Giani, Luca de Gregorio, and:", ["Mattia Vitale", "Marco Carola", "Benny Benassi", "Gigi D'Agostino"], "a"],
      ["Meduza's collaboration with Hozier is titled:", ["Tell It to My Heart", "Piece of Your Heart", "Paradise", "Lose Control"], "a"],
    ],
  },
  {
    name: "TroyBoi",
    genre: "Trap / Bass",
    difficulty: "hard",
    questions: [
      ["TroyBoi is a producer from which country?", ["England", "United States", "Jamaica", "Canada"], "a"],
      ["TroyBoi's production style blends trap and bass music with influences from which other genre?", ["Grime / UK bass music", "Bluegrass", "Opera", "Salsa"], "a"],
      ["TroyBoi's breakout track, widely circulated in the mid-2010s bass scene, is titled:", ["Do You...?", "Afterparty", "Rager", "Mantra"], "a"],
      ["TroyBoi has collaborated with major hip-hop/pop artists, producing for acts including:", ["Diplo and Nicki Minaj", "only classical musicians", "no vocalists, ever", "exclusively country artists"], "a"],
      ["TroyBoi's sound is frequently described using which nickname for his signature bass style?", ["\"Afrotrap\" / bass-trap fusion", "Bluegrass fusion", "Baroque pop", "Yacht rock"], "a"],
      ["TroyBoi released a project titled \"V!BEZ\" as part of an ongoing EP series.", ["True", "False", "It doesn't exist", "It was a full-length rock album"], "a"],
      ["TroyBoi has performed at major bass-focused festivals including which Las Vegas-based EDM festival?", ["EDC Las Vegas", "Stagecoach", "Life Is Beautiful", "CMA Fest"], "a"],
    ],
  },
  {
    name: "KREAM",
    genre: "House",
    difficulty: "hard",
    questions: [
      ["KREAM is a production duo made up of two siblings from which country?", ["Norway", "Sweden", "Denmark", "Finland"], "a"],
      ["The two members of KREAM are brothers with which surname?", ["Slåtto", "Kream", "Johansson", "Berg"], "a"],
      ["KREAM's breakout single, a house/dance hit, is titled:", ["Taped Up Heart", "Pray", "Ghost", "Ely"], "a"],
      ["KREAM's music is most associated with which genre?", ["House / dance-pop", "Trap", "Drum & bass", "Trance"], "a"],
      ["KREAM's collaboration \"Pray\" features vocals from:", ["Clara Mae", "Sabrina Carpenter", "Zara Larsson", "Ina Wroldsen"], "a"],
      ["KREAM has released music on well-known dance labels including Ultra Music and:", ["Musical Freedom", "Def Jam", "Atlantic Records", "Motown"], "a"],
      ["KREAM's sound is often noted for combining deep house grooves with:", ["Pop-leaning melodic hooks", "Heavy metal riffs", "Operatic vocals", "Bluegrass banjo"], "a"],
    ],
  },
  {
    name: "Wooli",
    genre: "Dubstep",
    difficulty: "hard",
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
    name: "ATLiens",
    genre: "Dubstep",
    difficulty: "hard",
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
