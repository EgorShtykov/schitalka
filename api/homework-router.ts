import { z } from "zod";
import { adminQuery, createRouter } from "./middleware";
import { grantHomeworkReward } from "./queries/homework";

export const homeworkRouter = createRouter({
  grant: adminQuery.input(z.object({
    rewardId: z.string().uuid(),
    studentLogin: z.string().trim().min(3).max(24),
    amount: z.number().int().min(1).max(20),
    note: z.string().trim().min(3).max(120),
  })).mutation(({ ctx, input }) => grantHomeworkReward(ctx.user.id, input)),
});
