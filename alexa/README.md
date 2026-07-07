# Game Orchard — Alexa skill package

Voice port of the Game Orchard microgames. The backend is
`/api/alexa` in this repo (deployed on Vercel with the site) — it reuses the
exact realtime host prompts in text mode: scenario brief → player answer
(catch-all slot) → LLM judge → score + BARK BARK.

Costs pennies per round (two gpt-5.4-mini/gpt-4o-mini JSON calls) instead of
the realtime-audio dollars the web version burns.

## Console setup (one-time, ~15 min)

1. developer.amazon.com/alexa/console/ask → Create Skill
   - Name: **Game Orchard**, locale en-US
   - Type: **Custom**, Hosting: **Provision your own**
2. Build tab → JSON Editor → paste `interaction-model.json` → Save → Build model.
3. Endpoint → HTTPS
   - Default region: `https://www.gameorchard.beer/api/alexa/`
   - Cert type: *"My development endpoint has a certificate from a trusted
     certificate authority"* (Vercel cert)
4. Copy the Skill ID → `vercel env add ALEXA_SKILL_ID` (locks the endpoint
   to this skill), redeploy.
5. Test tab → set to Development → type or say "open game orchard".

## Orchard Pass (ISP subscription)

Monetization tab → In-Skill Products → Create:
- Type: **Subscription**, reference name `orchard_pass`
- Price: **$1.99/month**, 7-day free trial
- Link to skill. The backend auto-detects it via the ISP API: until the
  product exists, the skill is simply free-unlimited-ish (2 free rounds per
  session then a generous "want another?").

## Env vars (Vercel, gameorchard project)

- `OPENAI_API_KEY` — already set (shared studio key)
- `ALEXA_SKILL_ID` — set after skill creation (optional but recommended)
- `ALEXA_OPENAI_MODEL` — optional model override (default gpt-5.4-mini → gpt-4o-mini fallback)
- `ALEXA_SKIP_VERIFY=1` — LOCAL DEV ONLY, never in prod

## Local testing

```sh
ALEXA_SKIP_VERIFY=1 npm run dev  # then:
curl -s localhost:3000/api/alexa/ -H 'content-type: application/json' \
  -d @alexa/test-requests/launch.json | python3 -m json.tool
```

Sample requests live in `alexa/test-requests/`.

## Certification notes

- Free content exists before any purchase (2 rounds/session) — ISP cert req.
- The skill never asks for personal info; privacy policy at
  houseboatstudios.com/privacy.
- AMAZON.FallbackIntent doubles as the answer catcher mid-round (standard
  voice-game pattern for open-ended speech).
