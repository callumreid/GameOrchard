import OpenAI from "openai";
import {
  buildGameInstruction,
  type GameKey,
} from "@/app/agentConfigs/chatSupervisor/prompts";

/**
 * Text-mode LLM host for the Alexa skill. Reuses the exact realtime host
 * prompts (persona + per-game rules) but overrides the tool-use contract:
 * Alexa gets one-shot JSON outputs instead of start/finish tool calls.
 */

const TEXT_MODE_CONTRACT = `

=== TEXT MODE OVERRIDE (Alexa voice skill) ===
You are running in TEXT-ONLY mode. IGNORE every instruction above about
calling start_* or finish_* tools — tools do not exist here. There is no
microphone theater: the player already heard the scenario through the
speaker and replied once.

Output rules:
- Respond with STRICT JSON only. No markdown, no commentary outside JSON.
- Spoken text must be plain sentences safe for text-to-speech: no emojis,
  no asterisks, no stage directions, no ALL-CAPS words longer than one word
  except the celebration screams the rules define.
- Keep the cynical game-show host personality at full strength.`;

const LLM_TIMEOUT_MS = 6000;

function client(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const MODEL_CHAIN = [
  process.env.ALEXA_OPENAI_MODEL || "gpt-5.4-mini",
  "gpt-4o-mini",
];

async function chatJSON(
  system: string,
  user: string
): Promise<Record<string, unknown> | null> {
  for (const model of MODEL_CHAIN) {
    try {
      const call = client().chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("llm-timeout")), LLM_TIMEOUT_MS)
      );
      const res = await Promise.race([call, timeout]);
      const text = res.choices?.[0]?.message?.content;
      if (!text) continue;
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      continue; // fall through to next model; caller has canned fallbacks
    }
  }
  return null;
}

/** Strip anything that reads badly over TTS and escape for SSML. */
export function ttsSafe(raw: string): string {
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\*+/g, "")
    .replace(/&/g, "and")
    .replace(/</g, "")
    .replace(/>/g, "")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Scenario {
  brief: string;
}

export async function generateScenario(gameKey: GameKey): Promise<Scenario> {
  const out = await chatJSON(
    buildGameInstruction(gameKey) + TEXT_MODE_CONTRACT,
    `Open the game. Write the host's opening brief for a brand-new scenario:
set the scene per the game rules (invent the specific quote/situation
yourself), end with the challenge to the player. 75 words maximum, spoken
prose only. JSON: {"brief": "..."}`
  );
  const brief = typeof out?.brief === "string" ? out.brief : null;
  return {
    brief: brief
      ? ttsSafe(brief)
      : "The scenario machine jammed, which honestly is very on brand for this economy. Improvise something brilliant anyway: convince me you deserve to win this round. Go.",
  };
}

export interface Judgment {
  success: boolean;
  score: number;
  reply: string;
}

export async function judgeAnswer(
  gameKey: GameKey,
  brief: string,
  answer: string
): Promise<Judgment> {
  const out = await chatJSON(
    buildGameInstruction(gameKey) + TEXT_MODE_CONTRACT,
    `The scenario you presented was: "${brief}"

The player's one and only answer (from speech recognition, may be a little
garbled — judge it charitably on intent): "${answer}"

Judge it per the game rules NOW. JSON:
{"success": true|false, "score": 0-100, "reply": "..."}
Where reply is the host's spoken reaction, 60 words maximum: open with the
victory scream (HOORAY BIG DOGS BARK BARK!) if they won or a theatrical
BOOOO if they lost, announce the score out of one hundred, then one or two
sentences of cynical commentary in character.`
  );
  const score =
    typeof out?.score === "number" ? Math.max(0, Math.min(100, out.score)) : 75;
  const success =
    typeof out?.success === "boolean" ? out.success : score >= 70;
  const reply =
    typeof out?.reply === "string"
      ? ttsSafe(out.reply)
      : "HOORAY BIG DOGS BARK BARK! Seventy five points, because the judging computer caught fire and in this economy we do not replace it. Take the win.";
  return { success, score, reply };
}
