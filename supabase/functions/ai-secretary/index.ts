import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = "gpt-4-mini"; // Fast, cost-effective model

const PLUMBER_SYSTEM_PROMPT = `You are an AI assistant for a plumbing and HVAC construction company. Your role is to help with:
- Project planning and scheduling
- Task organization for plumbing teams
- Equipment and material recommendations
- Safety reminders for plumbing work
- Troubleshooting common plumbing issues
- Estimating project timelines and resource needs
- Organizing work areas and team assignments

Always provide practical, actionable advice suited to plumbing professionals. Be concise and professional.
Context includes project names, team member names, areas being worked on, and equipment lists from the workspace.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { question, context = "", mode = "summary" } = body;

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build the user message with context
    let userMessage = question;
    if (context) {
      userMessage = `Context: ${context}\n\nQuestion: ${question}`;
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: PLUMBER_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI error:", error);
      return new Response(
        JSON.stringify({
          error: error.error?.message || "OpenAI request failed",
          type: error.error?.type,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No response from AI";

    return new Response(
      JSON.stringify({
        answer,
        source: "openai",
        model: OPENAI_MODEL,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
