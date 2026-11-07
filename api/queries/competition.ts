import { randomInt, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  competitionAnswers,
  competitionPlayers,
  competitionRooms,
  sparkLedger,
  studentStats,
  trophies,
} from "@db/schema";
import {
  COMPETITION_COUNTDOWN_SEC,
  COMPETITION_DURATION_SEC,
  COMPETITION_MAX_PLAYERS,
  COMPETITION_MIN_PLAYERS,
  COMPETITION_SPARK_REWARDS,
  COMPETITION_TASK_COUNT,
  type CompetitionPlayerView,
  type CompetitionRoomView,
} from "@contracts/competition";
import { competitionAnswerMatches, createCompetitionTasks } from "../competition-tasks";
import { getDb } from "./connection";
import { ensureStudentStats } from "./learning";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function roomCode() {
  return Array.from({ length: 6 }, () => ROOM_ALPHABET[randomInt(0, ROOM_ALPHABET.length)]).join("");
}

function parseTasks(tasksJson: string | null) {
  if (!tasksJson) return [] as { expression: string; answer: number }[];
  return JSON.parse(tasksJson) as { expression: string; answer: number }[];
}

function rankedPlayers(players: CompetitionPlayerView[]) {
  return [...players].sort((a, b) =>
    b.correct - a.correct ||
    a.totalTimeMs - b.totalTimeMs ||
    a.userId - b.userId,
  );
}

async function finalizeRoomIfNeeded(roomId: string) {
  await getDb().transaction(async (tx) => {
    const room = (await tx.select().from(competitionRooms).where(eq(competitionRooms.id, roomId)).for("update").limit(1))[0];
    if (!room || room.status !== "active" || !room.endsAt) return;
    const players = await tx.select().from(competitionPlayers).where(eq(competitionPlayers.roomId, roomId)).for("update");
    const allFinished = players.length >= COMPETITION_MIN_PLAYERS && players.every((player) => player.answered >= room.taskCount);
    if (Date.now() < room.endsAt.getTime() && !allFinished) return;

    const ranked = rankedPlayers(players.map((player) => ({
      userId: player.userId,
      name: player.name,
      correct: player.correct,
      answered: player.answered,
      totalTimeMs: player.totalTimeMs,
      finished: player.answered >= room.taskCount,
      place: null,
      sparks: 0,
    })));
    const eligible = ranked.filter((player) => player.answered > 0).slice(0, COMPETITION_MIN_PLAYERS);

    await tx.update(competitionRooms).set({ status: "finished", finishedAt: new Date() })
      .where(eq(competitionRooms.id, roomId));

    for (const player of ranked) {
      const podiumIndex = eligible.findIndex((item) => item.userId === player.userId);
      const place = podiumIndex >= 0 ? podiumIndex + 1 : null;
      const sparks = place ? COMPETITION_SPARK_REWARDS[podiumIndex] : player.answered >= room.taskCount ? 1 : 0;
      if (!sparks) continue;
      const stats = (await tx.select().from(studentStats).where(eq(studentStats.userId, player.userId)).for("update").limit(1))[0];
      if (!stats) continue;
      await tx.insert(sparkLedger).values({
        userId: player.userId,
        kind: "competition",
        refId: roomId,
        amount: sparks,
        note: place ? `${place} место в сетевой комнате` : "Финиш в сетевой комнате",
      });
      if (place) await tx.insert(trophies).values({ userId: player.userId, roomId, place });
      await tx.update(studentStats).set({ sparkBalance: stats.sparkBalance + sparks })
        .where(eq(studentStats.userId, player.userId));
    }
  });
}

export async function getCompetitionRoom(userId: number, code: string): Promise<CompetitionRoomView> {
  const normalized = code.trim().toUpperCase();
  const found = (await getDb().select().from(competitionRooms).where(eq(competitionRooms.code, normalized)).limit(1))[0];
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "Комната с таким кодом не найдена" });
  if (found.status === "active") await finalizeRoomIfNeeded(found.id);

  const [room, playerRows, answerRows] = await Promise.all([
    getDb().select().from(competitionRooms).where(eq(competitionRooms.id, found.id)).limit(1).then((rows) => rows[0]),
    getDb().select().from(competitionPlayers).where(eq(competitionPlayers.roomId, found.id)).orderBy(asc(competitionPlayers.joinedAt)),
    getDb().select().from(competitionAnswers).where(and(
      eq(competitionAnswers.roomId, found.id),
      eq(competitionAnswers.userId, userId),
    )),
  ]);
  const membership = playerRows.find((player) => player.userId === userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Сначала присоединись к этой комнате" });

  const basePlayers: CompetitionPlayerView[] = playerRows.map((player) => ({
    userId: player.userId,
    name: player.name,
    correct: player.correct,
    answered: player.answered,
    totalTimeMs: player.totalTimeMs,
    finished: player.answered >= room.taskCount,
    place: null,
    sparks: 0,
  }));
  const ranked = rankedPlayers(basePlayers);
  const eligible = ranked.filter((player) => player.answered > 0).slice(0, COMPETITION_MIN_PLAYERS);
  const players = basePlayers.map((player) => {
    const place = room.status === "finished" ? eligible.findIndex((item) => item.userId === player.userId) + 1 || null : null;
    return {
      ...player,
      place,
      sparks: room.status === "finished"
        ? place ? COMPETITION_SPARK_REWARDS[place - 1] : player.finished ? 1 : 0
        : 0,
    };
  });
  const showAnswers = room.status === "finished";
  const tasks = parseTasks(room.tasksJson).map((task, index) => ({
    index,
    expression: task.expression,
    answer: showAnswers ? task.answer : null,
  }));

  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    grade: room.grade,
    difficulty: room.difficulty as "medium" | "hard",
    status: room.status,
    taskCount: room.taskCount,
    durationSec: room.durationSec,
    startsAt: room.startsAt,
    endsAt: room.endsAt,
    serverNow: new Date(),
    tasks: room.status === "lobby" ? [] : tasks,
    players,
    answeredTaskIndexes: answerRows.map((answer) => answer.taskIndex),
  };
}

export async function createCompetitionRoom(userId: number, name: string | null, grade: number, difficulty: "medium" | "hard") {
  await ensureStudentStats(userId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID();
    const code = roomCode();
    try {
      await getDb().transaction(async (tx) => {
        await tx.insert(competitionRooms).values({
          id,
          code,
          hostUserId: userId,
          grade,
          difficulty,
          taskCount: COMPETITION_TASK_COUNT,
          durationSec: COMPETITION_DURATION_SEC,
        });
        await tx.insert(competitionPlayers).values({ roomId: id, userId, name: name?.trim() || "Ученик" });
      });
      return getCompetitionRoom(userId, code);
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    }
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось создать код комнаты" });
}

export async function joinCompetitionRoom(userId: number, name: string | null, code: string) {
  await ensureStudentStats(userId);
  const normalized = code.trim().toUpperCase();
  await getDb().transaction(async (tx) => {
    const room = (await tx.select().from(competitionRooms).where(eq(competitionRooms.code, normalized)).for("update").limit(1))[0];
    if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Комната с таким кодом не найдена" });
    const players = await tx.select().from(competitionPlayers).where(eq(competitionPlayers.roomId, room.id)).for("update");
    if (players.some((player) => player.userId === userId)) return;
    if (room.status !== "lobby") throw new TRPCError({ code: "BAD_REQUEST", message: "Это соревнование уже началось" });
    if (players.length >= COMPETITION_MAX_PLAYERS) throw new TRPCError({ code: "BAD_REQUEST", message: "В комнате уже 8 учеников" });
    await tx.insert(competitionPlayers).values({ roomId: room.id, userId, name: name?.trim() || "Ученик" });
  });
  return getCompetitionRoom(userId, normalized);
}

export async function startCompetitionRoom(userId: number, code: string) {
  const normalized = code.trim().toUpperCase();
  await getDb().transaction(async (tx) => {
    const room = (await tx.select().from(competitionRooms).where(eq(competitionRooms.code, normalized)).for("update").limit(1))[0];
    if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Комната не найдена" });
    if (room.hostUserId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Запустить игру может только создатель комнаты" });
    if (room.status !== "lobby") return;
    const players = await tx.select().from(competitionPlayers).where(eq(competitionPlayers.roomId, room.id));
    if (players.length < COMPETITION_MIN_PLAYERS) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Для честных призовых мест нужно ещё ${COMPETITION_MIN_PLAYERS - players.length} ученика` });
    }
    const tasks = createCompetitionTasks(room.id, room.grade, room.difficulty as "medium" | "hard", room.taskCount);
    const startsAt = new Date(Date.now() + COMPETITION_COUNTDOWN_SEC * 1000);
    const endsAt = new Date(startsAt.getTime() + room.durationSec * 1000);
    await tx.update(competitionRooms).set({ status: "active", tasksJson: JSON.stringify(tasks), startsAt, endsAt })
      .where(eq(competitionRooms.id, room.id));
  });
  return getCompetitionRoom(userId, normalized);
}

export async function submitCompetitionAnswer(userId: number, input: { code: string; taskIndex: number; answer: string }) {
  const normalized = input.code.trim().toUpperCase();
  await getDb().transaction(async (tx) => {
    const room = (await tx.select().from(competitionRooms).where(eq(competitionRooms.code, normalized)).for("update").limit(1))[0];
    if (!room || room.status !== "active" || !room.startsAt || !room.endsAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Соревнование сейчас не принимает ответы" });
    }
    const now = new Date();
    if (now < room.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Дождись общего сигнала старта" });
    if (now >= room.endsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Время соревнования вышло" });
    const player = (await tx.select().from(competitionPlayers).where(and(
      eq(competitionPlayers.roomId, room.id), eq(competitionPlayers.userId, userId),
    )).for("update").limit(1))[0];
    if (!player) throw new TRPCError({ code: "FORBIDDEN", message: "Ты не участвуешь в этой комнате" });
    const task = parseTasks(room.tasksJson)[input.taskIndex];
    if (!task) throw new TRPCError({ code: "BAD_REQUEST", message: "Такого задания в комнате нет" });
    const previous = (await tx.select().from(competitionAnswers).where(and(
      eq(competitionAnswers.roomId, room.id),
      eq(competitionAnswers.userId, userId),
      eq(competitionAnswers.taskIndex, input.taskIndex),
    )).limit(1))[0];
    if (previous) return;

    const correct = competitionAnswerMatches(input.answer, task.answer);
    const timeMs = Math.max(0, now.getTime() - room.startsAt.getTime());
    await tx.insert(competitionAnswers).values({
      roomId: room.id,
      userId,
      taskIndex: input.taskIndex,
      answer: input.answer,
      correct,
      timeMs,
    });
    const answered = player.answered + 1;
    await tx.update(competitionPlayers).set({
      correct: player.correct + (correct ? 1 : 0),
      answered,
      totalTimeMs: timeMs,
      finishedAt: answered >= room.taskCount ? now : null,
    }).where(and(eq(competitionPlayers.roomId, room.id), eq(competitionPlayers.userId, userId)));
  });
  return getCompetitionRoom(userId, normalized);
}
