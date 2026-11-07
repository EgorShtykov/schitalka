import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  createCompetitionRoom,
  getCompetitionRoom,
  joinCompetitionRoom,
  startCompetitionRoom,
  submitCompetitionAnswer,
} from "./queries/competition";

const codeSchema = z.string().trim().min(4).max(8).regex(/^[A-Za-z0-9]+$/);

export const competitionRouter = createRouter({
  create: authedQuery.input(z.object({
    grade: z.number().int().min(4).max(9),
    difficulty: z.enum(["medium", "hard"]),
  })).mutation(({ ctx, input }) => createCompetitionRoom(
    ctx.user.id,
    ctx.user.name,
    input.grade,
    input.difficulty,
  )),

  join: authedQuery.input(z.object({ code: codeSchema })).mutation(({ ctx, input }) =>
    joinCompetitionRoom(ctx.user.id, ctx.user.name, input.code),
  ),

  state: authedQuery.input(z.object({ code: codeSchema })).query(({ ctx, input }) =>
    getCompetitionRoom(ctx.user.id, input.code),
  ),

  start: authedQuery.input(z.object({ code: codeSchema })).mutation(({ ctx, input }) =>
    startCompetitionRoom(ctx.user.id, input.code),
  ),

  answer: authedQuery.input(z.object({
    code: codeSchema,
    taskIndex: z.number().int().min(0).max(9),
    answer: z.string().trim().min(1).max(64),
  })).mutation(({ ctx, input }) => submitCompetitionAnswer(ctx.user.id, input)),
});
