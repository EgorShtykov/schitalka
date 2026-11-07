import { z } from "zod";
import { emptyProgress, topicIds } from "@contracts/learning";
import { themes } from "@contracts/themes";
import { createRouter, authedQuery } from "./middleware";
import {
  applyAttempt,
  breakStreak,
  getCloudState,
  migrateLocalProgress,
  purchaseTheme,
  resetCloudProgress,
  selectOwnedTheme,
  updateGrade,
} from "./queries/learning";

const metricSchema = z.number().int().min(0).max(1_000_000);
const topicSchema = z.object({ solved: metricSchema, attempts: metricSchema, firstTry: metricSchema });
const progressSchema = z.object({
  solved: metricSchema,
  attempts: metricSchema,
  firstTry: metricSchema,
  streak: metricSchema,
  bestStreak: metricSchema,
  topics: z.record(z.string(), topicSchema),
  masteryTopics: z.record(z.string(), topicSchema),
}).default(emptyProgress);
const themeIds = themes.map((theme) => theme.id) as [string, ...string[]];

export const learningRouter = createRouter({
  state: authedQuery.query(({ ctx }) => getCloudState(ctx.user.id)),

  attempt: authedQuery.input(z.object({
    attemptId: z.string().uuid(),
    topicId: z.enum(topicIds),
    correct: z.boolean(),
    clean: z.boolean(),
    difficulty: z.enum(["easy", "medium", "hard"]),
  }).refine((input) => !input.clean || input.correct, { message: "Чистый ответ должен быть правильным" }))
    .mutation(async ({ ctx, input }) => {
      const result = await applyAttempt(ctx.user.id, input);
      return { ...result, state: await getCloudState(ctx.user.id) };
    }),

  migrate: authedQuery.input(z.object({ progress: progressSchema }))
    .mutation(async ({ ctx, input }) => {
      const result = await migrateLocalProgress(ctx.user.id, input.progress);
      return { ...result, state: await getCloudState(ctx.user.id) };
    }),

  purchase: authedQuery.input(z.object({ themeId: z.enum(themeIds) }))
    .mutation(async ({ ctx, input }) => {
      await purchaseTheme(ctx.user.id, input.themeId);
      return getCloudState(ctx.user.id);
    }),

  selectTheme: authedQuery.input(z.object({ themeId: z.enum(themeIds) }))
    .mutation(async ({ ctx, input }) => {
      await selectOwnedTheme(ctx.user.id, input.themeId);
      return getCloudState(ctx.user.id);
    }),

  reset: authedQuery.mutation(async ({ ctx }) => {
    await resetCloudProgress(ctx.user.id);
    return getCloudState(ctx.user.id);
  }),

  setGrade: authedQuery.input(z.object({ grade: z.number().int().min(4).max(9) }))
    .mutation(async ({ ctx, input }) => {
      await updateGrade(ctx.user.id, input.grade);
      return getCloudState(ctx.user.id);
    }),

  breakStreak: authedQuery.mutation(async ({ ctx }) => {
    await breakStreak(ctx.user.id);
    return getCloudState(ctx.user.id);
  }),
});
