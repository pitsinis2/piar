const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY || "";
const openAiBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function maskApiKey(key) {
  return key ? `********${key.slice(-6)}` : "missing";
}

function normalizeOpenAiError(error, fallbackStatus = 500) {
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

  return { type, message, status, code: error?.code || error?.type || null };
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

async function main() {
  console.log("OpenAI verification");
  console.log(`Model: ${model}`);
  console.log(`API Key: ${maskApiKey(apiKey)}`);
  console.log("");

  try {
    console.log("1. Verifying API key...");
    if (!apiKey) throw normalizeOpenAiError({ status: 503, code: "invalid_api_key", message: "OPENAI_API_KEY is not configured." }, 503);
    console.log("   API key exists.");

    console.log("2. Listing models...");
    const models = await openAiFetch("/models", { method: "GET" });
    const modelIds = Array.isArray(models?.data) ? models.data.map((item) => item.id) : [];
    console.log(`   Model list received: ${modelIds.length} models.`);

    console.log("3. Checking selected model...");
    if (!modelIds.includes(model)) {
      throw normalizeOpenAiError({
        status: 404,
        code: "model_not_found",
        message: `Selected model "${model}" was not found for this API key.`,
      }, 404);
    }
    console.log(`   Selected model is available: ${model}`);

    console.log("4. Sending tiny Responses API request...");
    const tiny = await openAiFetch("/responses", {
      method: "POST",
      body: JSON.stringify({
        model,
        input: "Reply with exactly: ok",
        max_output_tokens: 16,
      }),
    });
    console.log(`   Response: ${extractOutputText(tiny).trim()}`);
    console.log("");
    console.log("SUCCESS: OpenAI API is working for this key, model, and account.");
  } catch (error) {
    const normalized = normalizeOpenAiError(error);
    console.log("");
    console.log("FAILED: OpenAI API verification did not pass.");
    console.log(JSON.stringify(normalized, null, 2));
    process.exitCode = 1;
  }
}

main();
