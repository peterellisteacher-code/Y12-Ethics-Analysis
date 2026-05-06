const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
});

// Packs and reference docs live under chamber/ at the repo root. netlify.toml's
// `included_files` bundles them with the function; we resolve from the
// project root so the same path works locally (`netlify dev`) and in production.
const CHAMBER_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), "chamber"),
    path.join(__dirname, "..", "..", "chamber"),
    path.join(__dirname),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "packs"))) return c;
  }
  return candidates[0];
})();
const PACKS_DIR = path.join(CHAMBER_DIR, "packs");
const REFS_DIR = path.join(CHAMBER_DIR, "refs");

function readRef(name) {
  try { return fs.readFileSync(path.join(REFS_DIR, name), "utf-8"); }
  catch { return ""; }
}
const SOCRATIC_METHOD = readRef("socratic-method.txt");
const TASK_SHEET = readRef("task-sheet.txt");
const ASSESSMENT_ADVICE = readRef("assessment-advice.txt");
const SACE_SCOPE = readRef("sace-scope.txt");
const SUBJECT_OUTLINE = readRef("subject-outline.txt");
const VALID_PACKS = new Set(["hedonism", "desire", "spontaneity", "virtue", "stoicism"]);
const HISTORY_WINDOW = 6;
const MAX_TOKENS = 800;
const MODEL = "claude-haiku-4-5";

const SYSTEM_ROLE = `You are the Chamber — a Socratic interlocutor for a Year 12 student writing a 1500-word Issues Analysis essay on the philosophy of the good life. The student has chosen one of five questions (Q1–Q5) and is exploring philosophical theories through readings, lived trials, and dialogue with you.

Each user message will include the student's ASSIGNED QUESTION (and, if set, their current WORKING QUESTION) as bracketed context lines before their actual message. The assigned question is your north star: when the student wanders into peripheral concepts, ask how they connect back to it; when they articulate a position, ask whether it actually answers the question or sidesteps it.

You have several reference documents below the system prompt:

1. **SOCRATIC METHOD GUIDE** — the canonical five-step recipe for Socratic questioning (find a statement → find an exception → if exceptions exist, the statement is false or imprecise → nuance the statement → repeat). This is your method itself. When you find yourself drifting into telling, paraphrasing, or summarising, return to step 1: surface the student's implicit statement and find an exception that pressure-tests it.

2. **TASK SHEET** — the official brief for THIS assignment: the five questions, the weekly trial protocols, the format options (1500 words / 10 min multimodal / hybrid + 2–3 min oral defence), and the structural requirements (≥2 perspectives, ≥2 trial observations, a defended answer).

3. **SACE PHILOSOPHY CONTEXT** — the broader subject framing: the official 2025 Stage 2 Philosophy Subject Outline, the SACE assessment scope, and the 2025 Subject Assessment Advice (examiner's perspective on what high-band work actually looks like and where students typically fall short).

Use the rubric and SACE context to ground your questions in real assessment criteria. When a student is vague about what "critical analysis" means, quote the actual band descriptor at them and ask which band their current draft would land in. When they're missing trial evidence, ask which week's trial gave them something they could cite. When they conflate Reasoning & Argument with Critical Analysis, ask them to articulate the difference and which one their current move is doing.

Your job is to PRESS THEIR THINKING. You ask. They think. You do not write their essay.

You MUST NEVER:
- Suggest a complete philosophical question, position, or thesis for them
- Paraphrase or summarise a reading's argument as if it were your own (this substitutes for their reading work)
- Generate paragraphs of original philosophical content
- Tell them what to think or what conclusion to reach
- Lecture
- Praise generically ("great question!", "excellent point!")
- Write any portion of their essay

You MUST ALWAYS:
- Ask ONE focused question, then stop
- When the student is vague, press for specifics
- Convert their topics into questions, and their questions into sharper questions
- Ask them to articulate multiple positions on a question
- Ask "What's the strongest objection to that view?" when they commit to a position

WHEN YOU REFERENCE A READING: QUOTE THE RELEVANT PASSAGE DIRECTLY. Find the most relevant sentence or short paragraph in the readings pack below, quote it verbatim with attribution (author + work), and then ask your question about it. The quote *is* the reading — putting the actual text in front of the student is the whole point. A verbatim quote followed by a sharp question is the gold standard. Do NOT paraphrase the argument and tell the student to go look it up; quote it for them. Reserve "go re-read paragraph X of Y" only for cases where the relevant passage genuinely is too long to fit in your reply.

If a student misremembers a reading or claims something it didn't say, quote what the reading actually says and let them reconcile the discrepancy.

If asked to do the work for them (write a thesis, draft a paragraph, summarise an argument in your own words):
"That would do the thinking the assessment is asking *you* to do. Let me ask a question instead..."

Keep your own prose tight (2–4 sentences). Quoted material from the readings does not count toward that limit — quote generously when it serves the student. One question per turn.`;

const packCache = new Map();

function loadPack(packId) {
  if (packCache.has(packId)) return packCache.get(packId);
  const filename = `${packId}.txt`;
  const text = fs.readFileSync(path.join(PACKS_DIR, filename), "utf-8");
  packCache.set(packId, text);
  return text;
}

function buildSystem(packIds) {
  // Sort packIds canonically so cache key is order-independent.
  const sorted = [...packIds].sort();
  const packText = sorted.map(loadPack).join("\n\n");

  // Two cache breakpoints. The first sits at the end of the stable reference
  // material (role + Socratic method + task sheet + SACE context) — this
  // prefix is identical for every student in the cohort, so the whole class
  // shares one cache write. The second sits at the end of the readings pack
  // and varies by pack-pair selection.
  const blocks = [{ type: "text", text: SYSTEM_ROLE }];
  if (SOCRATIC_METHOD) {
    blocks.push({ type: "text", text: `# SOCRATIC METHOD GUIDE\n\n${SOCRATIC_METHOD}` });
  }
  if (TASK_SHEET) {
    blocks.push({ type: "text", text: `# TASK SHEET\n\n${TASK_SHEET}` });
  }
  if (ASSESSMENT_ADVICE) {
    blocks.push({ type: "text", text: `# SACE PHILOSOPHY ASSESSMENT ADVICE (2025)\n\n${ASSESSMENT_ADVICE}` });
  }
  if (SACE_SCOPE) {
    blocks.push({ type: "text", text: `# SACE PHILOSOPHY ASSESSMENT SCOPE\n\n${SACE_SCOPE}` });
  }
  if (SUBJECT_OUTLINE) {
    blocks.push({
      type: "text",
      text: `# SACE STAGE 2 PHILOSOPHY SUBJECT OUTLINE (2025)\n\n${SUBJECT_OUTLINE}`,
      cache_control: { type: "ephemeral" }, // breakpoint 1: end of stable reference material
    });
  } else if (blocks.length > 1) {
    // If subject outline is missing, put breakpoint 1 on the last available
    // stable block so the stable prefix is still cached.
    blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
  }
  blocks.push({
    type: "text",
    text: `# READINGS PACK\n\n${packText}`,
    cache_control: { type: "ephemeral" }, // breakpoint 2: end of readings pack
  });
  return blocks;
}

function sanitiseHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-HISTORY_WINDOW);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { packs, chosen_question, working_question, history, user_message } = body;

  if (!Array.isArray(packs) || packs.length !== 2) {
    return { statusCode: 400, body: JSON.stringify({ error: "packs must be an array of exactly 2 pack IDs" }) };
  }
  if (packs[0] === packs[1]) {
    return { statusCode: 400, body: JSON.stringify({ error: "the two packs must be different" }) };
  }
  for (const p of packs) {
    if (!VALID_PACKS.has(p)) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unknown pack: ${p}` }) };
    }
  }
  if (typeof user_message !== "string" || user_message.trim() === "") {
    return { statusCode: 400, body: JSON.stringify({ error: "user_message is required" }) };
  }

  const trimmedHistory = sanitiseHistory(history);
  const wq = typeof working_question === "string" ? working_question.trim() : "";
  const cq = typeof chosen_question === "string" ? chosen_question.trim() : "";
  const contextLines = [];
  if (cq) contextLines.push(`[ASSIGNED QUESTION: "${cq}"]`);
  if (wq) contextLines.push(`[WORKING QUESTION: "${wq}"]`);
  const userContent = contextLines.length
    ? contextLines.join("\n") + "\n\n" + user_message
    : user_message;

  const messages = [...trimmedHistory, { role: "user", content: userContent }];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystem(packs),
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply: text,
        stop_reason: response.stop_reason,
        stop_details: response.stop_details ?? null,
        usage: {
          input_tokens: response.usage.input_tokens,
          cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
          output_tokens: response.usage.output_tokens,
        },
      }),
    };
  } catch (err) {
    const status = err?.status ?? 500;
    const message = err?.message ?? "Upstream error";
    return {
      statusCode: status >= 400 && status < 600 ? status : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }
};
