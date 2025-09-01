import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { results, totalScore, rounds } = body || {};

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const roundSummaries = Array.isArray(results)
      ? results
          .map((r: any, i: number) => {
            const header = `Round ${i + 1} — ${
              r?.name ?? r?.id ?? "Unknown"
            }: score ${r?.score ?? 0}${r?.success ? " (success)" : " (fail)"}${
              r?.message ? ` — ${r.message}` : ""
            }`;
            const convo = r?.conversation
              ? `\nConversation:\n${r.conversation}`
              : "";
            return `${header}${convo}`;
          })
          .join("\n\n")
      : "";

    console.log("roundSummaries", roundSummaries);

    const prompt = `You are a witty commentator. Produce an X-friendly recap using emoji bullet lines.
Output format:
- One line per round: "<emoji> R{n}: <very short recap highlighting the player's best move>"
- Final line: "<emoji> Overall: <very short wrap-up>; Score: ${totalScore ?? 0}"

Constraints:
- Entire post must fit within 240 characters total (aim 200–240). No links, hashtags, or headers.
- Keep each line ultra concise. Use 1–3 word player quotes only if essential.
- Tone is playful and positive; no insults.

Rounds: ${rounds ?? 3}
Round details with transcripts (use sparingly):
${roundSummaries}`;

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: prompt,
      temperature: 0.9,
      max_output_tokens: 150,
    });

    // Prefer output_text if available, otherwise stitch text parts
    const summary = (response as any).output_text
      ? (response as any).output_text
      : (response as any)?.output
          ?.flatMap((o: any) =>
            o?.content?.map((c: any) =>
              c?.type === "output_text" ? c?.text : ""
            )
          )
          .filter(Boolean)
          .join("\n");

    return NextResponse.json(
      { summary: summary || "You played with style. The crowd goes wild." },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("/api/summary error", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500, headers: corsHeaders }
    );
  }
}
