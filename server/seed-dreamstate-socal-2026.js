// One-time content seed for Dreamstate SoCal 2026 (Nov 20-21, 2026, San
// Bernardino, CA — trance festival). Creates the festival row and its
// 16-artist lineup, corner-anchored by difficulty (see seed-utils.js).
//
// Usage: node server/seed-dreamstate-socal-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "dreamstate-socal-2026";

const FESTIVAL = {
  name: "Dreamstate SoCal",
  location: "San Bernardino, CA",
  event_date: "Nov. 20–21, 2026",
  banner_color: "#4da6ff",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "Above & Beyond",
    genre: "Trance",
    difficulty: "easy",
    questions: [
      ["Above & Beyond is a trance trio from which country?", ["United Kingdom", "Netherlands", "Germany", "Sweden"], "a"],
      ["Above & Beyond's members are Jono Grant, Tony McGuinness, and:", ["Paavo Siljamäki", "Ferry Corsten", "Armin van Buuren", "Andrew Bayer"], "a"],
      ["Above & Beyond founded which influential trance record label?", ["Anjunabeats", "Armada Music", "Monstercat", "Anjunadeep"], "a"],
      ["Above & Beyond's acclaimed 2014 album, exploring a more downtempo/acoustic side, is titled:", ["Acoustic", "Group Therapy", "Common Ground", "We Are All We Need"], "a"],
      ["Above & Beyond hosts a long-running radio show/podcast called:", ["Group Therapy", "A State of Trance", "Anjunabeats Worldwide", "Trance Around the World"], "a"],
      ["Above & Beyond's breakout single \"Sun & Moon\" features vocals from:", ["Richard Bedford", "Zoë Johnston", "Justine Suissa", "Marty Longstaff"], "a"],
      ["Above & Beyond is known for headlining sold-out shows at large arenas and even orchestral shows under which acoustic touring name?", ["Acoustic (Above & Beyond Acoustic)", "Symphonic Trance Live", "Above & Beyond Unplugged Tour", "The Trance Orchestra"], "a"],
    ],
  },
  {
    name: "Paul van Dyk",
    genre: "Trance",
    difficulty: "easy",
    questions: [
      ["Paul van Dyk is a trance DJ/producer from which country?", ["Germany", "Netherlands", "United Kingdom", "Belgium"], "a"],
      ["Paul van Dyk was one of the first electronic artists to be nominated for a Grammy in which category?", ["Best Dance/Electronic Album", "Best Rock Album", "Best Country Album", "Best R&B Album"], "a"],
      ["Paul van Dyk topped DJ Mag's Top 100 DJs poll multiple times, primarily in which decade?", ["Early-to-mid 2000s", "1980s", "2010s", "1990s only"], "a"],
      ["Paul van Dyk's breakout 1998 single that helped define the trance genre internationally is titled:", ["For an Angel", "Nothing But You", "Home", "Vega"], "a"],
      ["Paul van Dyk grew up in which formerly divided German city?", ["East Berlin", "West Berlin", "Munich", "Hamburg"], "a"],
      ["Paul van Dyk's record label is called:", ["Vandit Records", "Anjunabeats", "Armada Music", "Black Hole Recordings"], "a"],
      ["Paul van Dyk's music is most associated with which electronic genre?", ["Trance", "Dubstep", "Trap", "Drum & bass"], "a"],
    ],
  },
  {
    name: "Ferry Corsten",
    genre: "Trance",
    difficulty: "easy",
    questions: [
      ["Ferry Corsten is a trance DJ/producer from which country?", ["Netherlands", "Germany", "Belgium", "Sweden"], "a"],
      ["Ferry Corsten also performs and produces under a well-known alias for a harder, more energetic sound, named:", ["System F", "Gouryella", "Both System F and Gouryella", "Cosmic Gate"], "a"],
      ["Ferry Corsten's breakout hit as System F, a trance classic, is titled:", ["Out of the Blue", "Punk", "Beautiful", "Feel It"], "a"],
      ["Ferry Corsten founded which record label?", ["Flashover Recordings", "Anjunabeats", "Vandit Records", "Armada Music"], "a"],
      ["Ferry Corsten's collaborative trance project \"Gouryella,\" revived after years apart, is a partnership with:", ["Tiësto", "Armin van Buuren", "Paul van Dyk", "Above & Beyond"], "a"],
      ["Ferry Corsten's music is most associated with which genre?", ["Trance", "Dubstep", "Drum & bass", "Hip-hop"], "a"],
      ["Ferry Corsten remixed tracks for major pop acts while remaining rooted in the trance scene throughout his career.", ["True", "False", "He has never remixed any pop artists", "He abandoned trance entirely for hip-hop"], "a"],
    ],
  },
  {
    name: "Dash Berlin",
    genre: "Trance",
    difficulty: "easy",
    questions: [
      ["Dash Berlin is a trance project/artist from which country?", ["Netherlands", "Germany", "Belgium", "Sweden"], "a"],
      ["Dash Berlin was originally a duo before becoming primarily a solo/rotating project fronted by:", ["Jeffrey Sutorius", "Armin van Buuren", "Ferry Corsten", "Tiësto"], "a"],
      ["Dash Berlin's breakout single, a widely known vocal trance track, is titled:", ["Till the Sky Falls Down", "Man on the Moon", "Waiting", "Never Cry Again"], "a"],
      ["Dash Berlin has been ranked highly on DJ Mag's Top 100 DJs poll, peaking in the top:", ["10", "50", "75", "100 only, never higher"], "a"],
      ["Dash Berlin's music is most closely associated with which trance subgenre?", ["Vocal / emotional trance", "Hard techno", "Deep house", "Dubstep"], "a"],
      ["Dash Berlin has performed at major trance-focused festivals including A State of Trance and:", ["Dreamstate", "Stagecoach", "CMA Fest", "New Orleans Jazz Fest"], "a"],
      ["Dash Berlin's name is a reference to which classic 1980s film about a race across America?", ["The Cannonball Run", "Back to the Future", "Top Gun", "Ferris Bueller's Day Off"], "a"],
    ],
  },
  {
    name: "Aly & Fila",
    genre: "Trance",
    difficulty: "medium",
    questions: [
      ["Aly & Fila is a trance duo from which country?", ["Egypt", "Lebanon", "Israel", "Turkey"], "a"],
      ["Aly & Fila's names are Aly Amr Fathalah and:", ["Fadi Wassef Naguib", "Fila Hassan", "Amr Fila", "Wassef Naguib"], "a"],
      ["Aly & Fila host a long-running trance radio show called:", ["Future Sound of Egypt", "A State of Trance", "Group Therapy", "Trance Around the World"], "a"],
      ["Aly & Fila founded which record label associated with uplifting trance?", ["FSOE Recordings (Future Sound of Egypt)", "Anjunabeats", "Armada Music", "Black Hole Recordings"], "a"],
      ["Aly & Fila's music is most associated with which trance subgenre?", ["Uplifting trance", "Psytrance exclusively", "Tech house", "Dubstep"], "a"],
      ["Aly & Fila have been ranked among the top acts on DJ Mag's Top 100 DJs poll in the trance category.", ["True", "False", "They have never appeared on the poll", "They only appear on hip-hop charts"], "a"],
      ["Aly & Fila are known for extended-length radio shows/sets celebrating trance culture, often exceeding how many hours during anniversary specials?", ["12+ hours", "30 minutes", "1 hour", "3 hours max"], "a"],
    ],
  },
  {
    name: "ARTBAT",
    genre: "Melodic Techno",
    difficulty: "medium",
    questions: [
      ["ARTBAT is a duo from which country?", ["Ukraine", "Germany", "Netherlands", "Poland"], "a"],
      ["ARTBAT's name combines the artistic first names/aliases of its two members.", ["True", "False", "It stands for a city name", "It has no meaning at all"], "a"],
      ["ARTBAT's music is most associated with which genre?", ["Melodic techno / house", "Trap", "Bluegrass", "Reggaeton"], "a"],
      ["ARTBAT has released music on Afterlife Records, a label co-founded by:", ["Tale Of Us", "David Guetta", "Skrillex", "Kaskade"], "a"],
      ["ARTBAT's rise to global prominence in the melodic techno scene accelerated notably starting in which decade?", ["2010s", "1990s", "1980s", "2000s"], "a"],
      ["ARTBAT has performed at prominent melodic techno-focused events and festivals including Tomorrowland's techno-leaning stages.", ["True", "False", "They have never performed at Tomorrowland", "They exclusively play country festivals"], "a"],
      ["ARTBAT's sound is known for blending deep, hypnotic basslines with atmospheric, melodic layers.", ["True", "False", "Their sound is stripped-down minimal techno with no melody", "Their sound is centered on live vocals only"], "a"],
    ],
  },
  {
    name: "Vini Vici",
    genre: "Psytrance",
    difficulty: "medium",
    questions: [
      ["Vini Vici is a psytrance duo from which country?", ["Israel", "Egypt", "Turkey", "Greece"], "a"],
      ["Vini Vici's names are Aviram Saharai and:", ["Matan Kadosh", "Fadi Naguib", "Aly Fathalah", "Ran Shimoni"], "a"],
      ["Vini Vici's breakout collaborative single with Hilight Tribe, a massive psytrance anthem, is titled:", ["Free Tibet", "Astrix", "Adham", "Anti Nation"], "a"],
      ["Vini Vici's music is most associated with which electronic genre?", ["Psytrance", "Deep house", "Trap", "Reggaeton"], "a"],
      ["Vini Vici has collaborated with major mainstream EDM artists on crossover psytrance-influenced tracks, including with:", ["Hardwell", "Ed Sheeran", "Adele", "Taylor Swift"], "a"],
      ["Vini Vici's sound is known for driving, high-energy basslines rooted in the psytrance scene originating largely from which region?", ["Israel and the psytrance/Goa trance lineage", "Nashville country scene", "UK garage scene", "New Orleans jazz scene"], "a"],
      ["Vini Vici has performed at major psytrance and mainstream EDM festivals worldwide, including Tomorrowland.", ["True", "False", "They have never performed at Tomorrowland", "They only perform at small local clubs"], "a"],
    ],
  },
  {
    name: "Andrew Rayel",
    genre: "Trance",
    difficulty: "medium",
    questions: [
      ["Andrew Rayel is a trance DJ/producer from which country?", ["Moldova", "Romania", "Russia", "Ukraine"], "a"],
      ["Andrew Rayel was signed early in his career and mentored by which major trance artist's label, Armada Music?", ["Armin van Buuren", "Tiësto", "Paul van Dyk", "Ferry Corsten"], "a"],
      ["Andrew Rayel's music is most associated with which genre?", ["Trance", "Trap", "Dubstep", "Reggaeton"], "a"],
      ["Andrew Rayel released a project themed around a fictional narrative/character universe called:", ["Musical Fantasy tour / \"Find Your Harmony\" era releases", "He has no themed project", "A hip-hop mixtape series", "A country music concept album"], "a"],
      ["Andrew Rayel has collaborated frequently with Armin van Buuren, including on tracks under Armin's radio show/brand:", ["A State of Trance", "Group Therapy", "Anjunabeats Worldwide", "Cercle"], "a"],
      ["Andrew Rayel studied classical piano from a young age before moving into electronic music production.", ["True", "False", "He has no classical music background", "He started as a guitarist in a rock band"], "a"],
      ["Andrew Rayel's sound is generally described as:", ["Uplifting / melodic trance", "Hard techno", "Dubstep", "Deep house exclusively"], "a"],
    ],
  },
  {
    name: "Infected Mushroom",
    genre: "Psytrance",
    difficulty: "medium",
    questions: [
      ["Infected Mushroom is a psytrance duo from which country?", ["Israel", "Egypt", "Greece", "Turkey"], "a"],
      ["Infected Mushroom's members are Amit Duvdevani and:", ["Erez Aizen", "Aviram Saharai", "Ran Shimoni", "Matan Kadosh"], "a"],
      ["Infected Mushroom's music blends psytrance with elements of which other heavier genre, notable in their later work?", ["Metal / rock", "Bluegrass", "Reggae", "Classical"], "a"],
      ["Infected Mushroom's breakout album, considered a genre classic, is titled:", ["Classical Mushroom", "Vicious Delicious", "Army of Mushrooms", "Converting Vegetarians"], "a"],
      ["Infected Mushroom is one of the longest-running and most influential acts within which electronic subgenre's history?", ["Psytrance", "UK garage", "Dubstep", "Trap"], "a"],
      ["Infected Mushroom has collaborated with major rock/metal musicians as part of their genre-blending approach.", ["True", "False", "They have never collaborated outside electronic music", "They only work with classical musicians"], "a"],
      ["Infected Mushroom formed in which decade?", ["1990s", "1980s", "2000s", "2010s"], "a"],
    ],
  },
  {
    name: "Solarstone",
    genre: "Trance",
    difficulty: "medium",
    questions: [
      ["Solarstone is a trance DJ/producer from which country?", ["United Kingdom", "Germany", "Netherlands", "Sweden"], "a"],
      ["Solarstone is credited with coining/popularizing which trance subgenre term?", ["\"Pure Trance\"", "\"Dubstep\"", "\"Trap\"", "\"Drum & bass\""], "a"],
      ["Solarstone founded which record label associated with a stripped-back, melodic trance sound?", ["Pure Trance Recordings", "Anjunabeats", "Armada Music", "Vandit Records"], "a"],
      ["Solarstone's real name is:", ["Richard Mowatt", "Richard Solarstone", "Rich Sanderson", "Richard Durand"], "a"],
      ["Solarstone hosts a long-running radio show called:", ["Pure Trance Radio", "A State of Trance", "Group Therapy", "Trance Around the World"], "a"],
      ["Solarstone has been active in the trance scene since which decade?", ["1990s", "1980s", "2000s only", "2010s only"], "a"],
      ["Solarstone's music is most associated with which trance style, emphasizing melody over hard-edged energy?", ["Melodic / pure trance", "Hard trance / hardstyle", "Psytrance exclusively", "Vocal trap"], "a"],
    ],
  },
  {
    name: "MaRLo",
    genre: "Trance",
    difficulty: "medium",
    questions: [
      ["MaRLo is a trance DJ/producer from which country?", ["Australia", "New Zealand", "United Kingdom", "Canada"], "a"],
      ["MaRLo has released music on major trance labels including Armada Music and:", ["Anjunabeats", "Motown", "Def Jam", "Atlantic Records"], "a"],
      ["MaRLo's music leans toward a harder-edged, more energetic style within which genre?", ["Trance", "Bluegrass", "Reggae", "Smooth jazz"], "a"],
      ["MaRLo has collaborated closely with Armin van Buuren, appearing frequently on his radio show:", ["A State of Trance", "Group Therapy", "Anjunabeats Worldwide", "Cercle"], "a"],
      ["MaRLo relocated during his career to which country, closely tying him to the European trance scene?", ["Germany", "United States", "Japan", "Brazil"], "a"],
      ["MaRLo's tracks are known for driving, high-energy drops within the trance genre.", ["True", "False", "His tracks are entirely ambient and beatless", "He only produces acoustic ballads"], "a"],
      ["MaRLo has performed at major trance festivals worldwide, including Dreamstate and A State of Trance events.", ["True", "False", "He has never performed at any trance festival", "He only performs in nightclubs"], "a"],
    ],
  },
  {
    name: "Giorgia Angiuli",
    genre: "Electronic / Techno",
    difficulty: "medium",
    questions: [
      ["Giorgia Angiuli is an electronic producer/live performer from which country?", ["Italy", "France", "Spain", "Germany"], "a"],
      ["Giorgia Angiuli is known for a distinctive live performance style using many simultaneous:", ["Analog synthesizers and hardware instruments", "Only a laptop and pre-recorded tracks", "A full orchestra", "Turntables only"], "a"],
      ["Giorgia Angiuli's music blends elements of techno, house, and:", ["Playful pop melodies", "Bluegrass", "Opera", "Death metal"], "a"],
      ["Giorgia Angiuli has performed live sets at major festivals and boat parties within the European electronic scene.", ["True", "False", "She has never performed live outside of Italy", "She exclusively produces studio albums with no live shows"], "a"],
      ["Giorgia Angiuli is known for a hands-on, multi-instrumental live show rather than a standard DJ set.", ["True", "False", "She performs exclusively as a turntablist DJ", "She only performs acoustic sets"], "a"],
      ["Giorgia Angiuli's sound incorporates playful, sometimes whimsical vocal samples alongside driving electronic production.", ["True", "False", "Her music never includes vocals or samples", "Her music is purely classical"], "a"],
      ["Giorgia Angiuli has released music through European electronic labels associated with house and techno.", ["True", "False", "She has never released music on any label", "She only releases country music"], "a"],
    ],
  },
  {
    name: "Reinier Zonneveld",
    genre: "Techno",
    difficulty: "hard",
    questions: [
      ["Reinier Zonneveld is a techno DJ/producer from which country?", ["Netherlands", "Germany", "Belgium", "United Kingdom"], "a"],
      ["Reinier Zonneveld is known for extremely prolific track output, at times releasing a large number of tracks within a single year.", ["True", "False", "He has released only a handful of songs in his career", "He has never released original productions, only remixes"], "a"],
      ["Reinier Zonneveld is known for performing live using hardware synthesizers rather than a standard DJ set, in performances he calls:", ["Live sets / \"Reinier Zonneveld Live\"", "Acoustic Sessions", "Unplugged Techno", "Silent Disco"], "a"],
      ["Reinier Zonneveld founded which record label?", ["Filth on Acid", "Drumcode", "Cocoon Recordings", "Anjunabeats"], "a"],
      ["Reinier Zonneveld's music is most associated with which genre?", ["Techno", "Trap", "Reggaeton", "Bluegrass"], "a"],
      ["Reinier Zonneveld has degrees/training in a classical instrument prior to his electronic music career.", ["True", "False", "He has no musical training background", "He trained exclusively as a vocalist"], "a"],
      ["Reinier Zonneveld has performed extended, high-energy live techno sets at major festivals across Europe.", ["True", "False", "He has never performed at any festival", "He exclusively performs in small private studios"], "a"],
    ],
  },
  {
    name: "Enrico Sangiuliano",
    genre: "Techno",
    difficulty: "hard",
    questions: [
      ["Enrico Sangiuliano is a techno DJ/producer from which country?", ["Italy", "Germany", "Netherlands", "France"], "a"],
      ["Enrico Sangiuliano has released music on Drumcode, a label founded by:", ["Adam Beyer", "Charlotte de Witte", "Carl Cox", "Richie Hawtin"], "a"],
      ["Enrico Sangiuliano's music is most associated with which genre?", ["Techno", "Reggaeton", "Bluegrass", "Smooth jazz"], "a"],
      ["Enrico Sangiuliano's sound is often noted for blending techno with cinematic, atmospheric synth work.", ["True", "False", "His sound is entirely stripped-back minimal techno with no atmosphere", "His sound is centered on live vocals"], "a"],
      ["Enrico Sangiuliano has performed at major techno-focused festival stages internationally, including at Tomorrowland's techno stage.", ["True", "False", "He has never performed at Tomorrowland", "He exclusively plays small underground clubs"], "a"],
      ["Enrico Sangiuliano is known within the techno scene for a distinctive, futuristic visual/production aesthetic in his live shows.", ["True", "False", "His live shows have no visual production", "He never performs live shows, only studio releases"], "a"],
      ["Enrico Sangiuliano's rise to prominence in the international techno scene accelerated notably in which decade?", ["2010s", "1990s", "1980s", "2000s"], "a"],
    ],
  },
  {
    name: "Astrix",
    genre: "Psytrance",
    difficulty: "hard",
    questions: [
      ["Astrix is a psytrance producer from which country?", ["Israel", "Egypt", "Greece", "Turkey"], "a"],
      ["Astrix's real name is:", ["Avi Shmailov", "Aviram Saharai", "Amit Duvdevani", "Erez Aizen"], "a"],
      ["Astrix's music is most associated with which electronic genre?", ["Psytrance", "Deep house", "Trap", "Reggaeton"], "a"],
      ["Astrix is considered one of the pioneering, long-running artists within the psytrance scene's history.", ["True", "False", "He is a newcomer with less than one year of releases", "He has never released psytrance music"], "a"],
      ["Astrix has performed at major psytrance festivals worldwide as a headlining act for many years.", ["True", "False", "He has never headlined a festival", "He exclusively performs acoustic sets"], "a"],
      ["Astrix's productions are known for driving basslines and psychedelic, hypnotic soundscapes.", ["True", "False", "His music has no bass elements", "His music is centered on classical strings"], "a"],
      ["Astrix has collaborated with other prominent psytrance artists over the course of his career.", ["True", "False", "He has never collaborated with another artist", "He only produces solo with zero features"], "a"],
    ],
  },
  {
    name: "Neelix",
    genre: "Psytrance",
    difficulty: "hard",
    questions: [
      ["Neelix is an electronic producer from which country?", ["Germany", "Israel", "Netherlands", "France"], "a"],
      ["Neelix's music blends psytrance influences with elements of which other dance genre?", ["Techno / progressive house", "Bluegrass", "Reggae", "Opera"], "a"],
      ["Neelix's real name is:", ["Steve Rauner", "Steve Neelix", "Stefan Rauner", "Rauner Steve"], "a"],
      ["Neelix has released music on record labels associated with the psytrance and progressive electronic scenes.", ["True", "False", "He has never released music on any label", "He only releases through major pop labels"], "a"],
      ["Neelix's productions often feature intricate, layered percussion alongside psychedelic melodic elements.", ["True", "False", "His productions contain no percussion", "His productions are purely ambient with no rhythm"], "a"],
      ["Neelix has performed at psytrance and progressive trance festivals across Europe and internationally.", ["True", "False", "He has never performed outside his home country", "He exclusively performs in private studio sessions"], "a"],
      ["Neelix is recognized within the psytrance and progressive scene for a distinctive, groove-driven production style.", ["True", "False", "His style is considered indistinguishable from mainstream pop", "He has no recognizable production style"], "a"],
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
