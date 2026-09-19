// One-time content seed for Camp Flog Gnaw 2026 (Nov 14-15, 2026, Los
// Angeles, CA — Tyler, the Creator's hip-hop/R&B festival). Creates the
// festival row and its 16-artist lineup, corner-anchored by difficulty (see
// seed-utils.js).
//
// Usage: node server/seed-camp-flog-gnaw-2026.js
// Requires DATABASE_URL in the environment. Safe to re-run — skips if the
// festival already has artists.

const { pool } = require("./db");
const { seedFestivalLineup } = require("./seed-utils");

const FESTIVAL_SLUG = "camp-flog-gnaw-2026";

const FESTIVAL = {
  name: "Camp Flog Gnaw",
  location: "Los Angeles, CA",
  event_date: "Nov. 14–15, 2026",
  banner_color: "#ff9d3d",
  entry_cost_tokens: 3,
  ticket_prize_label: "1 General Admission Ticket",
};

const LINEUP = [
  {
    name: "Tyler, the Creator",
    genre: "Hip-Hop",
    difficulty: "easy",
    questions: [
      ["Tyler, the Creator founded and hosts which annual festival himself?", ["Camp Flog Gnaw", "Rolling Loud", "One MusicFest", "Broccoli City Festival"], "a"],
      ["Tyler, the Creator was a founding member of which hip-hop collective?", ["Odd Future", "TDE", "A$AP Mob", "Griselda"], "a"],
      ["Which Tyler, the Creator album won the Grammy for Best Rap Album in 2020?", ["IGOR", "Flower Boy", "Call Me If You Get Lost", "Cherry Bomb"], "a"],
      ["Tyler, the Creator's 2021 album \"Call Me If You Get Lost\" also won a Grammy for Best Rap Album.", ["True", "False", "It was disqualified", "It won Best Pop Album instead"], "a"],
      ["Tyler, the Creator is from which U.S. city?", ["Los Angeles, California", "Atlanta, Georgia", "New York City", "Houston, Texas"], "a"],
      ["Tyler, the Creator's acclaimed 2017 album \"Flower Boy\" is also known by its alternate title:", ["Scum F*** Flower Boy", "IGOR", "Bastard", "Goblin"], "a"],
      ["Tyler, the Creator's real name is:", ["Tyler Okonma", "Tyler Gaskins", "Tyler Baxter", "Tyler Reynolds"], "a"],
    ],
  },
  {
    name: "Turnstile",
    genre: "Hardcore",
    difficulty: "easy",
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
    name: "Future",
    genre: "Hip-Hop / Trap",
    difficulty: "easy",
    questions: [
      ["What is Future's real name?", ["Nayvadius Wilburn", "Nayvadius Cash", "Future Hendrix Jr.", "Wilburn Hendrix"], "a"],
      ["Future is a rapper from which U.S. city?", ["Atlanta, Georgia", "Houston, Texas", "Memphis, Tennessee", "New Orleans, Louisiana"], "a"],
      ["Future is a founding member of which Atlanta rap collective/label group?", ["Dungeon Family", "Cash Money", "Quality Control", "Freebandz (his own imprint)"], "a"],
      ["Future's chart-topping 2017 self-titled album debuted at No. 1, followed a week later by a second album also hitting No. 1 — a rare feat. That second album was titled:", ["HNDRXX", "DS2", "Pluto", "Beast Mode"], "a"],
      ["Future is widely credited as a major influence on which vocal effect commonly used in modern trap/hip-hop?", ["Auto-Tune / melodic trap singing", "Vocoder harmonies", "Beatboxing", "Whistle tones"], "a"],
      ["Future has had numerous high-profile collaborations, including multiple joint albums/mixtapes with:", ["Drake", "Kanye West only", "Jay-Z only", "Eminem"], "a"],
      ["Future's stage name is derived from a nickname given to him for being ahead of his time in style.", ["True", "False", "It comes from a movie title", "It was his childhood nickname unrelated to style"], "a"],
    ],
  },
  {
    name: "Steve Lacy",
    genre: "R&B / Alt-Pop",
    difficulty: "easy",
    questions: [
      ["Steve Lacy first gained recognition as a member of which band?", ["The Internet", "Odd Future", "BROCKHAMPTON", "Chromeo"], "a"],
      ["Steve Lacy's massive 2022 hit that topped the Billboard Hot 100 is titled:", ["Bad Habit", "Dark Red", "N Side", "Static"], "a"],
      ["Steve Lacy's 2022 album featuring \"Bad Habit\" is titled:", ["Gemini Rights", "Apollo XXI", "Steve Lacy's Demo", "Mercury"], "a"],
      ["Steve Lacy is known for frequently recording using which unconventional recording device early in his career?", ["An iPhone", "A cassette four-track", "A landline phone recorder", "A typewriter with audio attachment"], "a"],
      ["Steve Lacy is from which U.S. state?", ["California", "Texas", "New York", "Georgia"], "a"],
      ["Steve Lacy won a Grammy for Best Progressive R&B Album for which project?", ["Gemini Rights", "Apollo XXI", "Steve Lacy's Demo", "Mercury"], "a"],
      ["Steve Lacy plays which instrument prominently across his solo work?", ["Guitar", "Saxophone", "Violin", "Trombone"], "a"],
    ],
  },
  {
    name: "Don Toliver",
    genre: "Hip-Hop / R&B",
    difficulty: "medium",
    questions: [
      ["Don Toliver is a rapper/singer closely associated with which fellow Houston artist's label, Cactus Jack?", ["Travis Scott", "Megan Thee Stallion", "Slim Thug", "Paul Wall"], "a"],
      ["Don Toliver is from which U.S. state?", ["Texas", "Georgia", "California", "Florida"], "a"],
      ["Don Toliver's breakout feature appeared on Travis Scott's 2018 album:", ["Astroworld", "Rodeo", "Birds in the Trap Sing McKnight", "Utopia"], "a"],
      ["Don Toliver's debut studio album, released in 2020, is titled:", ["Heaven or Hell", "Life of a Don", "Love Sick", "What You Need"], "a"],
      ["Don Toliver's sound blends hip-hop with which other genre, often noted for his melodic singing style?", ["R&B / psychedelic soul", "Bluegrass", "Punk rock", "Classical"], "a"],
      ["Don Toliver's 2023 album is titled:", ["Love Sick", "Heaven or Hell", "Life of a Don", "No Idea"], "a"],
      ["Don Toliver's real name is:", ["Caleb Toliver", "Donald Toliver Jr.", "Marcus Toliver", "Devin Toliver"], "a"],
    ],
  },
  {
    name: "Vince Staples",
    genre: "Hip-Hop",
    difficulty: "medium",
    questions: [
      ["Vince Staples is a rapper from which U.S. city?", ["Long Beach, California", "Compton, California", "Oakland, California", "San Diego, California"], "a"],
      ["Vince Staples' breakout 2015 debut studio album is titled:", ["Summertime '06", "Big Fish Theory", "Vince Staples", "Ramona Park Broke My Heart"], "a"],
      ["Vince Staples starred in and created a semi-autobiographical Netflix series named after himself, released in 2024.", ["True", "False", "It was on HBO instead", "It was a movie, not a series"], "a"],
      ["Vince Staples' 2017 album \"Big Fish Theory\" leaned into which experimental production style?", ["Electronic / dance-influenced hip-hop", "Bluegrass fusion", "Smooth jazz", "Opera"], "a"],
      ["Vince Staples' 2021 self-titled album was produced almost entirely by:", ["Kenny Beats", "Metro Boomin", "Pharrell Williams", "Mike Dean"], "a"],
      ["Vince Staples' 2022 album, a companion piece exploring his hometown, is titled:", ["Ramona Park Broke My Heart", "Summertime '06", "Big Fish Theory", "Dark Times"], "a"],
      ["Vince Staples has been vocal about growing up affiliated with which gang culture, a frequent theme in his lyrics?", ["Crips", "Bloods", "MS-13", "Latin Kings"], "a"],
    ],
  },
  {
    name: "Earl Sweatshirt",
    genre: "Hip-Hop",
    difficulty: "medium",
    questions: [
      ["Earl Sweatshirt was an original member of which hip-hop collective, alongside Tyler, the Creator?", ["Odd Future", "TDE", "A$AP Mob", "Pro Era"], "a"],
      ["Earl Sweatshirt's real name is:", ["Thebe Kgositsile", "Earl Wilson", "Sweatshirt Thebe", "Thebe Odom"], "a"],
      ["Earl Sweatshirt's father was a famous poet from which country?", ["South Africa", "Nigeria", "Jamaica", "Ghana"], "a"],
      ["Earl Sweatshirt's acclaimed 2015 album, known for its dense and dark production, is titled:", ["I Don't Like S***, I Don't Go Outside", "Doris", "Some Rap Songs", "Sick!"], "a"],
      ["Earl Sweatshirt famously disappeared from public life for a period as a teenager, having been sent to a school in which country?", ["Samoa", "Australia", "New Zealand", "Fiji"], "a"],
      ["Earl Sweatshirt's 2018 album, noted for its short runtime and looped, sample-heavy beats, is titled:", ["Some Rap Songs", "Doris", "Sick!", "I Don't Like S***, I Don't Go Outside"], "a"],
      ["Earl Sweatshirt's 2022 album, praised for its dense wordplay, is titled:", ["Sick!", "Some Rap Songs", "Doris", "Voir Dire"], "a"],
    ],
  },
  {
    name: "Isaiah Rashad",
    genre: "Hip-Hop",
    difficulty: "medium",
    questions: [
      ["Isaiah Rashad is signed to which prominent West Coast hip-hop label?", ["Top Dawg Entertainment (TDE)", "Cactus Jack", "Quality Control", "Dreamville"], "a"],
      ["Isaiah Rashad is from which U.S. city?", ["Chattanooga, Tennessee", "Memphis, Tennessee", "Atlanta, Georgia", "Compton, California"], "a"],
      ["Isaiah Rashad's breakout 2016 album is titled:", ["The Sun's Tirade", "Cilvia Demo", "The House Is Burning", "Lay Wit Ya"], "a"],
      ["Isaiah Rashad's 2021 album, exploring themes of struggle and redemption, is titled:", ["The House Is Burning", "The Sun's Tirade", "Cilvia Demo", "Free Lunch"], "a"],
      ["Isaiah Rashad's TDE labelmates include Kendrick Lamar and:", ["ScHoolboy Q", "Drake", "J. Cole", "Travis Scott"], "a"],
      ["Isaiah Rashad's music often blends Southern hip-hop influences with a laid-back, soulful production style.", ["True", "False", "His style is strictly East Coast boom-bap", "His style is strictly trap"], "a"],
      ["Isaiah Rashad's debut EP, which introduced him to wider audiences, was titled:", ["Cilvia Demo", "The Sun's Tirade", "The House Is Burning", "Free Lunch"], "a"],
    ],
  },
  {
    name: "Syd",
    genre: "R&B",
    difficulty: "medium",
    questions: [
      ["Syd is the lead vocalist of which R&B/funk group?", ["The Internet", "SWV", "TLC", "En Vogue"], "a"],
      ["Syd was also an early member of which hip-hop collective, working as a producer/engineer?", ["Odd Future", "TDE", "A$AP Mob", "BROCKHAMPTON"], "a"],
      ["Syd's solo debut album, released in 2017, is titled:", ["Fin", "Broken Hearts Club", "Always Never Home", "Bear With Me"], "a"],
      ["Syd's 2022 solo album is titled:", ["Broken Hearts Club", "Fin", "Always Never Home", "Bear With Me"], "a"],
      ["Syd's full name is:", ["Sydney Bennett", "Sydney Loren", "Sydney Reynolds", "Sydney Carter"], "a"],
      ["The Internet, Syd's band, won a Grammy nomination for Best Urban Contemporary Album for which record?", ["Ego Death", "Hive Mind", "Purple Naked Ladies", "Feel Good"], "a"],
      ["Syd is known for her understated, breathy vocal style within contemporary:", ["R&B / neo-soul", "Opera", "Country", "Heavy metal"], "a"],
    ],
  },
  {
    name: "Lola Young",
    genre: "Pop / R&B",
    difficulty: "medium",
    questions: [
      ["Lola Young is a singer-songwriter from which country?", ["England", "United States", "Australia", "Ireland"], "a"],
      ["Lola Young's breakout global hit, released in 2024, is titled:", ["Messy", "Big Brown Eyes", "Conceited", "Wish You Were Dead"], "a"],
      ["Lola Young's music is generally categorized within which genre blend?", ["Pop / R&B / soul", "Bluegrass", "Trance", "Death metal"], "a"],
      ["Lola Young's 2024 breakout album is titled:", ["This Wasn't Meant for You Anyway", "My Mind Wanders and Sometimes Leaves Completely", "Intro", "Wish You Were Dead"], "a"],
      ["Lola Young cites which decades of soul/R&B music as key influences on her sound?", ["1960s-70s soul", "1980s synthpop", "2000s nu-metal", "1950s doo-wop only"], "a"],
      ["Lola Young's rise to mainstream popularity was significantly boosted by virality on which platform?", ["TikTok", "MySpace", "Vine", "SoundCloud exclusively"], "a"],
      ["Lola Young performed at the Grammy Awards / major award shows following her 2024-2025 breakout.", ["True", "False", "She has never performed on a major awards show", "She refuses all TV appearances"], "a"],
    ],
  },
  {
    name: "J.I.D",
    genre: "Hip-Hop",
    difficulty: "medium",
    questions: [
      ["J.I.D is a rapper signed to which record label founded by J. Cole?", ["Dreamville Records", "Top Dawg Entertainment", "Quality Control", "Cactus Jack"], "a"],
      ["J.I.D is from which U.S. city?", ["Atlanta, Georgia", "Chicago, Illinois", "Houston, Texas", "New York City"], "a"],
      ["J.I.D's real name is:", ["Destin Route", "Jamal Isaiah Davis", "Julian Davis", "Isaiah Route"], "a"],
      ["J.I.D's acclaimed 2022 album, praised for its dense lyricism, is titled:", ["The Forever Story", "DiCaprio 2", "The Never Story", "God Does Like Ugly"], "a"],
      ["J.I.D's debut studio album is titled:", ["The Never Story", "DiCaprio 2", "The Forever Story", "Just In Debt"], "a"],
      ["J.I.D was featured on \"Off the Grid,\" a track from which Kanye West/Ye album?", ["Donda", "Jesus Is King", "Ye", "The Life of Pablo"], "a"],
      ["J.I.D is known within hip-hop circles for his rapid, technically complex rapping style, sometimes compared to which legendary rapper?", ["Andre 3000", "Lil Wayne", "Eminem", "Jay-Z"], "a"],
    ],
  },
  {
    name: "Leon Thomas",
    genre: "R&B",
    difficulty: "medium",
    questions: [
      ["Leon Thomas began his entertainment career as a child actor, notably starring in which Nickelodeon show?", ["Victorious", "iCarly", "Drake & Josh", "Zoey 101"], "a"],
      ["Leon Thomas's breakout 2023 single, later remixed, is titled:", ["Mutt", "Cranberry Sauce", "Breaking Point", "Have You Seen This Woman"], "a"],
      ["Leon Thomas's 2023 debut studio album is titled:", ["Electric Dusk", "Mutt", "Genesis", "Breaking Point"], "a"],
      ["Before his solo R&B career, Leon Thomas was also a songwriter/producer for other major artists.", ["True", "False", "He has never written for other artists", "He only acted, never wrote music"], "a"],
      ["Leon Thomas is from which U.S. city?", ["Brooklyn, New York", "Atlanta, Georgia", "Houston, Texas", "Chicago, Illinois"], "a"],
      ["Leon Thomas's music blends contemporary R&B with influences from which earlier musical era?", ["Psychedelic soul / funk", "1980s synthpop", "Punk rock", "Bluegrass"], "a"],
      ["Leon Thomas's single \"Mutt\" became a sleeper hit, eventually charting on the Billboard Hot 100 well after its initial release.", ["True", "False", "It never charted", "It charted immediately upon release only"], "a"],
    ],
  },
  {
    name: "Magdalena Bay",
    genre: "Synth-Pop",
    difficulty: "hard",
    questions: [
      ["Magdalena Bay is a synth-pop duo made up of Mica Tenenbaum and:", ["Matthew Lewin", "Jack Antonoff", "Devon Hendryx", "Alex Greenwald"], "a"],
      ["Magdalena Bay's acclaimed 2021 debut studio album is titled:", ["Mercurial World", "Imaginal Disk", "A Little Rhythm and a Wicked Feeling", "Dreamcatching"], "a"],
      ["Magdalena Bay's 2024 concept album, exploring surreal, sci-fi-tinged themes, is titled:", ["Imaginal Disk", "Mercurial World", "Dreamcatching", "A Little Rhythm and a Wicked Feeling"], "a"],
      ["Magdalena Bay's sound draws heavily on the aesthetics of which decade of pop music?", ["1980s synth-pop", "1950s doo-wop", "1970s disco only", "1990s grunge"], "a"],
      ["Magdalena Bay's members originally met in which U.S. city, where they attended college together?", ["Miami, Florida", "Los Angeles, California", "New York City", "Boston, Massachusetts"], "a"],
      ["Magdalena Bay is known for producing much of their own music in-house rather than relying on outside producers.", ["True", "False", "They have never produced their own music", "They only remix other artists' songs"], "a"],
      ["Magdalena Bay's visual aesthetic frequently incorporates which style of imagery?", ["Retro-futuristic / digital surrealism", "Gothic horror", "Minimalist black-and-white only", "Western/cowboy themes"], "a"],
    ],
  },
  {
    name: "The Alchemist",
    genre: "Hip-Hop Production",
    difficulty: "hard",
    questions: [
      ["The Alchemist is best known primarily as a hip-hop:", ["Producer", "Singer", "Drummer", "Guitarist"], "a"],
      ["The Alchemist got his start as part of which West Coast hip-hop duo in the 1990s?", ["The Whooliganz", "Dilated Peoples", "Cypress Hill", "Souls of Mischief"], "a"],
      ["The Alchemist has produced extensively for which underground/mainstream rapper duo project, \"Alfredo\"?", ["Freddie Gibbs", "Action Bronson", "Curren$y", "Havoc"], "a"],
      ["The Alchemist's real name is:", ["Alan Maman", "Alan Alchemist", "Adam Maman", "Alan Michaels"], "a"],
      ["The Alchemist has a long-running production partnership/duo with which rapper, forming \"Gangrene\"?", ["Oh No", "Curren$y", "Prodigy", "Action Bronson"], "a"],
      ["The Alchemist produced extensively for Mobb Deep member Prodigy, including the acclaimed album:", ["Return of the Mac", "The Infamous", "Hell on Earth", "Murda Muzik"], "a"],
      ["The Alchemist is known for often using vintage/dusty soul and jazz samples in his beats.", ["True", "False", "He exclusively uses synthesizers", "He never samples other music"], "a"],
    ],
  },
  {
    name: "Jane Remover",
    genre: "Digicore / Shoegaze",
    difficulty: "hard",
    questions: [
      ["Jane Remover is an artist associated with which internet-born, hyperpop-adjacent genre?", ["Digicore", "Bluegrass", "Trap soul", "Yacht rock"], "a"],
      ["Jane Remover's music has evolved to also incorporate elements of which 1990s alternative rock subgenre?", ["Shoegaze", "Grunge", "Britpop", "Ska"], "a"],
      ["Jane Remover released early influential work under a different artist name before rebranding — that earlier name was:", ["Dltzk (a collaborative/related project) or her earlier moniker \"Josh Pan\"", "Skrillex", "100 gecs", "Charli XCX"], "a"],
      ["Jane Remover's 2021 breakout album, an early digicore landmark, is titled:", ["Frailty", "Census Designated", "Venus Fly", "Roadkill"], "a"],
      ["Jane Remover's 2023 album, leaning further into shoegaze/rock textures, is titled:", ["Census Designated", "Frailty", "Venus Fly", "Redscroll"], "a"],
      ["Jane Remover's music rose to prominence largely through which online community/platform?", ["SoundCloud / online DIY scenes", "Traditional radio", "Major label A&R scouting", "Broadway"], "a"],
      ["Jane Remover is part of a loose collective of young, internet-native artists sometimes grouped under the digicore/hyperpop umbrella.", ["True", "False", "She has no ties to any music scene", "She is a solely classical-trained composer"], "a"],
    ],
  },
  {
    name: "Lupe Fiasco",
    genre: "Hip-Hop",
    difficulty: "hard",
    questions: [
      ["Lupe Fiasco is a rapper from which U.S. city?", ["Chicago, Illinois", "Atlanta, Georgia", "Detroit, Michigan", "New York City"], "a"],
      ["Lupe Fiasco's breakout 2006 debut album is titled:", ["Food & Liquor", "The Cool", "Lasers", "Tetsuo & Youth"], "a"],
      ["Lupe Fiasco's Grammy-winning 2007 single, featuring Matthew Santos, is titled:", ["Superstar", "Kick, Push", "The Show Goes On", "Daydreamin'"], "a"],
      ["Lupe Fiasco's real name is:", ["Wasalu Muhammad Jaco", "Lupe Jackson", "Wasalu Fiasco", "Jaco Muhammad"], "a"],
      ["Lupe Fiasco is known for socially conscious, intricate lyricism, often compared early in his career to which lyrical style icon?", ["Nas", "Lil Wayne", "50 Cent", "T-Pain"], "a"],
      ["Lupe Fiasco's acclaimed 2011 single, an anti-war/social commentary track, is titled:", ["Words I Never Said", "Superstar", "Daydreamin'", "The Show Goes On"], "a"],
      ["Lupe Fiasco has taught a hip-hop course as a visiting lecturer/professor at which university?", ["MIT", "Harvard University", "Yale University", "Princeton University"], "a"],
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
