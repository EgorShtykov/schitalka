import { mulberry32 } from "./prng";

// Чистое отображение «курс + прогресс → звёздная система».
// Центр — звезда «Смешанная», внутренняя орбита — планета ученика,
// средние орбиты — сектора-темы, внешние — большие направления сайта.
// Детерминированно: одинаковый вход = одинаковая система.

export type GalaxyBodyType = "sun" | "home" | "topic" | "destination";
export type GalaxyPlanetState = "dark" | "growing" | "shining";

export interface GalaxyBody {
  id: string;
  type: GalaxyBodyType;
  name: string;
  orbitRadius: number;
  /** Начальный угол на орбите, радианы. */
  phase: number;
  /** Угловая скорость, рад/сек (внутренние орбиты быстрее). */
  speed: number;
  size: number;
  hue: number;
  state: GalaxyPlanetState;
  /** Прогресс освоения сектора 0..100 (для topic). */
  score: number;
}

export interface GalaxySpec {
  grade: number;
  bodies: GalaxyBody[];
}

export interface GalaxyTopicInput {
  id: string;
  navTitle: string;
}

export interface GalaxyMasteryInput {
  solved: number;
  score: number;
  complete: boolean;
}

interface DestinationDef {
  id: string;
  name: string;
  hue: number;
}

const DESTINATIONS: DestinationDef[] = [
  { id: "school", name: "Станция «Земля»", hue: 190 },
  { id: "competition", name: "Космодром", hue: 18 },
  { id: "stipend", name: "Звезда-копилка", hue: 45 },
  { id: "theory", name: "Архив карт", hue: 262 },
  { id: "workshop", name: "Верфь", hue: 320 },
];

const TOPIC_ORBIT_START = 21;
const TOPIC_ORBIT_STEP = 7;

/** Кеплер-подобная скорость: чем дальше орбита, тем медленнее. */
function orbitSpeed(radius: number): number {
  return 0.16 / Math.sqrt(radius / 12);
}

export function buildGalaxySpec(
  grade: number,
  topics: GalaxyTopicInput[],
  masteryById: Record<string, GalaxyMasteryInput | undefined>,
  opts: { seed: number; showStipend: boolean },
): GalaxySpec {
  const rand = mulberry32((opts.seed ^ (grade * 7919)) >>> 0);
  const bodies: GalaxyBody[] = [];

  // Центр: звезда «Смешанная» — тренировка всего курса.
  bodies.push({
    id: "mixed",
    type: "sun",
    name: "Смешанная",
    orbitRadius: 0,
    phase: 0,
    speed: 0,
    size: 6,
    hue: 45,
    state: "shining",
    score: 0,
  });

  // Внутренняя орбита: планета ученика — дом.
  bodies.push({
    id: "world",
    type: "home",
    name: "Моя планета",
    orbitRadius: 12.5,
    phase: rand() * Math.PI * 2,
    speed: orbitSpeed(12.5),
    size: 2.7,
    hue: 155,
    state: "shining",
    score: 0,
  });

  // Средние орбиты: сектора-темы.
  topics.forEach((topic, index) => {
    const mastery = masteryById[topic.id];
    const solved = mastery?.solved ?? 0;
    const complete = mastery?.complete ?? false;
    const radius = TOPIC_ORBIT_START + index * TOPIC_ORBIT_STEP;
    bodies.push({
      id: topic.id,
      type: "topic",
      name: topic.navTitle,
      orbitRadius: radius,
      phase: rand() * Math.PI * 2,
      speed: orbitSpeed(radius),
      size: 1.7 + rand() * 0.55,
      hue: Math.round((index * 47 + 205 + rand() * 18) % 360),
      state: complete ? "shining" : solved > 0 ? "growing" : "dark",
      score: mastery?.score ?? 0,
    });
  });

  // Внешние орбиты: большие направления сайта.
  const destinationBase = TOPIC_ORBIT_START + topics.length * TOPIC_ORBIT_STEP + 12;
  DESTINATIONS.filter(item => item.id !== "stipend" || opts.showStipend).forEach((item, index) => {
    const radius = destinationBase + index * 8;
    bodies.push({
      id: item.id,
      type: "destination",
      name: item.name,
      orbitRadius: radius,
      phase: rand() * Math.PI * 2,
      speed: orbitSpeed(radius),
      size: 2.35,
      hue: item.hue,
      state: "shining",
      score: 0,
    });
  });

  return { grade, bodies };
}
