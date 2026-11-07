import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  classes,
  classMembers,
  gradeEntries,
  homeworkAssignments,
  homeworkFiles,
  homeworkSubmissions,
  studentStats,
  topicProgress,
  users,
} from "@db/schema";
import { getDb } from "./queries/connection";
import { hashPassword, normalizeLogin } from "./password";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { getAiAvailability, runHomeworkAiCheck } from "./ai/homework-check";

const loginSchema = z.string().trim().min(3).max(24);
const gradeSchema = z.number().int().min(1).max(5);

async function requireTeacherClass(teacherId: number, classId: number) {
  const row = await getDb().query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, teacherId)),
  });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Класс не найден" });
  return row;
}

async function requireTeacherSubmission(teacherId: number, submissionId: number) {
  const rows = await getDb()
    .select({ submission: homeworkSubmissions, assignment: homeworkAssignments })
    .from(homeworkSubmissions)
    .innerJoin(homeworkAssignments, eq(homeworkAssignments.id, homeworkSubmissions.assignmentId))
    .where(and(eq(homeworkSubmissions.id, submissionId), eq(homeworkAssignments.teacherId, teacherId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Работа не найдена" });
  return row;
}

async function requireMemberOfTeacherClass(teacherId: number, classId: number, studentId: number) {
  await requireTeacherClass(teacherId, classId);
  const member = await getDb().query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)),
  });
  if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Ученик не состоит в этом классе" });
}

export const teacherRouter = createRouter({
  overview: adminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const teacherId = ctx.user.id;
    const classRows = await db.select().from(classes).where(eq(classes.teacherId, teacherId)).orderBy(classes.grade, classes.name);
    const classIds = classRows.map((row) => row.id);
    const memberRows = classIds.length ? await db
      .select({
        classId: classMembers.classId,
        student: users,
        stats: studentStats,
      })
      .from(classMembers)
      .innerJoin(users, eq(users.id, classMembers.studentId))
      .leftJoin(studentStats, eq(studentStats.userId, users.id))
      .where(inArray(classMembers.classId, classIds)) : [];
    const studentIds = [...new Set(memberRows.map((row) => row.student.id))];
    const topicRows = studentIds.length ? await db.select().from(topicProgress).where(inArray(topicProgress.userId, studentIds)) : [];
    const assignmentRows = classIds.length ? await db.select().from(homeworkAssignments)
      .where(inArray(homeworkAssignments.classId, classIds)).orderBy(desc(homeworkAssignments.createdAt)) : [];
    const assignmentIds = assignmentRows.map((row) => row.id);
    const submissionRows = assignmentIds.length ? await db
      .select({ submission: homeworkSubmissions, studentName: users.name })
      .from(homeworkSubmissions)
      .innerJoin(users, eq(users.id, homeworkSubmissions.studentId))
      .where(inArray(homeworkSubmissions.assignmentId, assignmentIds))
      .orderBy(desc(homeworkSubmissions.updatedAt)) : [];
    const submissionIds = submissionRows.map((row) => row.submission.id);
    const fileRows = submissionIds.length ? await db.select().from(homeworkFiles)
      .where(inArray(homeworkFiles.submissionId, submissionIds)) : [];
    const gradeRows = await db
      .select({ grade: gradeEntries, studentName: users.name, className: classes.name })
      .from(gradeEntries)
      .innerJoin(users, eq(users.id, gradeEntries.studentId))
      .leftJoin(classes, eq(classes.id, gradeEntries.classId))
      .where(eq(gradeEntries.teacherId, teacherId))
      .orderBy(desc(gradeEntries.createdAt))
      .limit(300);

    return {
      classes: classRows.map((schoolClass) => ({
        ...schoolClass,
        members: memberRows.filter((row) => row.classId === schoolClass.id).map((row) => ({
          id: row.student.id,
          name: row.student.name,
          lastSignInAt: row.student.lastSignInAt,
          stats: row.stats,
          topics: topicRows.filter((topic) => topic.userId === row.student.id),
        })),
      })),
      assignments: assignmentRows.map((assignment) => ({
        ...assignment,
        className: classRows.find((row) => row.id === assignment.classId)?.name ?? "",
        submissions: submissionRows.filter((row) => row.submission.assignmentId === assignment.id).map((row) => ({
          ...row.submission,
          studentName: row.studentName,
          files: fileRows.filter((file) => file.submissionId === row.submission.id),
        })),
      })),
      grades: gradeRows.map((row) => ({ ...row.grade, studentName: row.studentName, className: row.className })),
      ai: await getAiAvailability(teacherId),
    };
  }),

  createClass: adminQuery.input(z.object({
    name: z.string().trim().min(2).max(40),
    grade: z.number().int().min(4).max(9),
  })).mutation(async ({ ctx, input }) => {
    try {
      await getDb().insert(classes).values({ teacherId: ctx.user.id, name: input.name, grade: input.grade });
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
        throw new TRPCError({ code: "CONFLICT", message: "Класс с таким названием уже существует" });
      }
      throw error;
    }
    return { ok: true as const };
  }),

  addStudent: adminQuery.input(z.object({ classId: z.number().int(), login: loginSchema }))
    .mutation(async ({ ctx, input }) => {
      await requireTeacherClass(ctx.user.id, input.classId);
      const student = await getDb().query.users.findFirst({
        where: eq(users.unionId, `student:${normalizeLogin(input.login)}`),
      });
      if (!student || student.role !== "user") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ученик с таким логином не найден" });
      }
      await getDb().insert(classMembers).values({ classId: input.classId, studentId: student.id })
        .onDuplicateKeyUpdate({ set: { classId: input.classId } });
      return { ok: true as const };
    }),

  removeStudent: adminQuery.input(z.object({ classId: z.number().int(), studentId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireMemberOfTeacherClass(ctx.user.id, input.classId, input.studentId);
      await getDb().delete(classMembers).where(and(
        eq(classMembers.classId, input.classId),
        eq(classMembers.studentId, input.studentId),
      ));
      return { ok: true as const };
    }),

  resetPassword: adminQuery.input(z.object({ classId: z.number().int(), studentId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireMemberOfTeacherClass(ctx.user.id, input.classId, input.studentId);
      const student = await getDb().query.users.findFirst({ where: eq(users.id, input.studentId) });
      if (!student || student.role !== "user") throw new TRPCError({ code: "NOT_FOUND", message: "Ученик не найден" });
      const temporaryPassword = randomBytes(9).toString("base64url");
      await getDb().update(users).set({
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        sessionVersion: student.sessionVersion + 1,
        updatedAt: new Date(),
      }).where(eq(users.id, student.id));
      return { temporaryPassword };
    }),

  createAssignment: adminQuery.input(z.object({
    classId: z.number().int(),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(5000),
    dueAt: z.string().datetime().optional(),
  })).mutation(async ({ ctx, input }) => {
    await requireTeacherClass(ctx.user.id, input.classId);
    await getDb().insert(homeworkAssignments).values({
      teacherId: ctx.user.id,
      classId: input.classId,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    });
    return { ok: true as const };
  }),

  reviewSubmission: adminQuery.input(z.object({
    submissionId: z.number().int(),
    status: z.enum(["reviewed", "needs_revision"]),
    teacherComment: z.string().trim().max(2000).optional(),
    grade: gradeSchema.optional(),
  })).mutation(async ({ ctx, input }) => {
    const { submission, assignment } = await requireTeacherSubmission(ctx.user.id, input.submissionId);
    await getDb().transaction(async (tx) => {
      await tx.update(homeworkSubmissions).set({
        status: input.status,
        teacherComment: input.teacherComment || null,
        updatedAt: new Date(),
      }).where(eq(homeworkSubmissions.id, submission.id));
      if (input.grade) {
        await tx.insert(gradeEntries).values({
          teacherId: ctx.user.id,
          studentId: submission.studentId,
          classId: assignment.classId,
          submissionId: submission.id,
          grade: input.grade,
          comment: input.teacherComment || assignment.title,
        }).onDuplicateKeyUpdate({ set: {
          grade: input.grade,
          comment: input.teacherComment || assignment.title,
          teacherId: ctx.user.id,
        } });
      }
    });
    return { ok: true as const };
  }),

  addGrade: adminQuery.input(z.object({
    classId: z.number().int(),
    studentId: z.number().int(),
    grade: gradeSchema,
    comment: z.string().trim().min(2).max(255),
  })).mutation(async ({ ctx, input }) => {
    await requireMemberOfTeacherClass(ctx.user.id, input.classId, input.studentId);
    await getDb().insert(gradeEntries).values({
      teacherId: ctx.user.id,
      classId: input.classId,
      studentId: input.studentId,
      grade: input.grade,
      comment: input.comment,
    });
    return { ok: true as const };
  }),

  checkSubmission: adminQuery.input(z.object({ submissionId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireTeacherSubmission(ctx.user.id, input.submissionId);
      return runHomeworkAiCheck(ctx.user.id, input.submissionId);
    }),
});

export const studentSchoolRouter = createRouter({
  overview: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db.select({ schoolClass: classes }).from(classMembers)
      .innerJoin(classes, eq(classes.id, classMembers.classId))
      .where(eq(classMembers.studentId, ctx.user.id)).orderBy(classes.grade, classes.name);
    const classIds = memberships.map((row) => row.schoolClass.id);
    const assignmentRows = classIds.length ? await db.select().from(homeworkAssignments)
      .where(inArray(homeworkAssignments.classId, classIds)).orderBy(desc(homeworkAssignments.createdAt)) : [];
    const submissionRows = await db.select().from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.studentId, ctx.user.id));
    const submissionIds = submissionRows.map((row) => row.id);
    const fileRows = submissionIds.length ? await db.select().from(homeworkFiles)
      .where(inArray(homeworkFiles.submissionId, submissionIds)) : [];
    const grades = await db.select().from(gradeEntries).where(eq(gradeEntries.studentId, ctx.user.id))
      .orderBy(desc(gradeEntries.createdAt)).limit(300);
    return {
      classes: memberships.map((row) => ({
        ...row.schoolClass,
        assignments: assignmentRows.filter((assignment) => assignment.classId === row.schoolClass.id).map((assignment) => {
          const submission = submissionRows.find((row) => row.assignmentId === assignment.id);
          if (!submission) return { ...assignment, submission: null };
          const { aiReport: _aiReport, aiConfidence: _aiConfidence, aiStatus: _aiStatus, ...studentSubmission } = submission;
          return {
            ...assignment,
            submission: {
              ...studentSubmission,
              files: fileRows.filter((file) => file.submissionId === submission.id),
            },
          };
        }),
      })),
      grades,
    };
  }),

  submit: authedQuery.input(z.object({
    assignmentId: z.number().int(),
    textAnswer: z.string().trim().max(5000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const rows = await getDb().select({ assignment: homeworkAssignments }).from(homeworkAssignments)
      .innerJoin(classMembers, eq(classMembers.classId, homeworkAssignments.classId))
      .where(and(eq(homeworkAssignments.id, input.assignmentId), eq(classMembers.studentId, ctx.user.id)))
      .limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Задание не найдено" });
    const existing = await getDb().query.homeworkSubmissions.findFirst({
      where: and(eq(homeworkSubmissions.assignmentId, input.assignmentId), eq(homeworkSubmissions.studentId, ctx.user.id)),
    });
    if (existing?.status === "reviewed") {
      throw new TRPCError({ code: "CONFLICT", message: "Проверенную работу изменить нельзя" });
    }
    if (existing) {
      await getDb().update(homeworkSubmissions).set({
        textAnswer: input.textAnswer || null,
        status: "submitted",
        teacherComment: null,
        aiStatus: "idle",
        aiReport: null,
        aiConfidence: null,
        updatedAt: new Date(),
      }).where(eq(homeworkSubmissions.id, existing.id));
      return { submissionId: existing.id };
    }
    const inserted = await getDb().insert(homeworkSubmissions).values({
      assignmentId: input.assignmentId,
      studentId: ctx.user.id,
      textAnswer: input.textAnswer || null,
    }).$returningId();
    const submissionId = inserted[0]?.id;
    if (!submissionId) throw new Error("Submission id was not returned");
    return { submissionId };
  }),
});
