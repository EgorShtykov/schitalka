import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { studentStats, users } from "@db/schema";
import { getDb } from "./queries/connection";
import { ensureStudentStats, findStudentUser } from "./queries/learning";
import { authedQuery, createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./kimi/session";
import { hashPassword, normalizeLogin, verifyPassword } from "./password";

const loginSchema = z.string().trim().min(3, "Логин: минимум 3 символа").max(24, "Логин: максимум 24 символа")
  .regex(/^[A-Za-zА-Яа-яЁё0-9_-]+$/, "Используй буквы, цифры, дефис или подчёркивание");
const passwordSchema = z.string().min(6, "Пароль: минимум 6 символов").max(72, "Пароль: максимум 72 символа");

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function requestKey(headers: Headers, login: string) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${ip}:${normalizeLogin(login)}`;
}

function assertLoginAllowed(key: string) {
  const entry = loginAttempts.get(key);
  if (entry && entry.resetAt > Date.now() && entry.count >= 8) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Слишком много попыток. Подожди пять минут." });
  }
  if (entry && entry.resetAt <= Date.now()) loginAttempts.delete(key);
}

function noteLoginFailure(key: string) {
  const current = loginAttempts.get(key);
  loginAttempts.set(key, {
    count: current && current.resetAt > Date.now() ? current.count + 1 : 1,
    resetAt: current && current.resetAt > Date.now() ? current.resetAt : Date.now() + 5 * 60 * 1000,
  });
}

async function createSession(ctx: { req: Request; resHeaders: Headers }, unionId: string, sessionVersion = 0) {
  const token = await signSessionToken({ unionId, clientId: env.appId, sessionVersion });
  const options = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append("set-cookie", cookie.serialize(Session.cookieName, token, {
    httpOnly: options.httpOnly,
    path: options.path,
    sameSite: options.sameSite?.toLowerCase() as "lax" | "none",
    secure: options.secure,
    maxAge: Session.maxAgeMs / 1000,
  }));
}

export const accountRouter = createRouter({
  current: publicQuery.query(({ ctx }) => ctx.user ? {
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    mustChangePassword: ctx.user.mustChangePassword,
    lastSignInAt: ctx.user.lastSignInAt,
  } : null),

  register: publicQuery.input(z.object({
    login: loginSchema,
    password: passwordSchema,
    grade: z.number().int().min(4).max(9),
  })).mutation(async ({ ctx, input }) => {
    const normalized = normalizeLogin(input.login);
    const unionId = `student:${normalized}`;
    const passwordHash = await hashPassword(input.password);
    let userId: number;
    try {
      userId = await getDb().transaction(async (tx) => {
        const inserted = await tx.insert(users).values({
          unionId,
          name: input.login.trim(),
          passwordHash,
          role: unionId === env.ownerUnionId ? "admin" : "user",
          lastSignInAt: new Date(),
        }).$returningId();
        const id = inserted[0]?.id;
        if (!id) throw new Error("User id was not returned");
        await tx.insert(studentStats).values({ userId: id, grade: input.grade });
        return id;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
        throw new TRPCError({ code: "CONFLICT", message: "Такой логин уже занят" });
      }
      throw error;
    }
    await createSession(ctx, unionId, 0);
    return { id: userId, name: input.login.trim() };
  }),

  login: publicQuery.input(z.object({ login: loginSchema, password: z.string().min(1).max(72) }))
    .mutation(async ({ ctx, input }) => {
      const key = requestKey(ctx.req.headers, input.login);
      assertLoginAllowed(key);
      const unionId = `student:${normalizeLogin(input.login)}`;
      const user = await findStudentUser(unionId);
      const valid = user?.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !valid) {
        noteLoginFailure(key);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный логин или пароль" });
      }
      loginAttempts.delete(key);
      await getDb().update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));
      await ensureStudentStats(user.id);
      await createSession(ctx, unionId, user.sessionVersion);
      return { id: user.id, name: user.name, mustChangePassword: user.mustChangePassword };
    }),

  changePassword: authedQuery.input(z.object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.passwordHash || !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Текущий пароль указан неверно" });
    }
    if (input.currentPassword === input.newPassword) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Новый пароль должен отличаться от временного" });
    }
    const passwordHash = await hashPassword(input.newPassword);
    const sessionVersion = ctx.user.sessionVersion + 1;
    await getDb().update(users).set({
      passwordHash,
      mustChangePassword: false,
      sessionVersion,
      updatedAt: new Date(),
    }).where(eq(users.id, ctx.user.id));
    await createSession(ctx, ctx.user.unionId, sessionVersion);
    return { ok: true as const };
  }),
});
