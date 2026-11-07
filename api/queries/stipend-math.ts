/** Pure stipend helpers — no imports, covered by unit tests. */

export type StipendProgramShape = {
  amountPerHomework: number;
  cycleBonus: number;
  cycleWeeks: number;
  homeworkPerWeek: number;
};

export type StipendClaimStatus = "requested" | "approved" | "ordered" | "delivered" | "cancelled";

export const ACTIVE_CLAIM_STATUSES = ["requested", "approved", "ordered"] as const;

export function cycleEndDate(start: Date, weeks: number) {
  return new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
}

export function maxCycleEarnings(program: StipendProgramShape) {
  return program.cycleWeeks * program.homeworkPerWeek * program.amountPerHomework + program.cycleBonus;
}

export function homeworksToReach(
  balance: number,
  price: number,
  amountPerHomework: number,
  bonusAvailable: boolean,
  cycleBonus: number,
) {
  const reachable = balance + (bonusAvailable ? cycleBonus : 0);
  if (reachable >= price) return 0;
  return Math.ceil((price - reachable) / amountPerHomework);
}

export function canTransitionClaim(from: StipendClaimStatus, to: StipendClaimStatus) {
  if (to === "cancelled") return from !== "delivered" && from !== "cancelled";
  const order: StipendClaimStatus[] = ["requested", "approved", "ordered", "delivered"];
  return order.indexOf(to) === order.indexOf(from) + 1;
}

export function claimNeedsRefund(status: StipendClaimStatus) {
  return (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(status);
}
