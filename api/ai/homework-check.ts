import { and, eq, gte, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { aiChecks, homeworkAssignments, homeworkFiles, homeworkSubmissions } from "@db/schema";
import { getDb } from "../queries/connection";
import { readHomeworkFile } from "../homework-storage";

const API_URL = "https://api.moonshot.ai/v1";

function monthlyLimit() {
  const value = Number(process.env.AI_MONTHLY_LIMIT ?? "0");
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 10000) : 0;
}

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function usedThisMonth(teacherId: number) {
  const rows = await getDb().select({ id: aiChecks.id }).from(aiChecks)
    .where(and(eq(aiChecks.teacherId, teacherId), gte(aiChecks.createdAt, monthStart())));
  return rows.length;
}

export async function getAiAvailability(teacherId: number) {
  const limit = monthlyLimit();
  const used = await usedThisMonth(teacherId);
  return {
    configured: Boolean(process.env.MOONSHOT_API_KEY && process.env.MOONSHOT_MODEL),
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

type AiReport = {
  summary: string;
  strengths: string[];
  issues: string[];
  suggestedGrade: number | null;
  confidence: number;
};

function normalizeReport(value: unknown): AiReport {
  const report = (value ?? {}) as Record<string, unknown>;
  const strings = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  const grade = typeof report.suggestedGrade === "number" && Number.isInteger(report.suggestedGrade) && report.suggestedGrade >= 1 && report.suggestedGrade <= 5 ? report.suggestedGrade : null;
  const confidence = typeof report.confidence === "number" ? Math.max(0, Math.min(1, report.confidence)) : 0;
  return {
    summary: typeof report.summary === "string" ? report.summary.slice(0, 3000) : "ИИ вернул ответ без краткого заключения.",
    strengths: strings(report.strengths),
    issues: strings(report.issues),
    suggestedGrade: grade,
    confidence,
  };
}

async function moonshotResponse(path: string, init: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`, ...init.headers },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    throw new Error(`Moonshot API ${response.status}: ${text}`);
  }
  return response;
}

async function extractPdf(bytes: Buffer, name: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name);
  form.append("purpose", "file-extract");
  const uploaded = await moonshotResponse("/files", { method: "POST", body: form });
  const payload = await uploaded.json() as { id?: string };
  if (!payload.id) throw new Error("Moonshot Files API did not return a file id");
  try {
    const contentResponse = await moonshotResponse(`/files/${payload.id}/content`, { method: "GET" });
    const raw = await contentResponse.text();
    try {
      const parsed = JSON.parse(raw) as { content?: string };
      return (parsed.content ?? raw).slice(0, 35_000);
    } catch {
      return raw.slice(0, 35_000);
    }
  } finally {
    await moonshotResponse(`/files/${payload.id}`, { method: "DELETE" }).catch(() => undefined);
  }
}

export async function runHomeworkAiCheck(teacherId: number, submissionId: number) {
  const availability = await getAiAvailability(teacherId);
  if (!availability.configured) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ИИ-проверка не настроена. Укажите серверные MOONSHOT_API_KEY и MOONSHOT_MODEL." });
  }
  if (availability.remaining <= 0) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Месячный лимит ИИ-проверок исчерпан или равен нулю. Новый платный запрос не запущен." });
  }
  const db = getDb();
  const rows = await db.select({ submission: homeworkSubmissions, assignment: homeworkAssignments })
    .from(homeworkSubmissions)
    .innerJoin(homeworkAssignments, eq(homeworkAssignments.id, homeworkSubmissions.assignmentId))
    .where(and(eq(homeworkSubmissions.id, submissionId), eq(homeworkAssignments.teacherId, teacherId))).limit(1);
  const row = rows[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Работа не найдена" });
  if (row.submission.aiStatus === "processing") throw new TRPCError({ code: "CONFLICT", message: "Проверка уже выполняется" });
  const files = await db.select().from(homeworkFiles).where(eq(homeworkFiles.submissionId, submissionId));
  if (!row.submission.textAnswer && files.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "В работе нет текста или файлов для проверки" });
  }
  const claimed = await db.update(homeworkSubmissions).set({ aiStatus: "processing", aiReport: null, aiConfidence: null })
    .where(and(eq(homeworkSubmissions.id, submissionId), ne(homeworkSubmissions.aiStatus, "processing")));
  if (claimed[0].affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "Проверка уже выполняется" });
  try {
    const pdfTexts: string[] = [];
    const imageContent: { type: "image_url"; image_url: { url: string } }[] = [];
    for (const file of files) {
      const bytes = await readHomeworkFile(file.storageName);
      if (file.contentType === "application/pdf") {
        pdfTexts.push(`Файл ${file.originalName}:\n${await extractPdf(bytes, file.originalName)}`);
      } else if (imageContent.length < 3) {
        imageContent.push({ type: "image_url", image_url: { url: `data:${file.contentType};base64,${bytes.toString("base64")}` } });
      }
    }
    const prompt = [
      `Задание учителя: ${row.assignment.title}\n${row.assignment.description}`,
      `Текстовый ответ ученика:\n${row.submission.textAnswer || "(нет)"}`,
      ...pdfTexts,
      "Проверь работу предварительно. Верни ТОЛЬКО JSON на русском языке со свойствами: summary (строка), strengths (массив строк), issues (массив строк с конкретными ошибками и рекомендациями), suggestedGrade (целое 1–5 или null, если уверенности недостаточно), confidence (число 0–1). Не выдумывай содержимое неразборчивых мест. Это совет учителю, а не окончательная оценка.",
    ].join("\n\n").slice(0, 80_000);
    const response = await moonshotResponse("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.MOONSHOT_MODEL,
        messages: [
          { role: "system", content: "Ты помощник учителя математики. Анализируй решение точно, доброжелательно и без автоматического выставления оценки." },
          { role: "user", content: [{ type: "text", text: prompt }, ...imageContent] },
        ],
        max_tokens: 3000,
      }),
    });
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Moonshot returned an empty report");
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const report = normalizeReport(JSON.parse(cleaned));
    await db.transaction(async (tx) => {
      await tx.update(homeworkSubmissions).set({
        aiStatus: "completed",
        aiReport: JSON.stringify(report),
        aiConfidence: Math.round(report.confidence * 100),
      }).where(eq(homeworkSubmissions.id, submissionId));
      await tx.insert(aiChecks).values({ submissionId, teacherId, status: "completed" });
    });
    return { ok: true as const, report };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Unknown AI error";
    await db.transaction(async (tx) => {
      await tx.update(homeworkSubmissions).set({ aiStatus: "failed" }).where(eq(homeworkSubmissions.id, submissionId));
      await tx.insert(aiChecks).values({ submissionId, teacherId, status: "failed", errorMessage: message });
    });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ИИ-проверка не завершилась. Оценка и награды не изменены. Повторный платный запрос запускайте только вручную." });
  }
}
