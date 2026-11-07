import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  classes,
  classMembers,
  prizeClaims,
  prizeGoals,
  prizes,
  stipendCycles,
  stipendEvents,
  stipendPrograms,
  users,
} from "@db/schema";
import { getDb } from "./connection";
import {
  ACTIVE_CLAIM_STATUSES,
  canTransitionClaim,
  claimNeedsRefund,
  cycleEndDate,
  maxCycleEarnings,
} from "./stipend-math";

export { ACTIVE_CLAIM_STATUSES };

export const DEFAULT_PRIZES: { title: string; category: string; emoji: string; price: number }[] = [
  { title: "Стикерпак по своему дизайну", category: "Творчество", emoji: "🎨", price: 250 },
  { title: "Чарм на рюкзак", category: "Стиль", emoji: "🎒", price: 250 },
  { title: "Мини-головоломка", category: "Игры", emoji: "🧩", price: 250 },
  { title: "Цепочка для телефона", category: "Стиль", emoji: "📱", price: 500 },
  { title: "Фотопечать для комнаты", category: "Для комнаты", emoji: "🖼️", price: 500 },
  { title: "Компактная карточная игра", category: "Игры", emoji: "🃏", price: 500 },
  { title: "Проектор заката", category: "Для комнаты", emoji: "🌇", price: 750 },
  { title: "Маркеры для скетчинга", category: "Творчество", emoji: "🖊️", price: 750 },
  { title: "Сквиш или антистресс-куб", category: "Игры", emoji: "🧸", price: 750 },
  { title: "LED-подсветка комнаты", category: "Для комнаты", emoji: "💡", price: 1000 },
  { title: "Кружка с личным дизайном", category: "Стиль", emoji: "☕", price: 1000 },
  { title: "Сертификат на маркетплейс", category: "Сертификаты", emoji: "🎟️", price: 1000 },
  { title: "Конструктор-миниатюра", category: "Игры", emoji: "🏗️", price: 1250 },
  { title: "Поясная сумка", category: "Стиль", emoji: "👝", price: 1250 },
  { title: "Манга или комикс", category: "Книги", emoji: "📚", price: 1250 },
  { title: "Портативная Bluetooth-колонка", category: "Гаджеты", emoji: "🔊", price: 1500 },
  { title: "Набор для полимерной лепки", category: "Творчество", emoji: "🗿", price: 1500 },
  { title: "Сертификат по интересам", category: "Сертификаты", emoji: "🎫", price: 1500 },
  { title: "Внешний аккумулятор", category: "Гаджеты", emoji: "🔋", price: 1750 },
  { title: "Настольная игра для компании", category: "Игры", emoji: "🎲", price: 1750 },
  { title: "Футболка с личным принтом", category: "Стиль", emoji: "👕", price: 1750 },
  { title: "Проектор звёздного неба", category: "Для комнаты", emoji: "✨", price: 2000 },
  { title: "3D-ручка с пластиком", category: "Творчество", emoji: "🖌️", price: 2000 },
  { title: "Сертификат на мастер-класс", category: "Сертификаты", emoji: "🎓", price: 2000 },
  { title: "Беспроводные наушники", category: "Гаджеты", emoji: "🎧", price: 2500 },
  { title: "Мини-принтер для телефона", category: "Гаджеты", emoji: "🖨️", price: 2500 },
  { title: "Большой сертификат на выбор", category: "Сертификаты", emoji: "💳", price: 2500 },
  { title: "Колонка с хорошим звуком", category: "Гаджеты", emoji: "📻", price: 3000 },
  { title: "Худи с собственным дизайном", category: "Стиль", emoji: "🧥", price: 3000 },
  { title: "Главный приз на выбор", category: "Сертификаты", emoji: "🏆", price: 3000 },
];

type Program = typeof stipendPrograms.$inferSelect;
type Cycle = typeof stipendCycles.$inferSelect;
type ClaimStatus = (typeof prizeClaims.$inferSelect)["status"];

/** Database logic. */

export async function getProgram(teacherId: number) {
  return (await getDb().select().from(stipendPrograms).where(eq(stipendPrograms.teacherId, teacherId)).limit(1))[0] ?? null;
}

export async function saveProgram(
  teacherId: number,
  input: { amountPerHomework: number; cycleBonus: number; cycleWeeks: number; homeworkPerWeek: number; active: boolean },
) {
  const existing = await getProgram(teacherId);
  if (existing) {
    await getDb().update(stipendPrograms).set({ ...input, updatedAt: new Date() })
      .where(eq(stipendPrograms.id, existing.id));
  } else {
    await getDb().insert(stipendPrograms).values({ teacherId, ...input });
    const prizeCount = (await getDb().select({ id: prizes.id }).from(prizes).where(eq(prizes.teacherId, teacherId)).limit(1))[0];
    if (!prizeCount) {
      await getDb().insert(prizes).values(
        DEFAULT_PRIZES.map((prize, index) => ({ teacherId, ...prize, sortOrder: index })),
      );
    }
  }
  return getProgram(teacherId);
}

async function ensureActiveCycle(studentId: number, program: Program): Promise<Cycle> {
  const db = getDb();
  const existing = (await db.select().from(stipendCycles)
    .where(and(eq(stipendCycles.studentId, studentId), eq(stipendCycles.status, "active")))
    .orderBy(desc(stipendCycles.id)).limit(1))[0];
  const now = new Date();
  if (existing && existing.endsAt > now) return existing;
  return db.transaction(async (tx) => {
    const current = (await tx.select().from(stipendCycles)
      .where(and(eq(stipendCycles.studentId, studentId), eq(stipendCycles.status, "active")))
      .orderBy(desc(stipendCycles.id)).for("update").limit(1))[0];
    if (current && current.endsAt > now) return current;
    // Заработанное не сгорает: баланс переходит в новый цикл, счётчики цикла сбрасываются.
    const carryBalance = current?.balance ?? 0;
    if (current) {
      await tx.update(stipendCycles).set({ status: "completed" }).where(eq(stipendCycles.id, current.id));
    }
    const inserted = await tx.insert(stipendCycles).values({
      studentId,
      startsAt: now,
      endsAt: cycleEndDate(now, program.cycleWeeks),
      balance: carryBalance,
    }).$returningId();
    const id = inserted[0]?.id;
    if (!id) throw new Error("Cycle id was not returned");
    const created = (await tx.select().from(stipendCycles).where(eq(stipendCycles.id, id)).limit(1))[0];
    if (!created) throw new Error("Cycle was not created");
    return created;
  });
}

/** Начисление за проверенную домашку. Идемпотентно по submissionId. */
export async function creditHomeworkReview(teacherId: number, submissionId: number, studentId: number) {
  const program = await getProgram(teacherId);
  if (!program?.active) return { credited: false as const };
  const refId = String(submissionId);
  const duplicate = (await getDb().select({ id: stipendEvents.id }).from(stipendEvents)
    .where(and(
      eq(stipendEvents.studentId, studentId),
      eq(stipendEvents.kind, "homework_credit"),
      eq(stipendEvents.refId, refId),
    )).limit(1))[0];
  if (duplicate) return { credited: false as const };
  const cycle = await ensureActiveCycle(studentId, program);
  await getDb().transaction(async (tx) => {
    await tx.insert(stipendEvents).values({
      cycleId: cycle.id,
      studentId,
      kind: "homework_credit",
      refId,
      amount: program.amountPerHomework,
      note: "Домашняя работа проверена",
      createdBy: teacherId,
    });
    await tx.update(stipendCycles).set({
      balance: cycle.balance + program.amountPerHomework,
      homeworkCount: cycle.homeworkCount + 1,
    }).where(eq(stipendCycles.id, cycle.id));
  });
  return { credited: true as const, amount: program.amountPerHomework };
}

export async function grantCycleBonus(teacherId: number, studentId: number) {
  const program = await getProgram(teacherId);
  if (!program?.active) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Стипендиальная программа не настроена" });
  const cycle = await ensureActiveCycle(studentId, program);
  if (cycle.bonusGranted) throw new TRPCError({ code: "CONFLICT", message: "Бонус цикла уже выдан" });
  await getDb().transaction(async (tx) => {
    await tx.insert(stipendEvents).values({
      cycleId: cycle.id,
      studentId,
      kind: "cycle_bonus",
      refId: `cycle-${cycle.id}`,
      amount: program.cycleBonus,
      note: "Бонус за полный цикл",
      createdBy: teacherId,
    });
    await tx.update(stipendCycles).set({
      balance: cycle.balance + program.cycleBonus,
      bonusGranted: true,
    }).where(eq(stipendCycles.id, cycle.id));
  });
  return { amount: program.cycleBonus };
}

async function findStudentTeacher(studentId: number) {
  const rows = await getDb().select({ program: stipendPrograms }).from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .innerJoin(stipendPrograms, eq(stipendPrograms.teacherId, classes.teacherId))
    .where(and(eq(classMembers.studentId, studentId), eq(stipendPrograms.active, true)))
    .limit(1);
  return rows[0]?.program ?? null;
}

export async function studentOverview(studentId: number) {
  const program = await findStudentTeacher(studentId);
  if (!program) {
    return {
      program: null as null,
      cycle: null as Cycle | null,
      prizes: [] as (typeof prizes.$inferSelect)[],
      goal: null as typeof prizes.$inferSelect | null,
      activeClaim: null as typeof prizeClaims.$inferSelect | null,
      events: [] as (typeof stipendEvents.$inferSelect)[],
    };
  }
  const db = getDb();
  const cycle = (await db.select().from(stipendCycles)
    .where(and(eq(stipendCycles.studentId, studentId), eq(stipendCycles.status, "active")))
    .orderBy(desc(stipendCycles.id)).limit(1))[0] ?? null;
  const prizeRows = await db.select().from(prizes)
    .where(and(eq(prizes.teacherId, program.teacherId), eq(prizes.active, true)))
    .orderBy(prizes.price, prizes.sortOrder);
  const goalRow = (await db.select({ goal: prizeGoals, prize: prizes }).from(prizeGoals)
    .innerJoin(prizes, eq(prizes.id, prizeGoals.prizeId))
    .where(eq(prizeGoals.studentId, studentId)).limit(1))[0] ?? null;
  const activeClaim = (await db.select().from(prizeClaims)
    .where(and(eq(prizeClaims.studentId, studentId), inArray(prizeClaims.status, [...ACTIVE_CLAIM_STATUSES])))
    .orderBy(desc(prizeClaims.id)).limit(1))[0] ?? null;
  const eventRows = cycle ? await db.select().from(stipendEvents)
    .where(eq(stipendEvents.studentId, studentId))
    .orderBy(desc(stipendEvents.id)).limit(30) : [];
  return {
    program: {
      amountPerHomework: program.amountPerHomework,
      cycleBonus: program.cycleBonus,
      cycleWeeks: program.cycleWeeks,
      homeworkPerWeek: program.homeworkPerWeek,
      maxCycle: maxCycleEarnings(program),
    },
    cycle,
    prizes: prizeRows,
    goal: goalRow ? goalRow.prize : null,
    activeClaim,
    events: eventRows,
  };
}

export async function chooseGoal(studentId: number, prizeId: number) {
  const program = await findStudentTeacher(studentId);
  if (!program) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Стипендия пока не запущена учителем" });
  const prize = (await getDb().select().from(prizes)
    .where(and(eq(prizes.id, prizeId), eq(prizes.teacherId, program.teacherId), eq(prizes.active, true)))
    .limit(1))[0];
  if (!prize) throw new TRPCError({ code: "NOT_FOUND", message: "Приз не найден" });
  await getDb().insert(prizeGoals).values({ studentId, prizeId })
    .onDuplicateKeyUpdate({ set: { prizeId, chosenAt: new Date() } });
  return { ok: true as const };
}

export async function claimPrize(studentId: number, prizeId: number) {
  const program = await findStudentTeacher(studentId);
  if (!program) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Стипендия пока не запущена учителем" });
  const db = getDb();
  const prize = (await db.select().from(prizes)
    .where(and(eq(prizes.id, prizeId), eq(prizes.teacherId, program.teacherId), eq(prizes.active, true)))
    .limit(1))[0];
  if (!prize) throw new TRPCError({ code: "NOT_FOUND", message: "Приз не найден" });
  const pending = (await db.select({ id: prizeClaims.id }).from(prizeClaims)
    .where(and(eq(prizeClaims.studentId, studentId), inArray(prizeClaims.status, [...ACTIVE_CLAIM_STATUSES])))
    .limit(1))[0];
  if (pending) throw new TRPCError({ code: "CONFLICT", message: "У тебя уже есть приз в пути — дождись его вручения" });
  const cycle = await ensureActiveCycle(studentId, program);
  if (cycle.balance < prize.price) {
    throw new TRPCError({ code: "CONFLICT", message: `В копилке пока ${cycle.balance} ₽ из ${prize.price} ₽` });
  }
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(prizeClaims).values({
      studentId,
      prizeId,
      cycleId: cycle.id,
      title: prize.title,
      priceSnapshot: prize.price,
    }).$returningId();
    const claimId = inserted[0]?.id;
    if (!claimId) throw new Error("Claim id was not returned");
    await tx.insert(stipendEvents).values({
      cycleId: cycle.id,
      studentId,
      kind: "prize_debit",
      refId: `claim-${claimId}`,
      amount: -prize.price,
      note: `Заказ приза «${prize.title}»`,
    });
    await tx.update(stipendCycles).set({ balance: cycle.balance - prize.price })
      .where(eq(stipendCycles.id, cycle.id));
  });
  return { ok: true as const };
}

export async function updateClaim(
  teacherId: number,
  input: { claimId: number; status: ClaimStatus; actualPrice?: number; note?: string },
) {
  const claim = (await getDb().select().from(prizeClaims).where(eq(prizeClaims.id, input.claimId)).limit(1))[0];
  if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Заявка не найдена" });
  const prize = (await getDb().select().from(prizes).where(eq(prizes.id, claim.prizeId)).limit(1))[0];
  if (!prize || prize.teacherId !== teacherId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Это заявка не вашего ученика" });
  }
  if (!canTransitionClaim(claim.status, input.status)) {
    throw new TRPCError({ code: "CONFLICT", message: "Такой переход статуса невозможен" });
  }
  await getDb().transaction(async (tx) => {
    await tx.update(prizeClaims).set({
      status: input.status,
      actualPrice: input.actualPrice ?? claim.actualPrice,
      note: input.note ?? claim.note,
      updatedAt: new Date(),
    }).where(eq(prizeClaims.id, claim.id));
    if (input.status === "cancelled" && claimNeedsRefund(claim.status)) {
      const cycle = (await tx.select().from(stipendCycles).where(eq(stipendCycles.id, claim.cycleId)).for("update").limit(1))[0];
      if (cycle) {
        await tx.insert(stipendEvents).values({
          cycleId: cycle.id,
          studentId: claim.studentId,
          kind: "refund",
          refId: `claim-${claim.id}-refund`,
          amount: claim.priceSnapshot,
          note: `Возврат за «${claim.title}»`,
          createdBy: teacherId,
        });
        await tx.update(stipendCycles).set({ balance: cycle.balance + claim.priceSnapshot })
          .where(eq(stipendCycles.id, cycle.id));
      }
    }
  });
  return { ok: true as const };
}

export async function teacherOverview(teacherId: number) {
  const program = await getProgram(teacherId);
  const db = getDb();
  const memberRows = await db.select({ student: users }).from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .innerJoin(users, eq(users.id, classMembers.studentId))
    .where(eq(classes.teacherId, teacherId));
  const seen = new Set<number>();
  const students = memberRows.filter(row => {
    if (seen.has(row.student.id)) return false;
    seen.add(row.student.id);
    return true;
  }).map(row => ({ id: row.student.id, name: row.student.name }));
  const studentIds = students.map(student => student.id);
  const cycleRows = studentIds.length ? await db.select().from(stipendCycles)
    .where(and(inArray(stipendCycles.studentId, studentIds), eq(stipendCycles.status, "active"))) : [];
  const claimRows = studentIds.length ? await db.select().from(prizeClaims)
    .where(inArray(prizeClaims.studentId, studentIds)).orderBy(desc(prizeClaims.id)).limit(100) : [];
  const prizeRows = await db.select().from(prizes)
    .where(eq(prizes.teacherId, teacherId)).orderBy(prizes.price, prizes.sortOrder);
  const studentName = new Map(students.map(student => [student.id, student.name ?? "Ученик"]));
  const perStudentMax = program ? maxCycleEarnings(program) : 0;
  return {
    program,
    students: students.map(student => ({
      ...student,
      cycle: cycleRows.find(cycle => cycle.studentId === student.id) ?? null,
      activeClaim: claimRows.find(claim => claim.studentId === student.id
        && (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status)) ?? null,
    })),
    claims: claimRows.map(claim => ({ ...claim, studentName: studentName.get(claim.studentId) ?? "Ученик" })),
    prizes: prizeRows,
    budget: {
      studentCount: students.length,
      perStudentMax,
      maxObligations: students.length * perStudentMax,
      credited: cycleRows.reduce((sum, cycle) => sum + cycle.balance, 0)
        + claimRows.filter(claim => claim.status !== "cancelled").reduce((sum, claim) => sum + claim.priceSnapshot, 0),
      inDelivery: claimRows.filter(claim => (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status))
        .reduce((sum, claim) => sum + claim.priceSnapshot, 0),
      delivered: claimRows.filter(claim => claim.status === "delivered")
        .reduce((sum, claim) => sum + (claim.actualPrice ?? claim.priceSnapshot), 0),
    },
  };
}

export async function upsertPrize(
  teacherId: number,
  input: { id?: number; title: string; category: string; emoji: string; price: number; active: boolean },
) {
  if (input.id) {
    const existing = (await getDb().select().from(prizes).where(eq(prizes.id, input.id)).limit(1))[0];
    if (!existing || existing.teacherId !== teacherId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Приз не найден" });
    }
    await getDb().update(prizes).set({
      title: input.title,
      category: input.category,
      emoji: input.emoji,
      price: input.price,
      active: input.active,
    }).where(eq(prizes.id, input.id));
  } else {
    const count = (await getDb().select({ id: prizes.id }).from(prizes).where(eq(prizes.teacherId, teacherId))).length;
    await getDb().insert(prizes).values({ teacherId, ...input, sortOrder: count });
  }
  return { ok: true as const };
}
