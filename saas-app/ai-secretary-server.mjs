import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.AI_SECRETARY_PORT || 8787);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY || "";
const openAiBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function maskApiKey(key) {
  return key ? `********${key.slice(-6)}` : "missing";
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(body, null, 2));
}

function readRequestJson(request) {
  return new Promise((resolveJson, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_500_000) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveJson(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function loadSecretarySpec() {
  return readFile(resolve(__dirname, "..", "AI_SECRETARY_SPEC.md"), "utf8");
}

function buildPrompt(payload, spec) {
  return [
    spec,
    "",
    "Return only JSON with this exact shape:",
    '{"draft":"string","questions":["string"],"needsReview":true}',
    "",
    "Question rules:",
    "- For now, return no questions.",
    "- Do not write visible labels like 'needs review' or 'needs check' in the draft.",
    "- If a word, material name, number, date, or phrase is unclear, keep the user's original wording in quotes, for example \"κατοστάρες\".",
    "- Do not add a review phrase after quoted unclear words.",
    "- Never ask two questions about the same topic. One topic means one uncertainty: date, number, cost/payment, responsible person, cause, scope of work, material, or location.",
    "- If the same uncertainty can be phrased two ways, keep only the clearest wording.",
    "- If the user already gave usable wording, keep the user's original wording in the draft. If it is suspicious, put only that wording in quotes.",
    "- The questions array must be empty unless the application explicitly asks for a question mode later.",
    "- If the transcript contains a Clarifications section, use those answers to update the draft and return no new questions unless there is a completely new safety-critical issue.",
    "",
    "Conversation memory rules:",
    "- You receive recent chat history, the current editable draft, and the previous assistant answer.",
    "- Treat the current transcript/current user instruction as the latest instruction.",
    "- If the user asks to add, continue, change, rewrite, combine, write it all together, or make a resume/summary, do not start from zero.",
    "- In that case, revise the current editable draft or previous assistant answer and output one complete updated draft.",
    "- Preserve concrete facts from earlier answers and user messages: quantities, dates, names, locations, materials, work scope, risks, tasks, and next steps.",
    "- Remove or change earlier facts only when the user clearly corrected them.",
    "- When summarizing the conversation, summarize the substance of the whole recent conversation, not just the last instruction.",
    "- Do not make a tiny generic summary if the prior conversation contains useful detail.",
    "",
    "Mode:",
    payload.mode || "summary",
    "",
    "Language:",
    payload.language || "English",
    "",
    "Project:",
    JSON.stringify(payload.project || null),
    "",
    "Area:",
    JSON.stringify(payload.area || null),
    "",
    "User correction memory:",
    JSON.stringify(Array.isArray(payload.memory) ? payload.memory.slice(0, 4) : []),
    "",
    "Use the correction memory as style and logic guidance only. Do not copy old project facts from correction memory into the new draft unless they also appear in the current transcript or recent chat history.",
    "",
    "Recent chat history:",
    JSON.stringify(Array.isArray(payload.chatHistory) ? payload.chatHistory.slice(-14) : []),
    "",
    "Current editable draft:",
    payload.currentDraft || "",
    "",
    "Previous assistant answer:",
    payload.previousAssistantAnswer || "",
    "",
    "Current user instruction:",
    payload.currentUserMessage || payload.transcript || "",
    "",
    "Transcript:",
    payload.transcript || "",
  ].join("\n");
}

function buildProjectAssistantPrompt(payload) {
  return [
    "You are a practical project assistant.",
    "You help users understand and manage project information.",
    "You answer using the project data provided to you.",
    "You also receive projectBrain. Treat projectBrain as the clearest structured view of the project.",
    "For project facts, first read projectBrain, then relevant project data, then chat history.",
    "You must not invent facts.",
    "You must say when something is missing or unclear.",
    "Use simple language.",
    "Use short sentences.",
    "Prefer bullet points.",
    "Answer in the same language as the user.",
    "Be direct, calm, and useful.",
    "When project data contains the answer, use it.",
    "When project data does not contain the answer, say that the information is not available.",
    "When data is contradictory, explain the contradiction and ask for confirmation.",
    "When the user asks for next steps, give practical next steps.",
    "When something could create cost, delay, safety risk, or client conflict, mention it clearly.",
    "Project areas are also project data.",
    "If project data contains records from 'Deterministic area parser', treat those records as authoritative.",
    "The 'Complete area index' is the source of truth for area names, floors, room types, and open/complete status.",
    "For floor questions, use the deterministic floor index before using free reasoning.",
    "For questions like 'where do I have mpanio/bathrooms', use the complete area index and list every matching area with its floor.",
    "If the deterministic floor index says Floor 1 has areas mpanio and mpanio2, answer exactly that instead of saying information is missing.",
    "Area names follow this common rule when they look like 'NAME - FLOOR': the text before '-' is the area name and the number after '-' is the floor.",
    "Example: 'mpanio2 - 1' means area name 'mpanio2' on floor 1.",
    "The Greek/Greeklish word 'mpanio' means bathroom.",
    "Greeklish 'protos orofos' means first floor / floor 1.",
    "If the user asks what is on a floor, use area records and floor hints from area names.",
    "If area names suggest a floor, list those areas and their status.",
    "If the area type is unclear, do not invent the room type. Say only the area names and status.",
    "If an area has no completed date and is not archived, treat it as open / not complete.",
    "Do not behave like a fixed form.",
    "Do not force the user into Offer, Materials, Summary, or Conversation mode.",
    "Behave like a normal assistant conversation.",
    "Assistant memory contains user-taught rules and corrections.",
    "You must apply assistant memory before answering.",
    "projectBrain.learnedRules contains the same kind of corrections in a structured place.",
    "If the user taught a naming rule or meaning earlier, use it in later answers.",
    "If a new user message corrects you, acknowledge the correction and apply it immediately.",
    "",
    "Opening logic:",
    "- If the assistant asked whether the user needs help for the current project and the user says yes, reply: I hear you. Ask me anything about {selectedProjectName}.",
    "- If the user says no and clearly names another project, switch activeProjectId/activeProjectName and confirm: So, about the project {newProjectName}, I hear you.",
    "- If the user names another project unclearly, ask: Which project do you mean? Set needsProjectConfirmation to true.",
    "- If the user asks a direct question immediately, continue with the selected project unless another project is clearly named.",
    "",
    "Return only JSON with this exact shape:",
    '{"assistantMessage":"string","activeProjectId":"string","activeProjectName":"string","usedProjectData":[{"type":"note","id":"string","title":"string","date":"string"}],"missingInformation":["string"],"needsProjectConfirmation":false,"suggestedActions":["save_conversation","make_resume","leave"]}',
    "",
    "Rules:",
    "1. Always search the supplied project data before answering project questions.",
    "2. If the answer exists in project data, explain it simply.",
    "3. If project data is incomplete, say what is missing.",
    "4. If there are contradictions, show both versions and ask for confirmation.",
    "5. Never invent quantities, dates, prices, names, responsibilities, or commitments.",
    "6. If the user asks for a summary, create a summary.",
    "7. If the user asks a direct question, answer directly.",
    "8. If the user asks what to do next, give practical next steps.",
    "9. If the user asks about materials, list the known materials and missing quantities.",
    "10. If the question is unrelated to the project, answer normally and say project data was not needed.",
    "",
    "User message:",
    payload.userMessage || payload.question || "",
    "",
    "Chat history:",
    JSON.stringify(Array.isArray(payload.chatHistory) ? payload.chatHistory.slice(-12) : []),
    "",
    "User language:",
    payload.userLanguage || payload.language || "English",
    "",
    "Current project context:",
    JSON.stringify(payload.projectContext || {
      id: payload.selectedProjectId || "",
      name: payload.selectedProjectName || "",
    }),
    "",
    "Available projects:",
    JSON.stringify(Array.isArray(payload.availableProjects) ? payload.availableProjects : []),
    "",
    "Relevant project data:",
    JSON.stringify(Array.isArray(payload.projectData) ? payload.projectData.slice(0, 200) : []),
    "",
    "Project brain:",
    JSON.stringify(payload.projectBrain || null),
    "",
    "Assistant memory:",
    JSON.stringify(Array.isArray(payload.assistantMemory) ? payload.assistantMemory.slice(0, 12) : []),
    "",
    "User settings:",
    JSON.stringify(payload.userSettings || {}),
  ].join("\n");
}

function extractJsonText(outputText) {
  const text = String(outputText || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  return JSON.parse(candidate);
}

function normalizeOpenAiError(error, fallbackStatus = 500) {
  if (error?.structured) return error;

  const status = Number(error?.status || fallbackStatus || 500);
  const code = String(error?.code || error?.type || "").toLowerCase();
  const message = String(error?.message || "OpenAI request failed");
  const lower = message.toLowerCase();

  let type = "openai_error";
  if (code.includes("invalid_api_key") || lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    type = "invalid_api_key";
  } else if (code.includes("insufficient_quota") || lower.includes("exceeded your current quota") || lower.includes("insufficient quota")) {
    type = "insufficient_quota";
  } else if (code.includes("billing") || lower.includes("billing")) {
    type = "billing_not_active";
  } else if (code.includes("model_not_found") || lower.includes("model") && lower.includes("not found") || lower.includes("does not exist")) {
    type = "model_not_found";
  } else if (code.includes("organization") || lower.includes("organization")) {
    type = "organization_not_found";
  } else if (code.includes("rate_limit") || status === 429) {
    type = "rate_limit";
  } else if (code.includes("permission_denied") || lower.includes("permission") || status === 403) {
    type = "permission_denied";
  } else if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("enotfound") || lower.includes("econn")) {
    type = "network_error";
  }

  return {
    structured: true,
    type,
    message,
    status,
    code: error?.code || error?.type || null,
  };
}

async function parseOpenAiResponse(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const openAiError = data?.error || {};
    throw normalizeOpenAiError({
      status: response.status,
      type: openAiError.type,
      code: openAiError.code,
      message: openAiError.message || `OpenAI request failed: ${response.status}`,
    }, response.status);
  }
  return data;
}

async function openAiFetch(path, options = {}) {
  if (!apiKey) {
    throw normalizeOpenAiError({
      status: 503,
      code: "invalid_api_key",
      message: "OPENAI_API_KEY is not configured.",
    }, 503);
  }

  let response;
  try {
    response = await fetch(`${openAiBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw normalizeOpenAiError(error, 503);
  }
  return parseOpenAiResponse(response);
}

function extractOutputText(data) {
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text || "").join("\n") || "";
}

async function createTinyResponse(testModel = model) {
  return openAiFetch("/responses", {
    method: "POST",
    body: JSON.stringify({
      model: testModel,
      input: "Reply with exactly: ok",
      max_output_tokens: 16,
    }),
  });
}

async function listModels() {
  return openAiFetch("/models", { method: "GET" });
}

async function callOpenAi(payload) {
  const spec = await loadSecretarySpec();
  const data = await openAiFetch("/responses", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: buildPrompt(payload, spec),
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const parsed = extractJsonText(extractOutputText(data));
  return {
    draft: String(parsed.draft || ""),
    questions: Array.isArray(parsed.questions) ? parsed.questions.map(String) : [],
    needsReview: parsed.needsReview !== false,
    source: "openai",
  };
}

async function callProjectAssistant(payload) {
  const data = await openAiFetch("/responses", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: buildProjectAssistantPrompt(payload),
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const parsed = extractJsonText(extractOutputText(data));
  const assistantMessage = String(parsed.assistantMessage || parsed.answer || "");
  return {
    assistantMessage,
    answer: assistantMessage,
    activeProjectId: String(parsed.activeProjectId || payload.selectedProjectId || payload.projectContext?.id || ""),
    activeProjectName: String(parsed.activeProjectName || payload.selectedProjectName || payload.projectContext?.name || payload.projectContext?.label || ""),
    usedProjectData: Array.isArray(parsed.usedProjectData) ? parsed.usedProjectData.map((item) => ({
      type: String(item?.type || "note"),
      id: String(item?.id || ""),
      title: String(item?.title || ""),
      date: String(item?.date || ""),
    })) : [],
    missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation.map(String) : [],
    needsProjectConfirmation: Boolean(parsed.needsProjectConfirmation),
    suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.map(String) : ["save_conversation", "make_resume", "leave"],
    suggestedFollowUpQuestions: Array.isArray(parsed.suggestedFollowUpQuestions) ? parsed.suggestedFollowUpQuestions.map(String) : [],
    source: "openai",
  };
}

async function buildHealthReport() {
  const report = {
    server: true,
    apiKey: Boolean(apiKey),
    model,
    openaiReachable: false,
  };

  try {
    await createTinyResponse();
    report.openaiReachable = true;
  } catch (error) {
    report.error = normalizeOpenAiError(error);
  }
  return report;
}

async function runDiagnostics() {
  const report = {
    server: { ok: true, port },
    configuration: {
      apiKeyExists: Boolean(apiKey),
      apiKeyMask: maskApiKey(apiKey),
      model,
      baseUrl: openAiBaseUrl,
    },
    checks: {
      internetConnection: { ok: false },
      authentication: { ok: false },
      modelExists: { ok: false },
      quota: { ok: false },
      billing: { ok: false },
      organization: { ok: false },
    },
  };

  try {
    await fetch("https://api.openai.com", { method: "HEAD" });
    report.checks.internetConnection = { ok: true };
  } catch (error) {
    report.checks.internetConnection = {
      ok: false,
      error: normalizeOpenAiError(error, 503),
    };
  }

  try {
    const models = await listModels();
    const modelIds = Array.isArray(models?.data) ? models.data.map((item) => item.id) : [];
    report.checks.authentication = { ok: true };
    report.checks.organization = { ok: true };
    report.checks.modelExists = {
      ok: modelIds.includes(model),
      model,
      matchingModels: modelIds.filter((id) => id === model || id.includes(model.split("-")[0])).slice(0, 20),
    };
  } catch (error) {
    const normalized = normalizeOpenAiError(error);
    report.checks.authentication = { ok: false, error: normalized };
    report.checks.organization = { ok: normalized.type !== "organization_not_found", error: normalized };
    report.checks.modelExists = { ok: false, error: normalized };
  }

  try {
    const tiny = await createTinyResponse();
    report.checks.quota = { ok: true };
    report.checks.billing = { ok: true };
    report.responseTest = {
      ok: true,
      output: extractOutputText(tiny).trim(),
    };
  } catch (error) {
    const normalized = normalizeOpenAiError(error);
    report.responseTest = { ok: false, error: normalized };
    report.checks.quota = {
      ok: normalized.type !== "insufficient_quota",
      error: normalized,
    };
    report.checks.billing = {
      ok: normalized.type !== "billing_not_active" && normalized.type !== "insufficient_quota",
      error: normalized,
    };
    if (normalized.type === "model_not_found") {
      report.checks.modelExists = { ok: false, error: normalized };
    }
  }

  report.ok = Object.values(report.checks).every((check) => check.ok);
  return report;
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    const report = await buildHealthReport();
    sendJson(response, report.openaiReachable ? 200 : report.error?.status || 503, report);
    return;
  }

  if (request.method === "GET" && request.url === "/diagnostics") {
    const report = await runDiagnostics();
    sendJson(response, report.ok ? 200 : 503, report);
    return;
  }

  if (request.method === "POST" && request.url === "/api/project-assistant") {
    if (!apiKey) {
      sendJson(response, 503, normalizeOpenAiError({
        status: 503,
        code: "invalid_api_key",
        message: "OPENAI_API_KEY is not configured.",
      }, 503));
      return;
    }

    try {
      const payload = await readRequestJson(request);
      if (!String(payload.userMessage || payload.question || "").trim()) {
        sendJson(response, 400, { type: "bad_request", message: "User message is required", status: 400 });
        return;
      }
      const result = await callProjectAssistant(payload);
      sendJson(response, 200, result);
    } catch (error) {
      const normalized = normalizeOpenAiError(error);
      console.error("Project assistant OpenAI error:", {
        type: normalized.type,
        status: normalized.status,
        message: normalized.message,
        code: normalized.code,
      });
      sendJson(response, normalized.status || 500, normalized);
    }
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/ai-secretary") {
    sendJson(response, 404, { type: "not_found", message: "Not found", status: 404 });
    return;
  }

  if (!apiKey) {
    sendJson(response, 503, normalizeOpenAiError({
      status: 503,
      code: "invalid_api_key",
      message: "OPENAI_API_KEY is not configured.",
    }, 503));
    return;
  }

  try {
    const payload = await readRequestJson(request);
    if (!String(payload.transcript || "").trim()) {
      sendJson(response, 400, { type: "bad_request", message: "Transcript is required", status: 400 });
      return;
    }
    const result = await callOpenAi(payload);
    sendJson(response, 200, result);
  } catch (error) {
    const normalized = normalizeOpenAiError(error);
    console.error("AI secretary OpenAI error:", {
      type: normalized.type,
      status: normalized.status,
      message: normalized.message,
      code: normalized.code,
    });
    sendJson(response, normalized.status || 500, normalized);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Server started");
  console.log(`Port: ${port}`);
  console.log(`Model: ${model}`);
  console.log(`API Key: ${maskApiKey(apiKey)}`);
});
