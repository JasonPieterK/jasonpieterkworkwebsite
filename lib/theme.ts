const TRIO = ["mean", "median", "mode", "quartile"] as const;
export type TrioColor = (typeof TRIO)[number];

const ILLUSTRATIONS = [
  "illu-abacus.svg",
  "illu-balance.svg",
  "illu-bell-curve.svg",
  "illu-boxplot.svg",
  "illu-die.svg",
  "illu-histogram.svg",
  "illu-quartile-line.svg",
  "illu-ruler.svg",
  "illu-tally.svg",
];

export function colorForIndex(i: number): TrioColor {
  return TRIO[i % TRIO.length];
}

export function illustrationForIndex(i: number): string {
  return `/illustrations/${ILLUSTRATIONS[i % ILLUSTRATIONS.length]}`;
}

export function rotationForIndex(i: number): string {
  const steps = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];
  return `${steps[i % steps.length]}deg`;
}
