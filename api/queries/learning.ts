import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  processedAttempts,
  purchasedThemes,
  plusLedger,
  sparkLedger,
  studentStats,
  topicProgress,
  trophies,
  users,
} from "@db/schema";
import type { ProgressState, TopicProgress } from "@contracts/learning";
import { emptyProgress, isMasteryComplete, topicIds } from "@contracts/learning";
import { getTheme } from "@contracts/themes";
import { getDb } from "./connection";

export async function ensureStudentStats(userId: number) {
  const existing = await getDb().select().from(studentStats).where(eq(studentStats.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  try {
    await getDb().insert(studentStats).values({ userId });
  } catch {
    // A simultaneous first request may have created the row already.
  }
  const rows = await getDb().select().from(studentStats).where(eq(studentStats.userId, userId)).limit(1);
  if (!rows[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось создать профиль ученика" });
  return rows[0];
}

export async function getCloudState(userId: number) {
  const stats = await ensureStudentStats(userId);
  const [topicRows, purchases, trophyRows, sparkEvents] = await Promise.all([
    getDb().select().from(topicProgress).where(eq(topicProgress.userId, userId)),
    getDb().select().from(purchasedThemes).where(eq(purchasedThemes.userId, userId)),
    getDb().select().from(trophies).where(eq(trophies.userId, userId)),
    getDb().select({ kind: sparkLedger.kind, amount: sparkLedger.amount, note: sparkLedger.note, createdAt: sparkLedger.createdAt })
      .from(sparkLedger).where(eq(sparkLedger.userId, userId)).orderBy(desc(sparkLedger.createdAt)).limit(8),
  ]);
  const progress: ProgressState = {
    ...emptyProgress,
    solved: stats.solved,
    attempts: stats.attempts,
    firstTry: stats.firstTry,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    topics: {},
    masteryTopics: {},
  };
  for (const row of topicRows) {
    progress.topics[row.topicId] = { solved: row.solved, attempts: row.attempts, firstTry: row.firstTry };
    progress.masteryTopics[row.topicId] = {
      solved: row.masterySolved,
      attempts: row.masteryAttempts,
      firstTry: row.masteryFirstTry,
    };
  }
  return {
    progress,
    plusBalance: stats.plusBalance,
    sparkBalance: stats.sparkBalance,
    trophies: {
      gold: trophyRows.filter((row) => row.place === 1).length,
      silver: trophyRows.filter((row) => row.place === 2).length,
      bronze: trophyRows.filter((row) => row.place === 3).length,
    },
    sparkEvents,
    selectedTheme: stats.selectedTheme,
    purchasedThemeIds: purchases.map((purchase) => purchase.themeId),
    grade: stats.grade,
    migratedAt: stats.migratedAt,
    updatedAt: stats.updatedAt,
  };
}

export async function applyAttempt(
  userId: number,
  input: { attemptId: string; topicId: string; correct: boolean; clean: boolean; difficulty: "easy" | "medium" | "hard" },
) {
  await ensureStudentStats(userId);
  return getDb().transaction(async (tx) => {
    const stats = (await tx.select().from(studentStats).where(eq(studentStats.userId, userId)).for("update").limit(1))[0];
    if (!stats) throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" });
    const previousAttempt = await tx.select().from(processedAttempts).where(and(
      eq(processedAttempts.userId, userId),
      eq(processedAttempts.attemptId, input.attemptId),
    )).limit(1);
    if (previousAttempt[0]) return { awarded: false, duplicate: true };

    await tx.insert(processedAttempts).values({ userId, attemptId: input.attemptId });
    const old = (await tx.select().from(topicProgress).where(and(
      eq(topicProgress.userId, userId),
      eq(topicProgress.topicId, input.topicId),
    )).limit(1))[0];
    const countsForMastery = input.difficulty !== "easy";
    const next = {
      solved: (old?.solved ?? 0) + (input.correct ? 1 : 0),
      attempts: (old?.attempts ?? 0) + 1,
      firstTry: (old?.firstTry ?? 0) + (input.clean ? 1 : 0),
      masterySolved: (old?.masterySolved ?? 0) + (countsForMastery && input.correct ? 1 : 0),
      masteryAttempts: (old?.masteryAttempts ?? 0) + (countsForMastery ? 1 : 0),
      masteryFirstTry: (old?.masteryFirstTry ?? 0) + (countsForMastery && input.clean ? 1 : 0),
    };
    const awarded = !old?.rewarded && isMasteryComplete({
      solved: next.masterySolved,
      attempts: next.masteryAttempts,
      firstTry: next.masteryFirstTry,
    });
    if (old) {
      await tx.update(topicProgress).set({ ...next, rewarded: old.rewarded || awarded }).where(and(
        eq(topicProgress.userId, userId),
        eq(topicProgress.topicId, input.topicId),
      ));
    } else {
      await tx.insert(topicProgress).values({ userId, topicId: input.topicId, ...next, rewarded: awarded });
    }

    const streak = input.correct ? stats.streak + 1 : 0;
    await tx.update(studentStats).set({
      solved: stats.solved + (input.correct ? 1 : 0),
      attempts: stats.attempts + 1,
      firstTry: stats.firstTry + (input.clean ? 1 : 0),
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      plusBalance: stats.plusBalance + (awarded ? 1 : 0),
    }).where(eq(studentStats.userId, userId));
    if (awarded) {
      await tx.insert(plusLedger).values({ userId, kind: "mastery", refId: input.topicId, amount: 1 });
    }
    return { awarded, duplicate: false };
  });
}

function mergeTopic(a: TopicProgress | undefined, b: TopicProgress | undefined): TopicProgress {
  return {
    solved: Math.max(a?.solved ?? 0, b?.solved ?? 0),
    attempts: Math.max(a?.attempts ?? 0, b?.attempts ?? 0),
    firstTry: Math.max(a?.firstTry ?? 0, b?.firstTry ?? 0),
  };
}

export async function migrateLocalProgress(userId: number, incoming: ProgressState) {
  await ensureStudentStats(userId);
  return getDb().transaction(async (tx) => {
    const stats = (await tx.select().from(studentStats).where(eq(studentStats.userId, userId)).for("update").limit(1))[0];
    if (!stats) throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" });
    if (stats.migratedAt) return { migrated: false, awarded: 0 };

    const oldRows = await tx.select().from(topicProgress).where(eq(topicProgress.userId, userId));
    const oldById = new Map(oldRows.map((row) => [row.topicId, row]));
    let awarded = 0;
    for (const topicId of topicIds) {
      const old = oldById.get(topicId);
      const oldGeneral = old ? { solved: old.solved, attempts: old.attempts, firstTry: old.firstTry } : undefined;
      const oldMastery = old ? { solved: old.masterySolved, attempts: old.masteryAttempts, firstTry: old.masteryFirstTry } : undefined;
      const mastery = mergeTopic(oldMastery, incoming.masteryTopics[topicId]);
      const importedGeneral = mergeTopic(oldGeneral, incoming.topics[topicId]);
      const general = {
        solved: Math.max(importedGeneral.solved, mastery.solved),
        attempts: Math.max(importedGeneral.attempts, mastery.attempts),
        firstTry: Math.max(importedGeneral.firstTry, mastery.firstTry),
      };
      const hasReward = old?.rewarded ?? false;
      const earnsReward = !hasReward && isMasteryComplete(mastery);
      if (!old && general.attempts === 0 && mastery.attempts === 0) continue;
      if (earnsReward) awarded += 1;
      const values = {
        solved: general.solved,
        attempts: general.attempts,
        firstTry: general.firstTry,
        masterySolved: mastery.solved,
        masteryAttempts: mastery.attempts,
        masteryFirstTry: mastery.firstTry,
        rewarded: hasReward || earnsReward,
      };
      if (old) {
        await tx.update(topicProgress).set(values).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
      } else {
        await tx.insert(topicProgress).values({ userId, topicId, ...values });
      }
      if (earnsReward) await tx.insert(plusLedger).values({ userId, kind: "mastery", refId: topicId, amount: 1 });
    }

    await tx.update(studentStats).set({
      solved: Math.max(stats.solved, incoming.solved),
      attempts: Math.max(stats.attempts, incoming.attempts),
      firstTry: Math.max(stats.firstTry, incoming.firstTry),
      streak: Math.max(stats.streak, incoming.streak),
      bestStreak: Math.max(stats.bestStreak, incoming.bestStreak),
      plusBalance: stats.plusBalance + awarded,
      migratedAt: new Date(),
    }).where(eq(studentStats.userId, userId));
    return { migrated: true, awarded };
  });
}

export async function purchaseTheme(userId: number, themeId: string) {
  const theme = getTheme(themeId);
  if (theme.id !== themeId || theme.price === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Это оформление не нужно покупать" });
  }
  await ensureStudentStats(userId);
  await getDb().transaction(async (tx) => {
    const stats = (await tx.select().from(studentStats).where(eq(studentStats.userId, userId)).for("update").limit(1))[0];
    if (!stats) throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" });
    const owned = (await tx.select().from(purchasedThemes).where(and(
      eq(purchasedThemes.userId, userId), eq(purchasedThemes.themeId, themeId),
    )).limit(1))[0];
    if (owned) {
      await tx.update(studentStats).set({ selectedTheme: themeId }).where(eq(studentStats.userId, userId));
      return;
    }
    const usesSparks = theme.currency === "spark";
    const balance = usesSparks ? stats.sparkBalance : stats.plusBalance;
    if (balance < theme.price) {
      const unit = usesSparks ? "искр" : "плюсика";
      throw new TRPCError({ code: "BAD_REQUEST", message: `Для этой темы нужно ещё ${theme.price - balance} ${unit}` });
    }
    await tx.insert(purchasedThemes).values({ userId, themeId });
    if (usesSparks) {
      await tx.insert(sparkLedger).values({ userId, kind: "theme-purchase", refId: themeId, amount: -theme.price, note: `Оформление «${theme.name}»` });
    } else {
      await tx.insert(plusLedger).values({ userId, kind: "purchase", refId: themeId, amount: -theme.price });
    }
    await tx.update(studentStats).set({
      plusBalance: usesSparks ? stats.plusBalance : stats.plusBalance - theme.price,
      sparkBalance: usesSparks ? stats.sparkBalance - theme.price : stats.sparkBalance,
      selectedTheme: themeId,
    }).where(eq(studentStats.userId, userId));
  });
}

export async function selectOwnedTheme(userId: number, themeId: string) {
  if (themeId !== "classic") {
    const owned = await getDb().select().from(purchasedThemes).where(and(
      eq(purchasedThemes.userId, userId), eq(purchasedThemes.themeId, themeId),
    )).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Сначала открой это оформление" });
  }
  await getDb().update(studentStats).set({ selectedTheme: themeId }).where(eq(studentStats.userId, userId));
}

export async function resetCloudProgress(userId: number) {
  await getDb().transaction(async (tx) => {
    await tx.select().from(studentStats).where(eq(studentStats.userId, userId)).for("update").limit(1);
    await tx.update(studentStats).set({ solved: 0, attempts: 0, firstTry: 0, streak: 0, bestStreak: 0 })
      .where(eq(studentStats.userId, userId));
    await tx.update(topicProgress).set({
      solved: 0, attempts: 0, firstTry: 0,
      masterySolved: 0, masteryAttempts: 0, masteryFirstTry: 0,
    }).where(eq(topicProgress.userId, userId));
  });
}

export async function updateGrade(userId: number, grade: number) {
  await getDb().update(studentStats).set({ grade }).where(eq(studentStats.userId, userId));
}

export async function breakStreak(userId: number) {
  await getDb().update(studentStats).set({ streak: 0 }).where(eq(studentStats.userId, userId));
}

export async function findStudentUser(unionId: string) {
  return (await getDb().select().from(users).where(eq(users.unionId, unionId)).limit(1))[0];
}
