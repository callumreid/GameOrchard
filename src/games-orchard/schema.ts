import { z } from "zod";

export const GameDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  requiresVoice: z.boolean(),
  requiresAudio: z.boolean(),
  estimatedDuration: z.number().int().positive(),
  gameType: z.enum([
    "save-their-soul",
    "pitch-startup",
    "excuse-the-boss",
    "attract-the-turkey",
    "pwn-the-bully",
    "explain-death",
    "advise-the-child",
    "stall-the-police",
    "convince-the-aliens",
    "evaluate-yourself",
    "point-the-task",
    "sell-the-lemon",
  ]),
  title: z.string(),
  instructions: z.string(),
  startDelayMs: z.number().int().nonnegative(),
  startMessage: z.string(),
  activeMessage: z.string(),
  hostLabel: z.string(),
  userLabel: z.string(),
  talkButtonIdleEmoji: z.string(),
  talkButtonActiveEmoji: z.string(),
  talkButtonLabel: z.string(),
  backgroundGradient: z.string(),
  userActiveBubbleText: z.string().optional(),
  userHintBubbleText: z.string().optional(),
});

export const GameDefinitionsSchema = z.array(GameDefinitionSchema);

export type GameDefinition = z.infer<typeof GameDefinitionSchema>;
export type GameDefinitions = z.infer<typeof GameDefinitionsSchema>;
