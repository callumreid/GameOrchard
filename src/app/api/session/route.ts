import { NextRequest, NextResponse } from "next/server";
import { corsHeadersFor, rateLimit } from "../../lib/apiGuard";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeadersFor(req),
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = corsHeadersFor(req);

  // Each call mints a paid OpenAI Realtime session — keep it sane per IP.
  const limit = rateLimit(req, "session", 30, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sessions, take a breather in the orchard." },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(limit.retryAfterSec),
        },
      }
    );
  }

  try {
    // OpenAI retired the beta /v1/realtime/sessions endpoint; ephemeral
    // tokens now come from /v1/realtime/client_secrets (GA API).
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime",
          },
        }),
      }
    );
    const data = await response.json();
    // Keep the old response shape the client reads (client_secret.value).
    const compat = data?.value
      ? { ...data, client_secret: { value: data.value } }
      : data;
    return NextResponse.json(compat, { headers: corsHeaders });
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
