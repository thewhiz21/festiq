// AI-assisted trivia question generation + cross-model verification.
//
// IMPORTANT — this module changes bank SIZE only, never DIFFICULTY. The
// pass_threshold / DIFFICULTY_LEVEL math in server.js is what governs how
// often a player actually clears a square, and that stays keyed off
// artist.difficulty exactly as before. A bigger bank exists purely to kill
// memorization/farming (see board_question_sets in db.js) — it must never
// become a backdoor that makes an artist's square easier to pass than the
// admin's target_pass_rate intends. That's why verification checks each
// drafted question's *estimated* difficulty against the artist's assigned
// tier and holds any mismatch for manual review, even when both models
// agree on the correct answer.
//
// Requires ANTHROPIC_API_KEY and OPENAI_API_KEY to actually run. Without
// both set, generateAndVerifyQuestions throws a clear, actionable error
// instead of silently producing placeholder content into a real bank.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_MODEL = process.env.QUESTION_GEN_ANTHROPIC_MODEL || "claude-sonnet-4-5";
const OPENAI_MODEL = process.env.QUESTION_GEN_OPENAI_MODEL || "gpt-4.1";

// Scales with difficulty because a "hard" headliner square gets replayed
// far more (highest token_cost, most retries) — it needs the deepest bank
// to keep repeats rare. This is a target for admin's "top up" button, not
// a hard cap; admin can always request a specific count instead.
const TARGET_BANK_SIZE = { easy: 20, medium: 30, hard: 45 };

const DIFFICULTY_RUBRIC = {
  easy: "a fact a casual, non-fan festivalgoer would likely know (genre, a well-known hit, why they're famous)",
  medium: "a fact a genuine fan would know but a casual listener probably wouldn't (a deep cut track, a notable collab, a tour/album detail)",
  hard: "a fact only a deeply dedicated fan would know (an obscure release, a specific live moment, an origin-story detail that isn't common knowledge)",
};

function requireKeys() {
  const missing = [];
  if (!ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (missing.length) {
    throw new Error(
      `Question generation needs ${missing.join(" and ")} set on the server — add ${missing.length > 1 ? "them" : "it"} as environment variable(s) and restart before using this.`
    );
  }
}

async function callAnthropic(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callOpenAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in model response: " + text.slice(0, 300));
  return JSON.parse(match[0]);
}

// Step 1: draft `count` brand-new candidate questions with Claude, explicitly
// told which questions already exist (by text) so it doesn't just re-word
// the same 7 facts — the whole point is a bank deep enough that a random
// draw rarely repeats.
async function draftQuestions(artist, festival, count, existingTexts) {
  const prompt = `You are writing multiple-choice trivia questions about the artist/act "${artist.name}" (genre: ${artist.genre || "unknown"}), who is playing ${festival.name}.

Target difficulty tier: "${artist.difficulty}" — meaning ${DIFFICULTY_RUBRIC[artist.difficulty] || DIFFICULTY_RUBRIC.medium}.

Write ${count} NEW multiple-choice trivia questions about this artist. Each must:
- Be factually verifiable (real discography, real bio facts, real public info) — never invent facts.
- Have exactly 4 choices with exactly one correct answer.
- Match the "${artist.difficulty}" difficulty tier described above.
- Be meaningfully different from these questions that already exist in the bank (do not just reword them):
${existingTexts.length ? existingTexts.map((t) => `- ${t}`).join("\n") : "(bank is currently empty)"}

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"question_text": "...", "choice_a": "...", "choice_b": "...", "choice_c": "...", "choice_d": "...", "correct_choice": "a", "source_note": "brief note on where this fact comes from"}]`;

  const raw = await callAnthropic(prompt);
  const drafted = extractJson(raw);
  return Array.isArray(drafted) ? drafted : [];
}

// Step 2: two independent "blind" judges (one Claude call, one GPT call,
// neither shown which choice was marked correct) each answer the question
// and rate which difficulty tier it actually fits. This is the real
// cross-model check — not "does another model also like this question" but
// "does an independent model land on the same answer and the same
// difficulty tier without being told the answer key."
async function judgeQuestion(q, artist) {
  const prompt = `Answer this trivia question about "${artist.name}" and rate its difficulty. Respond with ONLY JSON, no other text: {"answer": "a"|"b"|"c"|"d", "difficulty": "easy"|"medium"|"hard"}

Question: ${q.question_text}
a) ${q.choice_a}
b) ${q.choice_b}
c) ${q.choice_c}
d) ${q.choice_d}

"easy" = a casual festivalgoer would know it. "medium" = a genuine fan would know it. "hard" = only a deeply dedicated fan would know it.`;

  const [claudeRaw, gptRaw] = await Promise.all([callAnthropic(prompt), callOpenAI(prompt)]);
  const claudeVerdict = extractJson(claudeRaw);
  const gptVerdict = extractJson(gptRaw);
  return { claude: claudeVerdict, gpt: gptVerdict };
}

// Drafts `count` candidates for one artist, verifies each with two blind
// independent judges, and inserts everything into `questions` — auto-
// approved only when both judges pick the drafted correct answer AND both
// land on the artist's assigned difficulty tier; everything else goes to
// verification_status='needs_review' with both verdicts attached so admin
// can see exactly why before it's ever shown to a real player.
async function generateAndVerifyQuestions(pool, artist, festival, count) {
  requireKeys();

  const { rows: existing } = await pool.query(`SELECT question_text FROM questions WHERE artist_id = $1`, [artist.id]);
  const drafted = await draftQuestions(artist, festival, count, existing.map((r) => r.question_text));

  let autoApproved = 0;
  let needsReview = 0;
  for (const q of drafted) {
    if (!q.question_text || !q.correct_choice) continue;
    let verdicts;
    try {
      verdicts = await judgeQuestion(q, artist);
    } catch (err) {
      verdicts = { error: err.message };
    }

    const bothCorrect =
      verdicts.claude?.answer === q.correct_choice && verdicts.gpt?.answer === q.correct_choice;
    const bothMatchDifficulty =
      verdicts.claude?.difficulty === artist.difficulty && verdicts.gpt?.difficulty === artist.difficulty;
    const approved = !verdicts.error && bothCorrect && bothMatchDifficulty;

    await pool.query(
      `INSERT INTO questions (artist_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_choice, drafted_by, verified_by, verification_status, estimated_difficulty, review_notes, source_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        artist.id,
        q.question_text,
        q.choice_a,
        q.choice_b,
        q.choice_c,
        q.choice_d,
        q.correct_choice,
        "claude",
        "claude+gpt",
        approved ? "auto_approved" : "needs_review",
        verdicts.claude?.difficulty || null,
        JSON.stringify(verdicts),
        q.source_note || null,
      ]
    );
    if (approved) autoApproved++;
    else needsReview++;
  }

  return { requested: count, drafted: drafted.length, auto_approved: autoApproved, needs_review: needsReview };
}

module.exports = { generateAndVerifyQuestions, TARGET_BANK_SIZE, requireKeys };
