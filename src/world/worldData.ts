import { topicIds } from "@contracts/learning";
import { mulberry32 } from "./prng";

// Чистое отображение «прогресс ученика → описание мира».
// Никаких случайностей вне seeded PRNG: одинаковый вход = одинаковый мир.

export interface WorldTrophies {
  gold: number;
  silver: number;
  bronze: number;
}

export interface WorldInput {
  /** Стабильный seed мира (например, id ученика или хеш логина). */
  seed: number;
  planetName: string;
  solved: number;
  attempts: number;
  firstTry: number;
  bestStreak: number;
  masteredTopicIds: string[];
  trophies: WorldTrophies;
}

export type WorldObjectKind =
  | "tree"
  | "flowerTree"
  | "crystal"
  | "lantern"
  | "cabin"
  | "trophyGold"
  | "trophySilver"
  | "trophyBronze";

export interface WorldPlacement {
  id: string;
  kind: WorldObjectKind;
  /** Широта на поверхности планеты в градусах (0 — экватор, 90 — северный полюс). */
  lat: number;
  /** Долгота в градусах. */
  lon: number;
  scale: number;
  /** Детерминированная вариация оттенка, -1..1. */
  hueShift: number;
}

export interface ConstellationSpec {
  topicId: string;
  topicIndex: number;
  starCount: number;
  lat: number;
  lon: number;
  scale: number;
}

export interface WorldSpec {
  planetName: string;
  accuracy: number;
  /** Доля освоенных тем курса, 0..1 — сила свечения атмосферы. */
  masteryRatio: number;
  placements: WorldPlacement[];
  constellations: ConstellationSpec[];
  spirit: { unlocked: boolean; stage: number };
}

const MAX_TREES = 36;
const TASKS_PER_TREE = 8;
const MAX_LANTERNS = 8;
const STREAK_PER_LANTERN = 5;
const MAX_CRYSTALS = 8;
const CABIN_SOLVED = 50;
const SPIRIT_SOLVED = 10;

/** Равномерное размещение n объектов на северной шапке планеты (спираль Фибоначчи). */
function spiralSlots(count: number, rand: () => number, latMin: number, latMax: number) {
  const slots: { lat: number; lon: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = count === 1 ? 0.5 : index / (count - 1);
    const lat = latMin + (latMax - latMin) * Math.sqrt(fraction);
    const lon = (index * 137.508 + rand() * 24) % 360;
    slots.push({ lat, lon });
  }
  return slots;
}

export function buildWorldSpec(input: WorldInput): WorldSpec {
  const rand = mulberry32(input.seed);
  const accuracy = input.attempts > 0 ? input.firstTry / input.attempts : 0;
  const mastered = input.masteredTopicIds.filter((id) => topicIds.includes(id as (typeof topicIds)[number]));
  const masteryRatio = topicIds.length > 0 ? mastered.length / topicIds.length : 0;

  const placements: WorldPlacement[] = [];

  // Деревья: одно за каждые TASKS_PER_TREE решённых заданий.
  const treeCount = Math.min(Math.floor(input.solved / TASKS_PER_TREE), MAX_TREES);
  // Цветущие — чем выше точность (доля «с первого раза»), тем больше цветения.
  const flowerChance = Math.max(0, Math.min(1, (accuracy - 0.5) * 2));
  const treeSlots = spiralSlots(treeCount, rand, 8, 62);
  treeSlots.forEach((slot, index) => {
    const flowering = rand() < flowerChance;
    placements.push({
      id: `tree-${index}`,
      kind: flowering ? "flowerTree" : "tree",
      lat: slot.lat,
      lon: slot.lon,
      scale: 0.8 + rand() * 0.5,
      hueShift: rand() * 2 - 1,
    });
  });

  // Кристаллы: по одному за каждую освоенную тему (видимая на поверхности память о mastery).
  const crystalCount = Math.min(mastered.length, MAX_CRYSTALS);
  const crystalSlots = spiralSlots(crystalCount, rand, 4, 30);
  crystalSlots.forEach((slot, index) => {
    placements.push({
      id: `crystal-${index}`,
      kind: "crystal",
      lat: slot.lat,
      lon: slot.lon,
      scale: 0.85 + rand() * 0.4,
      hueShift: rand() * 2 - 1,
    });
  });

  // Фонари: один за каждые STREAK_PER_LANTERN лучшей серии — дорожка к вершине.
  const lanternCount = Math.min(Math.floor(input.bestStreak / STREAK_PER_LANTERN), MAX_LANTERNS);
  for (let index = 0; index < lanternCount; index += 1) {
    placements.push({
      id: `lantern-${index}`,
      kind: "lantern",
      lat: 12 + (index / Math.max(1, lanternCount - 1)) * 52,
      lon: (40 + index * 14 + rand() * 6) % 360,
      scale: 0.9 + rand() * 0.2,
      hueShift: 0,
    });
  }

  // Домик: появляется после CABIN_SOLVED решённых заданий — на планете кто-то живёт.
  if (input.solved >= CABIN_SOLVED) {
    placements.push({
      id: "cabin",
      kind: "cabin",
      lat: 34,
      lon: 210 + rand() * 20,
      scale: 1,
      hueShift: 0,
    });
  }

  // Кубки: стоят на вершине, до трёх каждого вида.
  const trophyKinds: { kind: WorldObjectKind; count: number; lat: number }[] = [
    { kind: "trophyGold", count: input.trophies.gold, lat: 76 },
    { kind: "trophySilver", count: input.trophies.silver, lat: 71 },
    { kind: "trophyBronze", count: input.trophies.bronze, lat: 66 },
  ];
  trophyKinds.forEach(({ kind, count, lat }) => {
    const shown = Math.min(count, 3);
    for (let index = 0; index < shown; index += 1) {
      placements.push({
        id: `${kind}-${index}`,
        kind,
        lat,
        lon: (rand() * 360) | 0,
        scale: 0.9 + rand() * 0.3,
        hueShift: 0,
      });
    }
  });

  // Созвездия: одно за каждую освоенную тему, расположение по индексу темы в курсе.
  const constellations: ConstellationSpec[] = mastered.map((topicId) => {
    const topicIndex = topicIds.indexOf(topicId as (typeof topicIds)[number]);
    const starRand = mulberry32(input.seed ^ (topicIndex + 1) * 7919);
    return {
      topicId,
      topicIndex,
      starCount: 5 + Math.floor(starRand() * 3),
      lat: 18 + starRand() * 46,
      lon: (topicIndex * 51 + starRand() * 30) % 360,
      scale: 0.8 + starRand() * 0.5,
    };
  });

  const spiritStage = Math.min(3, Math.floor(mastered.length / 2));

  return {
    planetName: input.planetName,
    accuracy,
    masteryRatio,
    placements,
    constellations,
    spirit: { unlocked: input.solved >= SPIRIT_SOLVED, stage: spiritStage },
  };
}

/** Демо-вход для лендинга: планета ученика после пары месяцев занятий. */
export const DEMO_WORLD_INPUT: WorldInput = {
  seed: 20261108,
  planetName: "Планета ученика",
  solved: 214,
  attempts: 260,
  firstTry: 208,
  bestStreak: 34,
  masteredTopicIds: ["powers-7", "linear-7", "roots-8", "quadratic-8", "percent-5", "fractions-6"],
  trophies: { gold: 2, silver: 1, bronze: 2 },
};
