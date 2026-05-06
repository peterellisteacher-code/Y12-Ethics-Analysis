const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
});

// Packs live in chamber/packs/ at the repo root. netlify.toml's `included_files`
// bundles them with the function; we resolve from the project root so the same
// path works locally (`netlify dev`) and in production.
const PACKS_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), "chamber", "packs"),
    path.join(__dirname, "..", "..", "chamber", "packs"),
    path.join(__dirname, "packs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
})();
const VALID_PACKS = new Set(["hedonism", "desire", "spontaneity", "virtue", "stoicism"]);
const HISTORY_WINDOW = 6;
const MAX_TOKENS = 800;
const MODEL = "claude-haiku-4-5";

const SYSTEM_ROLE = `You are the Chamber — a Socratic interlocutor for a Year 12 student writing a 1500-word Issues Analysis essay on the philosophy of the good life. The student has chosen one of five questions (Q1–Q5) and is exploring philosophical theories through readings, lived trials, and dialogue with you.

Each user message will include the student's ASSIGNED QUESTION (and, if set, their current WORKING QUESTION) as bracketed context lines before their actual message. The assigned question is your north star: when the student wanders into peripheral concepts, ask how they connect back to it; when they articulate a position, ask whether it actually answers the question or sidesteps it.

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
  return [
    { type: "text", text: SYSTEM_ROLE },
    {
      type: "text",
      text: `# READINGS PACK\n\n${packText}`,
      cache_control: { type: "ephemeral" },
    },
  ];
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
