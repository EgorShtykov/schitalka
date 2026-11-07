import { describe, expect, it } from "vitest";
import { competitionAnswerMatches, createCompetitionTasks } from "./competition-tasks";
import { powerProperties, powersSeven } from "../src/lib/generators-7-9";
import { powerCombinations } from "../src/lib/generators-extra";

const difficulties = ["easy", "medium", "hard"] as const;

describe("competition task generation", () => {
  it("is deterministic for every grade and difficulty", () => {
    for (let grade = 4; grade <= 9; grade += 1) {
      for (const difficulty of ["medium", "hard"] as const) {
        const first = createCompetitionTasks("same-room-seed", grade, difficulty);
        const second = createCompetitionTasks("same-room-seed", grade, difficulty);
        expect(second).toEqual(first);
        expect(first).toHaveLength(10);
        expect(first.every((task) => Number.isFinite(task.answer))).toBe(true);
      }
    }
  });

  it("keeps grade-seven competition powers small", () => {
    for (let seed = 0; seed < 250; seed += 1) {
      for (const difficulty of ["medium", "hard"] as const) {
        const tasks = createCompetitionTasks(`power-${seed}`, 7, difficulty);
        for (const task of tasks.filter((_, index) => index % 3 === 0)) {
          expect(Math.abs(task.answer)).toBeLessThanOrEqual(512);
        }
      }
    }
  });
});

describe("competition answer parsing", () => {
  it("accepts ordinary numeric formatting", () => {
    expect(competitionAnswerMatches("  −2,5  ", -2.5)).toBe(true);
    expect(competitionAnswerMatches("+12", 12)).toBe(true);
    expect(competitionAnswerMatches(".5", 0.5)).toBe(true);
  });

  it("rejects expressions and non-finite answers", () => {
    for (const input of ["", "1/2", "2 + 2", "Infinity", "NaN", "12x"]) {
      expect(competitionAnswerMatches(input, 2)).toBe(false);
    }
  });
});

describe("grade-seven power limits", () => {
  it("keeps generated answers within the agreed limit", () => {
    for (const difficulty of difficulties) {
      for (let iteration = 0; iteration < 1000; iteration += 1) {
        for (const generated of [powersSeven(difficulty), powerProperties(difficulty), powerCombinations(difficulty)]) {
          expect(typeof generated.answer).toBe("number");
          expect(Math.abs(Number(generated.answer))).toBeLessThanOrEqual(4096);
        }
      }
    }
  });
});
