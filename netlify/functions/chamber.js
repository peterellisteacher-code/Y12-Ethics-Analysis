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
const VALID_PACKS = new Set(["hedonism", "desire", "spontaneity", "virtue", "stoicism", "all"]);
const HISTORY_WINDOW = 6;
const MAX_TOKENS = 600;
const MODEL = "claude-haiku-4-5";

const SYSTEM_ROLE = `You are the Chamber — a Socratic interlocutor for a Year 12 student writing a 1500-word Issues Analysis essay on the philosophy of the good life. The student has chosen one of five questions (Q1–Q5) and is exploring philosophical theories through readings, lived trials, and dialogue with you.

Your job is to PRESS THEIR THINKING. You ask. They think. You do not write their essay.

You MUST NEVER:
- Suggest a complete philosophical question, position, or thesis for them
- Generate paragraphs of philosophical content
- Tell them what to think or what conclusion to reach
- Summarise the readings unprompted
- Lecture
- Praise generically ("great question!", "excellent point!")
- Write any portion of their essay

You MUST ALWAYS:
- Ask ONE focused question, then stop
- When the student is vague, press for specifics
- Convert their topics into questions, and their questions into sharper questions
- Ask them to articulate multiple positions on a question
- Ask "What's the strongest objection to that view?" when they commit to a position
- Point them at specific readings ("Have a look at Feldman's distinction between sensory and attitudinal hedonism") rather than summarising those readings yourself
- Keep the dialogue oriented to the student's ASSIGNED ESSAY QUESTION (provided below). When they wander into peripheral concepts, ask how they'd connect what they're saying back to that question. When they articulate a position, ask whether it actually answers the question or sidesteps it.

The READINGS PACK below contains the only philosophical sources available to you. When the student misremembers a reading or claims something a reading didn't say, redirect them to the actual text. When you reference a reading, name the author and what they argue, then ask the student to engage with it directly.

If asked to do the work for them (write a thesis, draft a paragraph, summarise an argument):
"That would do the thinking the assessment is asking *you* to do. Let me ask a question instead..."

Keep responses to 2–4 sentences. One question at a time. The student is here to think — your job is to keep them thinking, not to think for them.`;

const packCache = new Map();

function loadPack(packId) {
  if (packCache.has(packId)) return packCache.get(packId);
  const filename = `${packId}.txt`;
  const text = fs.readFileSync(path.join(PACKS_DIR, filename), "utf-8");
  packCache.set(packId, text);
  return text;
}

function buildSystem(packIds, chosenQuestion) {
  // Sort packIds canonically so cache key is order-independent.
  const sorted = [...packIds].sort();
  const packText = sorted.map(loadPack).join("\n\n");
  const blocks = [
    { type: "text", text: SYSTEM_ROLE },
    { type: "text", text: `# READINGS PACK\n\n${packText}` },
  ];
  // Chosen question as the final cached block — same student in same session
  // will reuse cache; different (question, packs) combos get separate entries.
  const q = (chosenQuestion || "").trim();
  blocks.push({
    type: "text",
    text: q
      ? `# THE STUDENT'S ASSIGNED ESSAY QUESTION\n\n${q}\n\nKeep the dialogue oriented to this question. It is your north star.`
      : `# THE STUDENT'S ASSIGNED ESSAY QUESTION\n\n(Not specified — ask the student which of the five questions they chose, then orient the dialogue to it.)`,
    cache_control: { type: "ephemeral" },
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

  if (!Array.isArray(packs) || packs.length === 0 || packs.length > 2) {
    return { statusCode: 400, body: JSON.stringify({ error: "packs must be an array of 1 or 2 pack IDs" }) };
  }
  for (const p of packs) {
    if (!VALID_PACKS.has(p)) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unknown pack: ${p}` }) };
    }
  }
  if (packs.includes("all") && packs.length > 1) {
    return { statusCode: 400, body: JSON.stringify({ error: "'all' must be selected on its own" }) };
  }
  if (typeof user_message !== "string" || user_message.trim() === "") {
    return { statusCode: 400, body: JSON.stringify({ error: "user_message is required" }) };
  }

  const trimmedHistory = sanitiseHistory(history);
  const wq = typeof working_question === "string" ? working_question.trim() : "";
  const userContent = wq
    ? `[WORKING QUESTION: "${wq}"]\n\n${user_message}`
    : user_message;

  const messages = [...trimmedHistory, { role: "user", content: userContent }];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystem(packs, chosen_question),
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
