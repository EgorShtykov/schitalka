import { authRouter } from "./auth-router";
import { accountRouter } from "./account-router";
import { learningRouter } from "./learning-router";
import { competitionRouter } from "./competition-router";
import { homeworkRouter } from "./homework-router";
import { studentSchoolRouter, teacherRouter } from "./teacher-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  account: accountRouter,
  progress: learningRouter,
  competition: competitionRouter,
  homework: homeworkRouter,
  teacher: teacherRouter,
  school: studentSchoolRouter,
});

export type AppRouter = typeof appRouter;
