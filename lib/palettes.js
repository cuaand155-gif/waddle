export const PALETTES = [
  { id: "terracotta", name: "Terracotta", color: "#d4532e" },
  { id: "sage", name: "Sage", color: "#4e7d5b" },
  { id: "plum", name: "Plum", color: "#8b3f6f" },
  { id: "ocean", name: "Ocean", color: "#2e6e8e" },
  { id: "marigold", name: "Marigold", color: "#b7791f" },
  { id: "cobalt", name: "Cobalt", color: "#395ab4" },
  { id: "teal", name: "Teal", color: "#187b72" },
  { id: "raspberry", name: "Raspberry", color: "#a33d59" },
  { id: "slate", name: "Slate", color: "#536478" },
];

export const DEFAULT_PALETTE = "terracotta";

export function normalizePalette(id) {
  return PALETTES.some((palette) => palette.id === id) ? id : DEFAULT_PALETTE;
}
