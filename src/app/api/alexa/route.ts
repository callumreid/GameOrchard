import { NextRequest, NextResponse } from "next/server";
import verifier from "alexa-verifier";
import {
  GAME_KEYS,
  type GameKey,
} from "@/app/agentConfigs/chatSupervisor/prompts";
import { generateScenario, judgeAnswer, ttsSafe } from "./llm";

/**
 * Game Orchard — Alexa custom skill endpoint.
 *
 * Flow: Launch → host intro + scenario → player answers (catch-all slot)
 * → LLM judges → offer next round. After FREE_ROUNDS rounds per session,
 * non-subscribers get an Orchard Pass upsell (Amazon ISP); with no ISP
 * product configured yet the skill quietly stays free.
 *
 * Session state lives entirely in sessionAttributes — no database.
 */

export const runtime = "nodejs";
export const maxDuration = 10;

const FREE_ROUNDS_PER_SESSION = 2;
const HOST_VOICE = "Matthew";

const ALL_GAMES: GameKey[] = Object.values(GAME_KEYS);

interface SessionState {
  phase: "awaiting_answer" | "offer_next" | "offer_upsell";
  gameKey: GameKey;
  brief: string;
  rounds: number;
  entitled: boolean;
  productId: string | null;
  [key: string]: unknown; // Alexa sessionAttributes round-trip
}

// ---------------------------------------------------------------- helpers

function speak(text: string): string {
  return `<speak><voice name="${HOST_VOICE}">${text}</voice></speak>`;
}

function alexaResponse(opts: {
  ssmlText: string;
  reprompt?: string;
  endSession?: boolean;
  state?: SessionState | null;
  directives?: unknown[];
}) {
  return NextResponse.json({
    version: "1.0",
    sessionAttributes: opts.state ?? {},
    response: {
      outputSpeech: { type: "SSML", ssml: speak(opts.ssmlText) },
      ...(opts.reprompt
        ? {
            reprompt: {
              outputSpeech: { type: "SSML", ssml: speak(opts.reprompt) },
            },
          }
        : {}),
      ...(opts.directives ? { directives: opts.directives } : {}),
      shouldEndSession: opts.endSession ?? false,
    },
  });
}

function pickGame(exclude?: GameKey): GameKey {
  const pool = ALL_GAMES.filter((g) => g !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function gameTitle(gameKey: GameKey): string {
  return gameKey
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// ------------------------------------------------------------------- ISP

interface IspProduct {
  productId: string;
  entitled: boolean;
  purchasable: boolean;
}

async function fetchOrchardPass(
  apiEndpoint: string,
  apiAccessToken: string,
  locale: string
): Promise<IspProduct | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(
      `${apiEndpoint}/v1/users/~current/skills/~current/inSkillProducts`,
      {
        headers: {
          Authorization: `Bearer ${apiAccessToken}`,
          "Accept-Language": locale,
        },
        signal: ctrl.signal,
      }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      inSkillProducts?: Array<{
        productId: string;
        type: string;
        entitled: string;
        purchasable: string;
      }>;
    };
    const sub = body.inSkillProducts?.find((p) => p.type === "SUBSCRIPTION");
    if (!sub) return null;
    return {
      productId: sub.productId,
      entitled: sub.entitled === "ENTITLED",
      purchasable: sub.purchasable === "PURCHASABLE",
    };
  } catch {
    return null; // ISP not configured / API slow — skill stays free
  }
}

function buyDirective(productId: string) {
  return {
    type: "Connections.SendRequest",
    name: "Buy",
    payload: { InSkillProduct: { productId } },
    token: "orchard-pass-buy",
  };
}

// ------------------------------------------------------------ verification

async function verifyAlexaRequest(
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  if (process.env.ALEXA_SKIP_VERIFY === "1") return true;
  const certUrl = req.headers.get("signaturecertchainurl");
  const signature = req.headers.get("signature");
  if (!certUrl || !signature) return false;
  return new Promise((resolve) => {
    verifier(certUrl, signature, rawBody, (err?: Error | string | null) =>
      resolve(!err)
    );
  });
}

// ---------------------------------------------------------------- content

const WELCOME =
  "Welcome to the Game Orchard, where the games are absurd and the judge " +
  "gave up on idealism years ago. Here is how it works: I set the scene, " +
  "you say your answer, I score it with brutal honesty. ";

function scenarioIntro(gameKey: GameKey, brief: string): string {
  return `First up: ${gameTitle(gameKey)}. ${brief}`;
}

const ANSWER_REPROMPT =
  "Do not overthink it, contestant. Say your answer. Any answer.";

// ----------------------------------------------------------------- route

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifyAlexaRequest(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // Optional hard check that requests come from OUR skill once its id is known.
  const expectedSkill = process.env.ALEXA_SKILL_ID;
  const appId = body?.context?.System?.application?.applicationId;
  if (expectedSkill && appId && appId !== expectedSkill) {
    return NextResponse.json({ error: "wrong skill" }, { status: 403 });
  }

  const type: string = body?.request?.type ?? "";
  const state = (body?.session?.attributes ?? null) as SessionState | null;
  const system = body?.context?.System ?? {};

  try {
    if (type === "LaunchRequest") return await onLaunch(system);
    if (type === "IntentRequest") return await onIntent(body, state);
    if (type === "Connections.Response")
      return await onConnectionsResponse(body, state);
    if (type === "SessionEndedRequest") return NextResponse.json({});
    return alexaResponse({
      ssmlText: "The orchard heard something it did not understand. Goodbye.",
      endSession: true,
    });
  } catch {
    return alexaResponse({
      ssmlText:
        "The orchard tripped over its own roots. Try again in a moment.",
      endSession: true,
    });
  }
}

async function onLaunch(system: any) {
  const gameKey = pickGame();
  const [scenario, pass] = await Promise.all([
    generateScenario(gameKey),
    system?.apiEndpoint && system?.apiAccessToken
      ? fetchOrchardPass(
          system.apiEndpoint,
          system.apiAccessToken,
          "en-US"
        )
      : Promise.resolve(null),
  ]);

  const state: SessionState = {
    phase: "awaiting_answer",
    gameKey,
    brief: scenario.brief,
    rounds: 0,
    entitled: pass?.entitled ?? false,
    productId: pass && pass.purchasable ? pass.productId : null,
  };

  return alexaResponse({
    ssmlText: WELCOME + scenarioIntro(gameKey, scenario.brief),
    reprompt: ANSWER_REPROMPT,
    state,
  });
}

async function onIntent(body: any, state: SessionState | null) {
  const intent: string = body.request.intent?.name ?? "";
  const slots = body.request.intent?.slots ?? {};

  // Session-enders first.
  if (intent === "AMAZON.StopIntent" || intent === "AMAZON.CancelIntent") {
    return alexaResponse({
      ssmlText:
        "Fine, abandon the orchard. The fruit of victory rots without you. Goodbye.",
      endSession: true,
    });
  }

  if (intent === "AMAZON.HelpIntent") {
    return alexaResponse({
      ssmlText:
        "I describe a ridiculous situation, you say your best answer out loud, " +
        "and I score it out of one hundred with complete emotional detachment. " +
        (state?.phase === "awaiting_answer"
          ? `We are mid-round. ${state.brief}`
          : "Say yes to start a round."),
      reprompt: ANSWER_REPROMPT,
      state,
    });
  }

  // No session state (e.g. one-shot intent) → treat like a fresh launch.
  if (!state?.phase) {
    return onLaunch(body?.context?.System ?? {});
  }

  if (state.phase === "awaiting_answer") {
    if (intent === "PlayerAnswerIntent" || intent === "AMAZON.FallbackIntent") {
      const spoken: string =
        slots?.answer?.value ??
        (intent === "AMAZON.FallbackIntent" ? "" : "");
      if (!spoken) {
        return alexaResponse({
          ssmlText:
            "The judges heard silence, which is a bold strategy. Try again: say your answer.",
          reprompt: ANSWER_REPROMPT,
          state,
        });
      }
      return await judgeAndRespond(state, spoken);
    }
    if (intent === "AMAZON.YesIntent" || intent === "NextGameIntent") {
      // Player is confused mid-round; restate the challenge.
      return alexaResponse({
        ssmlText: `Answer the round first, eager beaver. ${state.brief}`,
        reprompt: ANSWER_REPROMPT,
        state,
      });
    }
    if (intent === "AMAZON.NoIntent") {
      return alexaResponse({
        ssmlText:
          "Refusing to play the round you are already in. Inspirational. Say an answer or say stop.",
        reprompt: ANSWER_REPROMPT,
        state,
      });
    }
  }

  if (state.phase === "offer_next") {
    if (
      intent === "AMAZON.YesIntent" ||
      intent === "NextGameIntent" ||
      intent === "PlayerAnswerIntent" ||
      intent === "AMAZON.FallbackIntent"
    ) {
      return await nextRound(state);
    }
    if (intent === "AMAZON.NoIntent") {
      return alexaResponse({
        ssmlText:
          "Quitting while you are ahead. The most cynical move of all — I respect it. Come back to the orchard soon.",
        endSession: true,
      });
    }
  }

  if (state.phase === "offer_upsell") {
    if (intent === "AMAZON.YesIntent") {
      if (state.productId) {
        return alexaResponse({
          ssmlText: "Sending you to the checkout orchard.",
          state,
          directives: [buyDirective(state.productId)],
        });
      }
      // ISP not configured yet — stay free rather than dead-end.
      return await nextRound(state);
    }
    if (intent === "AMAZON.NoIntent" || intent === "AMAZON.FallbackIntent") {
      return alexaResponse({
        ssmlText:
          "No pass, no more rounds today. That is capitalism, baby. Come back tomorrow for more free games, or say yes next time. Goodbye.",
        endSession: true,
      });
    }
  }

  return alexaResponse({
    ssmlText: "Lost in the orchard. Say help, or say your answer.",
    reprompt: ANSWER_REPROMPT,
    state,
  });
}

async function judgeAndRespond(state: SessionState, spoken: string) {
  const judgment = await judgeAnswer(
    state.gameKey,
    state.brief,
    ttsSafe(spoken)
  );
  const rounds = state.rounds + 1;
  const mustUpsell = !state.entitled && rounds >= FREE_ROUNDS_PER_SESSION;

  if (mustUpsell) {
    const upsellLine = state.productId
      ? " That is your free games for this visit. Want unlimited rounds? The Orchard Pass subscription unlocks every game, every day. Want to hear about it?"
      : " That is your free games for this visit, but the orchard is feeling generous today. Want another round?";
    const newState: SessionState = {
      ...state,
      rounds,
      phase: "offer_upsell",
    };
    return alexaResponse({
      ssmlText: judgment.reply + upsellLine,
      reprompt: state.productId
        ? "Want to hear about the Orchard Pass? Yes or no."
        : "Another round? Yes or no.",
      state: newState,
    });
  }

  const newState: SessionState = { ...state, rounds, phase: "offer_next" };
  return alexaResponse({
    ssmlText: judgment.reply + " Ready for the next game?",
    reprompt: "Next game? Yes or no.",
    state: newState,
  });
}

async function nextRound(state: SessionState) {
  const gameKey = pickGame(state.gameKey);
  const scenario = await generateScenario(gameKey);
  const newState: SessionState = {
    ...state,
    phase: "awaiting_answer",
    gameKey,
    brief: scenario.brief,
  };
  return alexaResponse({
    ssmlText: `Next up: ${gameTitle(gameKey)}. ${scenario.brief}`,
    reprompt: ANSWER_REPROMPT,
    state: newState,
  });
}

async function onConnectionsResponse(body: any, state: SessionState | null) {
  const result = body?.request?.payload?.purchaseResult;
  if (result === "ACCEPTED") {
    const newState: SessionState = {
      ...(state ?? {
        phase: "offer_next",
        gameKey: pickGame(),
        brief: "",
        rounds: 0,
        productId: null,
      }),
      entitled: true,
      phase: "offer_next",
    } as SessionState;
    return alexaResponse({
      ssmlText:
        "HOORAY BIG DOGS BARK BARK! You bought the Orchard Pass. Unlimited absurdity, forever, or until you cancel, whichever comes first. Ready for the next game?",
      reprompt: "Next game? Yes or no.",
      state: newState,
    });
  }
  return alexaResponse({
    ssmlText:
      "No pass today. The orchard understands. It does not forgive, but it understands. Come back tomorrow for more free rounds. Goodbye.",
    endSession: true,
  });
}
