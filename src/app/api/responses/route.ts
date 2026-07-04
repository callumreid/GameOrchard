import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { corsHeadersFor, rateLimit } from "../../lib/apiGuard";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeadersFor(req),
  });
}

// Proxy endpoint for the OpenAI Responses API
export async function POST(req: NextRequest) {
  const corsHeaders = corsHeadersFor(req);

  const limit = rateLimit(req, "responses", 60, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: { ...corsHeaders, "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  const body = await req.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (body.text?.format?.type === "json_schema") {
    return await structuredResponse(openai, body, corsHeaders);
  } else {
    return await textResponse(openai, body, corsHeaders);
  }
}

async function structuredResponse(
  openai: OpenAI,
  body: any,
  corsHeaders: Record<string, string>
) {
  try {
    const response = await openai.responses.parse({
      ...(body as any),
      stream: false,
    });

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (err: any) {
    console.error("responses proxy error", err);
    return NextResponse.json(
      { error: "failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function textResponse(
  openai: OpenAI,
  body: any,
  corsHeaders: Record<string, string>
) {
  try {
    const response = await openai.responses.create({
      ...(body as any),
      stream: false,
    });

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (err: any) {
    console.error("responses proxy error", err);
    return NextResponse.json(
      { error: "failed" },
      { status: 500, headers: corsHeaders }
    );
  }
}
