import React from "react";
import UnifiedGame from "./UnifiedGame";
import type { GameDefinitionMeta, GameMetadata } from "./types";
import rawDefinitions from "./gameDefinitions.json";
import { GameDefinitionsSchema } from "./schema";

// Bridge: metadata array for listing and filtering
const definitions = GameDefinitionsSchema.parse(
  rawDefinitions
) as GameDefinitionMeta[];

export const implementedGameMetadata: GameMetadata[] = (
  definitions as GameDefinitionMeta[]
).map(
  ({
    id,
    name,
    description,
    category,
    difficulty,
    requiresVoice,
    requiresAudio,
    estimatedDuration,
  }) => ({
    id,
    name,
    description,
    category,
    difficulty,
    requiresVoice,
    requiresAudio,
    estimatedDuration,
  })
);

// For selection by id -> component
export function getGameById(id: string) {
  const def = (definitions as GameDefinitionMeta[]).find((d) => d.id === id);
  if (!def) return undefined as any;
  // Return a component factory that injects the definition (avoid JSX in .ts)
  const Component = (props: any) =>
    React.createElement(UnifiedGame as any, { definition: def, ...props });
  return Component as any;
}

export function getGameMetadata(id: string) {
  return implementedGameMetadata.find((g) => g.id === id);
}

export const allPlannedGames: GameMetadata[] = implementedGameMetadata;

export function getGamesByCategory(category: string) {
  return implementedGameMetadata.filter((game) => game.category === category);
}

export function getImplementedGames() {
  return implementedGameMetadata;
}

export function isGameImplemented(id: string) {
  return (definitions as GameDefinitionMeta[]).some((d) => d.id === id);
}
