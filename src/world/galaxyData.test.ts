import { describe, expect, it } from "vitest";
import { buildGalaxySpec } from "./galaxyData";

const topics = [
  { id: "a", navTitle: "Сложение" },
  { id: "b", navTitle: "Умножение" },
  { id: "c", navTitle: "Деление" },
];

describe("buildGalaxySpec", () => {
  it("детерминирована: одинаковый вход даёт одинаковую систему", () => {
    const first = buildGalaxySpec(5, topics, {}, { seed: 42, showStipend: true });
    const second = buildGalaxySpec(5, topics, {}, { seed: 42, showStipend: true });
    expect(first).toEqual(second);
  });

  it("содержит звезду, дом, сектора и направления", () => {
    const spec = buildGalaxySpec(5, topics, {}, { seed: 7, showStipend: true });
    const types = spec.bodies.map(body => body.type);
    expect(types.filter(type => type === "sun")).toHaveLength(1);
    expect(types.filter(type => type === "home")).toHaveLength(1);
    expect(types.filter(type => type === "topic")).toHaveLength(3);
    expect(types.filter(type => type === "destination")).toHaveLength(5);
  });

  it("прячет звезду-копилку для админа", () => {
    const spec = buildGalaxySpec(5, topics, {}, { seed: 7, showStipend: false });
    expect(spec.bodies.some(body => body.id === "stipend")).toBe(false);
  });

  it("состояния секторов следуют за прогрессом", () => {
    const spec = buildGalaxySpec(
      5,
      topics,
      {
        a: { solved: 0, score: 0, complete: false },
        b: { solved: 5, score: 30, complete: false },
        c: { solved: 20, score: 100, complete: true },
      },
      { seed: 7, showStipend: true },
    );
    const byId = new Map(spec.bodies.map(body => [body.id, body]));
    expect(byId.get("a")?.state).toBe("dark");
    expect(byId.get("b")?.state).toBe("growing");
    expect(byId.get("c")?.state).toBe("shining");
  });

  it("орбиты разведены и не пересекаются", () => {
    const spec = buildGalaxySpec(8, topics, {}, { seed: 1, showStipend: true });
    const radii = spec.bodies.map(body => body.orbitRadius).filter(radius => radius > 0);
    expect(new Set(radii).size).toBe(radii.length);
  });
});
