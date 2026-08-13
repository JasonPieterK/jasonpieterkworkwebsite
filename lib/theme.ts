const TRIO = ["mean", "median", "mode", "quartile"] as const;
export type TrioColor = (typeof TRIO)[number];

export type IconKey =
  | "cross"
  | "bookOpen"
  | "chatText"
  | "flask"
  | "globe"
  | "translate"
  | "calculator"
  | "usersThree"
  | "basketball"
  | "scales"
  | "paintBrush"
  | "desktop";

const SUBJECT_ICONS: [match: string, icon: IconKey][] = [
  ["agama", "cross"],
  ["bahasa indonesia", "bookOpen"],
  ["english", "chatText"],
  ["matematika", "calculator"],
  ["ipa", "flask"],
  ["ips", "globe"],
  ["mandarin", "translate"],
  ["p5", "usersThree"],
  ["physical", "basketball"],
  ["ppkn", "scales"],
  ["sbk", "paintBrush"],
  ["tik", "desktop"],
];

export function subjectIconKey(subjectName: string): IconKey {
  const n = subjectName.toLowerCase();
  return SUBJECT_ICONS.find(([match]) => n.includes(match))?.[1] ?? "bookOpen";
}

export function colorForIndex(i: number): TrioColor {
  return TRIO[i % TRIO.length];
}

// Full-saturation trio colors read as light-on-dark except mode (lime), which needs ink text.
export function iconInkColor(color: TrioColor): string {
  return color === "mode" ? "var(--ink)" : "var(--paper)";
}

export function cardBgForIndex(i: number): "paper" | "cream" {
  return i % 2 === 0 ? "paper" : "cream";
}

export function rotationForIndex(i: number): string {
  const steps = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];
  return `${steps[i % steps.length]}deg`;
}
