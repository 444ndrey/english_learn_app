import data from "@/data/characters.json";

export const characters = data.characters;

export function findCharacter(name) {
  const key = String(name ?? "").toLowerCase();
  return characters.find((c) => c.name.toLowerCase() === key) ?? null;
}
