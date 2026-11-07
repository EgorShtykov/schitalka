import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { homeworkAssignments, homeworkFiles, homeworkSubmissions } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { getDb } from "./queries/connection";
import {
  HOMEWORK_FILE_LIMIT,
  HOMEWORK_FILE_SIZE,
  HOMEWORK_FILE_TYPES,
  hasValidFileSignature,
  readHomeworkFile,
  removeHomeworkFile,
  saveHomeworkFile,
} from "./homework-storage";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

async function fileAccess(fileId: string, userId: number) {
  const rows = await getDb().select({ file: homeworkFiles, submission: homeworkSubmissions, assignment: homeworkAssignments })
    .from(homeworkFiles)
    .innerJoin(homeworkSubmissions, eq(homeworkSubmissions.id, homeworkFiles.submissionId))
    .innerJoin(homeworkAssignments, eq(homeworkAssignments.id, homeworkSubmissions.assignmentId))
    .where(eq(homeworkFiles.id, fileId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.submission.studentId !== userId && row.assignment.teacherId !== userId) return null;
  return row;
}

export function registerHomeworkFileRoutes(app: Hono<{ Bindings: HttpBindings }>) {
  app.post(
    "/api/homework/submissions/:id/files",
    bodyLimit({ maxSize: HOMEWORK_FILE_SIZE + 1024 * 1024, onError: (c) => c.json({ error: "Файл больше 10 МБ" }, 413) }),
    async (c) => {
      let user;
      try {
        user = await authenticateRequest(c.req.raw.headers);
      } catch {
        return c.json({ error: "Нужно войти в аккаунт" }, 401);
      }
      const submissionId = Number(c.req.param("id"));
      if (!Number.isInteger(submissionId)) return c.json({ error: "Некорректная работа" }, 400);
      const rows = await getDb().select({ submission: homeworkSubmissions, assignment: homeworkAssignments })
        .from(homeworkSubmissions)
        .innerJoin(homeworkAssignments, eq(homeworkAssignments.id, homeworkSubmissions.assignmentId))
        .where(eq(homeworkSubmissions.id, submissionId)).limit(1);
      const row = rows[0];
      if (!row || row.submission.studentId !== user.id) return c.json({ error: "Работа не найдена" }, 404);
      if (row.submission.status === "reviewed") return c.json({ error: "Проверенную работу изменить нельзя" }, 409);
      const existing = await getDb().select({ id: homeworkFiles.id }).from(homeworkFiles).where(eq(homeworkFiles.submissionId, submissionId));
      if (existing.length >= HOMEWORK_FILE_LIMIT) return c.json({ error: "Можно прикрепить не больше 5 файлов" }, 409);
      const body = await c.req.parseBody();
      const uploaded = body.file;
      if (!(uploaded instanceof File)) return c.json({ error: "Выберите файл" }, 400);
      if (!HOMEWORK_FILE_TYPES.includes(uploaded.type as (typeof HOMEWORK_FILE_TYPES)[number])) {
        return c.json({ error: "Разрешены JPEG, PNG, WebP и PDF" }, 415);
      }
      if (uploaded.size <= 0 || uploaded.size > HOMEWORK_FILE_SIZE) return c.json({ error: "Размер файла должен быть от 1 байта до 10 МБ" }, 413);
      const bytes = new Uint8Array(await uploaded.arrayBuffer());
      if (!hasValidFileSignature(uploaded.type, bytes)) return c.json({ error: "Содержимое файла не соответствует формату" }, 415);
      const storageName = `${randomUUID()}.${extensions[uploaded.type]}`;
      const originalName = uploaded.name.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "homework";
      try {
        await saveHomeworkFile(storageName, bytes);
        await getDb().insert(homeworkFiles).values({
          id: randomUUID(), submissionId, storageName, originalName, contentType: uploaded.type, size: uploaded.size,
        });
        await getDb().update(homeworkSubmissions).set({ updatedAt: new Date() }).where(eq(homeworkSubmissions.id, submissionId));
      } catch (error) {
        await removeHomeworkFile(storageName);
        throw error;
      }
      return c.json({ ok: true }, 201);
    },
  );

  app.get("/api/homework/files/:id", async (c) => {
    let user;
    try {
      user = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.json({ error: "Нужно войти в аккаунт" }, 401);
    }
    const row = await fileAccess(c.req.param("id"), user.id);
    if (!row) return c.json({ error: "Файл не найден" }, 404);
    const bytes = await readHomeworkFile(row.file.storageName);
    c.header("Content-Type", row.file.contentType);
    c.header("Content-Length", String(bytes.byteLength));
    c.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.file.originalName)}`);
    c.header("Cache-Control", "private, no-store");
    c.header("X-Content-Type-Options", "nosniff");
    return c.body(new Uint8Array(bytes));
  });

  app.delete("/api/homework/files/:id", async (c) => {
    let user;
    try {
      user = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.json({ error: "Нужно войти в аккаунт" }, 401);
    }
    const row = await fileAccess(c.req.param("id"), user.id);
    if (!row) return c.json({ error: "Файл не найден" }, 404);
    const isStudent = row.submission.studentId === user.id;
    if (isStudent && row.submission.status === "reviewed") return c.json({ error: "Файл проверенной работы удалить нельзя" }, 409);
    await removeHomeworkFile(row.file.storageName);
    await getDb().delete(homeworkFiles).where(and(eq(homeworkFiles.id, row.file.id), eq(homeworkFiles.submissionId, row.submission.id)));
    return c.json({ ok: true });
  });
}
