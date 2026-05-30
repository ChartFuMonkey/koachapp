// lib/reports/ai.ts
// Generates the client + coach narrative via Claude. Uses structured outputs
// (output_config.format) so the JSON is schema-validated by the API. Returns
// empty strings on failure — the orchestrator still saves metrics + flags, and
// the coach can retry with "Regenerate".

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { WeeklyMetrics, Flag, AiSummaries, ReportLanguage } from "./types";

// Model for report generation. Igor chose Sonnet for higher-quality narrative.
export const REPORT_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You write weekly fitness-coaching reports from a JSON summary of one client's week.

You return two summaries:

client_summary — addressed to the client, warm and encouraging, 2 to 4 short paragraphs:
- How the week went and the biggest wins (cite real numbers from the data only).
- 2 to 3 concrete focus points for next week.
- If little was logged (low daysLogged), gently acknowledge the gap and encourage more consistent logging — never invent numbers.

coach_summary — addressed to the coach, concise and clinical, 1 short paragraph:
- Key changes vs targets and vs last week, adherence, training, and any concerns.

Rules:
- Use ONLY numbers present in the data. Do not fabricate measurements, weights, or PRs.
- No medical or diagnostic claims.
- Write BOTH summaries in {{LANGUAGE}}.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    client_summary: { type: "string" },
    coach_summary: { type: "string" },
  },
  required: ["client_summary", "coach_summary"],
  additionalProperties: false,
} as const;

export async function generateSummaries(args: {
  clientName: string;
  language: ReportLanguage;
  metrics: WeeklyMetrics;
  flags: Flag[];
}): Promise<AiSummaries> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const languageName = args.language === "hr" ? "Croatian" : "English";

  const resp = await client.messages.create({
    model: REPORT_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT.replace("{{LANGUAGE}}", languageName),
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content:
          `Client: ${args.clientName}\n` +
          `Week data (JSON):\n${JSON.stringify({ metrics: args.metrics, flags: args.flags })}`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // With output_config.format the text is schema-valid JSON; guard anyway.
  try {
    const parsed = JSON.parse(text) as Partial<AiSummaries>;
    return {
      client_summary: String(parsed.client_summary ?? "").trim(),
      coach_summary: String(parsed.coach_summary ?? "").trim(),
    };
  } catch {
    return { client_summary: "", coach_summary: "" };
  }
}
