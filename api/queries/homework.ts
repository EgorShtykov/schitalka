import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sparkLedger, studentStats, users } from "@db/schema";
import { normalizeLogin } from "../password";
import { getDb } from "./connection";
import { ensureStudentStats } from "./learning";

export async function grantHomeworkReward(
  teacherId: number,
  input: { rewardId: string; studentLogin: string; amount: number; note: string },
) {
  const normalized = normalizeLogin(input.studentLogin);
  const student = (await getDb().select().from(users).where(eq(users.unionId, `student:${normalized}`)).limit(1))[0];
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Ученик с таким логином не найден" });
  await ensureStudentStats(student.id);

  await getDb().transaction(async (tx) => {
    const stats = (await tx.select().from(studentStats).where(eq(studentStats.userId, student.id)).for("update").limit(1))[0];
    if (!stats) throw new TRPCError({ code: "NOT_FOUND", message: "Профиль ученика не найден" });
    const existing = (await tx.select().from(sparkLedger).where(eq(sparkLedger.refId, input.rewardId)).limit(1))[0];
    if (existing) return;
    await tx.insert(sparkLedger).values({
      userId: student.id,
      kind: "homework",
      refId: input.rewardId,
      amount: input.amount,
      note: input.note,
      createdBy: teacherId,
    });
    await tx.update(studentStats).set({ sparkBalance: stats.sparkBalance + input.amount })
      .where(eq(studentStats.userId, student.id));
  });

  return { studentName: student.name?.trim() || input.studentLogin.trim(), amount: input.amount, rewardId: input.rewardId };
}
