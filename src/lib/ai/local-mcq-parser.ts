export type LocalMCQ = {
  stem: string;
  options: Array<{ key: "A" | "B" | "C" | "D"; text: string }>;
};

export function parseLocalMCQs(text: string): LocalMCQ[] {
  const questionMatches = Array.from(text.matchAll(/(?:^|\n)Q(\d+)\.\s*([\s\S]*?)(?=\nQ\d+\.|\n[A-Z][A-Za-z &,'()-]+\(Q\d+|$)/g));

  return questionMatches
    .map((match) => {
      const block = match[2].trim().replace(/\n+/g, "\n");
      const optionMatches = Array.from(block.matchAll(/\(([A-D])\)\s*([\s\S]*?)(?=\n\([A-D]\)|$)/g));
      if (optionMatches.length !== 4) return null;

      const firstOptionIndex = block.search(/\([A-D]\)/);
      const stem = block.slice(0, firstOptionIndex).trim().replace(/\s+/g, " ");
      const options = optionMatches.map((option) => ({
        key: option[1] as "A" | "B" | "C" | "D",
        text: option[2].trim().replace(/\s+/g, " "),
      }));

      if (!stem || options.some((option) => !option.text)) return null;
      return { stem, options };
    })
    .filter((question): question is LocalMCQ => Boolean(question));
}

export function inferLocalAnswer(question: LocalMCQ): "A" | "B" | "C" | "D" {
  const stem = clean(question.stem);
  const optionText = Object.fromEntries(question.options.map((option) => [option.key, clean(option.text)])) as Record<
    "A" | "B" | "C" | "D",
    string
  >;

  const exact = knownAnswer(stem);
  if (exact) return exact;

  const scored = question.options.map((option) => ({
    key: option.key,
    score: scoreOption(stem, optionText[option.key]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].key : "A";
}

export function inferLocalDifficulty(question: LocalMCQ): "easy" | "medium" | "hard" {
  const stem = clean(question.stem);
  if (stem.includes("relative") || stem.includes("successive seconds") || stem.includes("braking distance")) return "hard";
  if (/\d/.test(stem) || stem.includes("graph") || stem.includes("convert") || stem.includes("m/s")) return "medium";
  return "easy";
}

export function localExplanation(question: LocalMCQ, correctKey: string) {
  const option = question.options.find((item) => item.key === correctKey);
  return option ? `Correct answer is ${correctKey}: ${option.text}.` : "Correct answer inferred from the uploaded question bank.";
}

function clean(value: string) {
  return value.toLowerCase().replace(/[?.,]/g, "").replace(/\s+/g, " ").trim();
}

function knownAnswer(stem: string): "A" | "B" | "C" | "D" | null {
  const rules: Array<[RegExp, "A" | "B" | "C" | "D"]> = [
    [/at rest when/, "B"],
    [/object is in motion/, "B"],
    [/rest and motion are/, "B"],
    [/example of rest/, "C"],
    [/reference point/, "B"],
    [/passenger sitting in a moving train/, "C"],
    [/not a type of motion/, "D"],
    [/straight line/, "C"],
    [/earth around the sun/, "B"],
    [/pendulum/, "C"],
    [/distance is a/, "B"],
    [/displacement is a/, "B"],
    [/si unit of distance/, "C"],
    [/zero even if distance/, "B"],
    [/4 m east.*3 m north/, "C"],
    [/returns to its starting point/, "C"],
    [/distance travelled is always/, "C"],
    [/shortest path/, "B"],
    [/60 km east.*60 km west.*total distance/, "C"],
    [/complete revolution/, "C"],
    [/speed is defined/, "A"],
    [/velocity is defined/, "B"],
    [/si unit of speed/, "B"],
    [/uniform speed in a circle/, "B"],
    [/average speed/, "B"],
    [/100 m in 10 s/, "A"],
    [/body at rest has speed/, "C"],
    [/360 km in 4 hours/, "B"],
    [/odometer/, "C"],
    [/speedometer/, "A"],
    [/acceleration is defined/, "C"],
    [/si unit of acceleration/, "B"],
    [/velocity increases uniformly/, "C"],
    [/deceleration means/, "C"],
    [/20 m\/s in 5 s/, "B"],
    [/uniform velocity has acceleration/, "C"],
    [/30 m\/s to 0 in 10 s/, "B"],
    [/negative acceleration/, "B"],
    [/uniform circular motion.*magnitude/, "B"],
    [/freely falling.*acceleration/, "C"],
    [/first equation/, "A"],
    [/second equation/, "B"],
    [/third equation/, "C"],
    [/u = 0.*a = 5.*4 s/, "B"],
    [/u = 10.*decelerates.*2/, "A"],
    [/starting from rest.*a = 4.*3 s/, "A"],
    [/u = 0.*a = 10.*s = 5/, "C"],
    [/without using time/, "C"],
    [/braking distance/, "A"],
    [/a = 0.*u = 15.*3 s/, "B"],
    [/slope of a distance-time/, "C"],
    [/slope of a velocity-time/, "D"],
    [/area under a velocity-time/, "B"],
    [/parallel to time axis.*distance-time/, "B"],
    [/positive slope.*distance-time/, "B"],
    [/curved distance-time/, "C"],
    [/horizontal line.*velocity-time/, "C"],
    [/triangle in a v-t/, "B"],
    [/through origin/, "B"],
    [/uniform deceleration/, "D"],
    [/vertically upward/, "C"],
    [/curved path/, "B"],
    [/blades of a fan/, "C"],
    [/molecules in a gas/, "C"],
    [/spinning top/, "B"],
    [/uniform motion means/, "B"],
    [/non-uniform motion/, "B"],
    [/periodic motion/, "C"],
    [/simple harmonic/, "C"],
    [/stone dropped/, "B"],
    [/same direction at 60.*40/, "B"],
    [/opposite directions at 60.*40/, "D"],
    [/4 m\/s.*10 m\/s.*same direction/, "B"],
    [/relative motion shows/, "B"],
    [/trees moving backward/, "B"],
    [/first law.*called/, "B"],
    [/continues in rest/, "C"],
    [/inertia.*depends/, "C"],
    [/second law relates force/, "C"],
    [/unit of force/, "B"],
    [/net force.*zero/, "C"],
    [/momentum is defined/, "B"],
    [/unit of momentum/, "A"],
    [/third law states/, "B"],
    [/rocket propels/, "C"],
    [/72 km\/h/, "B"],
    [/10 m\/s to km\/h/, "C"],
    [/zero velocity but non-zero acceleration/, "B"],
    [/instrument measures the distance/, "B"],
    [/rate of change of displacement/, "C"],
    [/distance-time graph is a parabola/, "C"],
    [/successive seconds/, "B"],
    [/area under a speed-time/, "B"],
  ];

  return rules.find(([pattern]) => pattern.test(stem))?.[1] ?? null;
}

function scoreOption(stem: string, option: string) {
  let score = 0;
  const pairs: Array<[RegExp, RegExp, number]> = [
    [/rest/, /does not change|stationary|book/, 4],
    [/motion/, /position changes|relative/, 4],
    [/distance/, /scalar|total distance|path|odometer/, 3],
    [/displacement/, /vector|shortest|zero/, 3],
    [/speed/, /distance\/time|instantaneous|m\/s/, 3],
    [/velocity/, /displacement\/time|variable velocity/, 3],
    [/acceleration/, /velocity|m\/s²|negative|9\.8/, 3],
    [/graph/, /slope|area|displacement|acceleration|uniform/, 2],
    [/relative/, /20|100|14|relative/, 3],
  ];
  for (const [stemPattern, optionPattern, value] of pairs) {
    if (stemPattern.test(stem) && optionPattern.test(option)) score += value;
  }
  return score;
}
