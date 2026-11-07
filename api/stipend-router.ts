import { z } from "zod";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  chooseGoal,
  claimPrize,
  grantCycleBonus,
  saveProgram,
  studentOverview,
  teacherOverview,
  updateClaim,
  upsertPrize,
} from "./queries/stipend";

const programInput = z.object({
  amountPerHomework: z.number().int().min(0).max(10000),
  cycleBonus: z.number().int().min(0).max(100000),
  cycleWeeks: z.number().int().min(1).max(16),
  homeworkPerWeek: z.number().int().min(1).max(7),
  active: z.boolean(),
});

export const stipendRouter = createRouter({
  overview: authedQuery.query(({ ctx }) => studentOverview(ctx.user.id)),

  chooseGoal: authedQuery.input(z.object({ prizeId: z.number().int() }))
    .mutation(({ ctx, input }) => chooseGoal(ctx.user.id, input.prizeId)),

  claimPrize: authedQuery.input(z.object({ prizeId: z.number().int() }))
    .mutation(({ ctx, input }) => claimPrize(ctx.user.id, input.prizeId)),

  teacherOverview: adminQuery.query(({ ctx }) => teacherOverview(ctx.user.id)),

  saveProgram: adminQuery.input(programInput)
    .mutation(({ ctx, input }) => saveProgram(ctx.user.id, input)),

  grantCycleBonus: adminQuery.input(z.object({ studentId: z.number().int() }))
    .mutation(({ ctx, input }) => grantCycleBonus(ctx.user.id, input.studentId)),

  updateClaim: adminQuery.input(z.object({
    claimId: z.number().int(),
    status: z.enum(["requested", "approved", "ordered", "delivered", "cancelled"]),
    actualPrice: z.number().int().min(0).max(1000000).optional(),
    note: z.string().trim().max(255).optional(),
  })).mutation(({ ctx, input }) => updateClaim(ctx.user.id, input)),

  upsertPrize: adminQuery.input(z.object({
    id: z.number().int().optional(),
    title: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(40),
    emoji: z.string().trim().min(1).max(8),
    price: z.number().int().min(1).max(1000000),
    active: z.boolean(),
  })).mutation(({ ctx, input }) => upsertPrize(ctx.user.id, input)),
});
