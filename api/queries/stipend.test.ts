import { describe, expect, it } from "vitest";
import {
  canTransitionClaim,
  cycleEndDate,
  homeworksToReach,
  maxCycleEarnings,
} from "./stipend-math";

describe("stipend math", () => {
  it("counts cycle end in whole weeks", () => {
    const start = new Date("2026-11-02T10:00:00Z");
    expect(cycleEndDate(start, 4).toISOString()).toBe("2026-11-30T10:00:00.000Z");
  });

  it("computes max cycle earnings matching the 3000 ₽ budget", () => {
    expect(maxCycleEarnings({ amountPerHomework: 250, cycleBonus: 1000, cycleWeeks: 4, homeworkPerWeek: 2 })).toBe(3000);
  });

  it("estimates homeworks left to reach a prize", () => {
    expect(homeworksToReach(2150, 3000, 250, true, 1000)).toBe(0);
    expect(homeworksToReach(1000, 3000, 250, true, 1000)).toBe(4);
    expect(homeworksToReach(1000, 3000, 250, false, 1000)).toBe(8);
    expect(homeworksToReach(3000, 2500, 250, false, 1000)).toBe(0);
  });

  it("walks claims only forward and allows cancel with refund window", () => {
    expect(canTransitionClaim("requested", "approved")).toBe(true);
    expect(canTransitionClaim("approved", "ordered")).toBe(true);
    expect(canTransitionClaim("ordered", "delivered")).toBe(true);
    expect(canTransitionClaim("requested", "delivered")).toBe(false);
    expect(canTransitionClaim("delivered", "cancelled")).toBe(false);
    expect(canTransitionClaim("approved", "requested")).toBe(false);
    expect(canTransitionClaim("ordered", "cancelled")).toBe(true);
  });
});
