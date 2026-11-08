import { describe, expect, it } from "vitest";
import { buildWorldSpec, DEMO_WORLD_INPUT, type WorldInput } from "./worldData";

const EMPTY: WorldInput = {
  seed: 42,
  planetName: "Тест",
  solved: 0,
  attempts: 0,
  firstTry: 0,
  bestStreak: 0,
  masteredTopicIds: [],
  trophies: { gold: 0, silver: 0, bronze: 0 },
};

describe("buildWorldSpec", () => {
  it("детерминирован: одинаковый вход даёт идентичный мир", () => {
    const first = buildWorldSpec(DEMO_WORLD_INPUT);
    const second = buildWorldSpec(DEMO_WORLD_INPUT);
    expect(first).toEqual(second);
  });

  it("нулевой прогресс: пустая планета без духа и созвездий", () => {
    const spec = buildWorldSpec(EMPTY);
    expect(spec.placements).toEqual([]);
    expect(spec.constellations).toEqual([]);
    expect(spec.spirit.unlocked).toBe(false);
    expect(spec.masteryRatio).toBe(0);
  });

  it("дерево за каждые 8 решённых заданий", () => {
    const spec = buildWorldSpec({ ...EMPTY, solved: 80 });
    expect(spec.placements.filter((p) => p.kind === "tree" || p.kind === "flowerTree")).toHaveLength(10);
  });

  it("деревья ограничены 36 даже при огромном прогрессе", () => {
    const spec = buildWorldSpec({ ...EMPTY, solved: 100000 });
    expect(spec.placements.filter((p) => p.kind === "tree" || p.kind === "flowerTree")).toHaveLength(36);
  });

  it("высокая точность даёт цветущие деревья, низкая — нет", () => {
    const accurate = buildWorldSpec({ ...EMPTY, solved: 200, attempts: 220, firstTry: 220 });
    const sloppy = buildWorldSpec({ ...EMPTY, solved: 200, attempts: 220, firstTry: 60 });
    const accurateFlowers = accurate.placements.filter((p) => p.kind === "flowerTree").length;
    const sloppyFlowers = sloppy.placements.filter((p) => p.kind === "flowerTree").length;
    expect(accurateFlowers).toBeGreaterThan(0);
    expect(sloppyFlowers).toBe(0);
  });

  it("фонарь за каждые 5 лучшей серии, максимум 8", () => {
    expect(
      buildWorldSpec({ ...EMPTY, bestStreak: 25 }).placements.filter((p) => p.kind === "lantern"),
    ).toHaveLength(5);
    expect(
      buildWorldSpec({ ...EMPTY, bestStreak: 500 }).placements.filter((p) => p.kind === "lantern"),
    ).toHaveLength(8);
  });

  it("освоенные темы дают кристаллы и созвездия, неизвестные id игнорируются", () => {
    const spec = buildWorldSpec({
      ...EMPTY,
      masteredTopicIds: ["powers-7", "roots-8", "несуществующая-тема"],
    });
    expect(spec.constellations).toHaveLength(2);
    expect(spec.placements.filter((p) => p.kind === "crystal")).toHaveLength(2);
    expect(spec.masteryRatio).toBeCloseTo(2 / 48);
  });

  it("домик появляется после 50 решённых заданий", () => {
    expect(buildWorldSpec({ ...EMPTY, solved: 49 }).placements.some((p) => p.kind === "cabin")).toBe(false);
    expect(buildWorldSpec({ ...EMPTY, solved: 50 }).placements.some((p) => p.kind === "cabin")).toBe(true);
  });

  it("кубки встают на вершину, не более трёх каждого вида", () => {
    const spec = buildWorldSpec({ ...EMPTY, trophies: { gold: 5, silver: 1, bronze: 0 } });
    expect(spec.placements.filter((p) => p.kind === "trophyGold")).toHaveLength(3);
    expect(spec.placements.filter((p) => p.kind === "trophySilver")).toHaveLength(1);
    expect(spec.placements.every((p) => p.kind !== "trophyBronze")).toBe(true);
  });

  it("дух открывается после 10 решённых и растёт с освоенными темами", () => {
    expect(buildWorldSpec({ ...EMPTY, solved: 9 }).spirit).toEqual({ unlocked: false, stage: 0 });
    expect(buildWorldSpec({ ...EMPTY, solved: 10 }).spirit.unlocked).toBe(true);
    expect(
      buildWorldSpec({ ...EMPTY, solved: 10, masteredTopicIds: ["powers-7", "linear-7", "roots-8", "quadratic-8"] })
        .spirit.stage,
    ).toBe(2);
  });
});
