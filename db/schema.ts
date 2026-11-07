import {
  bigint,
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  sessionVersion: int("sessionVersion").default(0).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
}, (table) => ({
  legacyUnionIdIndex: index("users_unionId_unique").on(table.unionId),
  uniqueUnionId: unique("users_unionId_value_unique").on(table.unionId),
}));

export const studentStats = mysqlTable("student_stats", {
  userId: bigint("userId", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id),
  grade: int("grade").default(4).notNull(),
  solved: int("solved").default(0).notNull(),
  attempts: int("attempts").default(0).notNull(),
  firstTry: int("firstTry").default(0).notNull(),
  streak: int("streak").default(0).notNull(),
  bestStreak: int("bestStreak").default(0).notNull(),
  plusBalance: int("plusBalance").default(0).notNull(),
  sparkBalance: int("sparkBalance").default(0).notNull(),
  selectedTheme: varchar("selectedTheme", { length: 40 }).default("classic").notNull(),
  migratedAt: timestamp("migratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const topicProgress = mysqlTable(
  "topic_progress",
  {
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    topicId: varchar("topicId", { length: 80 }).notNull(),
    solved: int("solved").default(0).notNull(),
    attempts: int("attempts").default(0).notNull(),
    firstTry: int("firstTry").default(0).notNull(),
    masterySolved: int("masterySolved").default(0).notNull(),
    masteryAttempts: int("masteryAttempts").default(0).notNull(),
    masteryFirstTry: int("masteryFirstTry").default(0).notNull(),
    rewarded: boolean("rewarded").default(false).notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.topicId] }),
  }),
);

export const purchasedThemes = mysqlTable(
  "purchased_themes",
  {
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    themeId: varchar("themeId", { length: 40 }).notNull(),
    purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.themeId] }),
  }),
);

export const plusLedger = mysqlTable(
  "plus_ledger",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    kind: varchar("kind", { length: 24 }).notNull(),
    refId: varchar("refId", { length: 100 }).notNull(),
    amount: int("amount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    legacyEntryIndex: index("plus_ledger_unique_entry").on(table.userId, table.kind, table.refId),
    uniqueEntry: unique("plus_ledger_user_kind_ref_unique").on(table.userId, table.kind, table.refId),
  }),
);

export const processedAttempts = mysqlTable(
  "processed_attempts",
  {
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    attemptId: varchar("attemptId", { length: 36 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.attemptId] }),
  }),
);

export const competitionRooms = mysqlTable("competition_rooms", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  hostUserId: bigint("hostUserId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  grade: int("grade").notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  status: mysqlEnum("status", ["lobby", "active", "finished"]).default("lobby").notNull(),
  taskCount: int("taskCount").default(10).notNull(),
  durationSec: int("durationSec").default(90).notNull(),
  tasksJson: text("tasksJson"),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});

export const competitionPlayers = mysqlTable(
  "competition_players",
  {
    roomId: varchar("roomId", { length: 36 })
      .notNull()
      .references(() => competitionRooms.id),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    correct: int("correct").default(0).notNull(),
    answered: int("answered").default(0).notNull(),
    totalTimeMs: int("totalTimeMs").default(0).notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roomId, table.userId] }),
  }),
);

export const competitionAnswers = mysqlTable(
  "competition_answers",
  {
    roomId: varchar("roomId", { length: 36 })
      .notNull()
      .references(() => competitionRooms.id),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    taskIndex: int("taskIndex").notNull(),
    answer: varchar("answer", { length: 64 }).notNull(),
    correct: boolean("correct").notNull(),
    timeMs: int("timeMs").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roomId, table.userId, table.taskIndex] }),
  }),
);

export const sparkLedger = mysqlTable(
  "spark_ledger",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    kind: varchar("kind", { length: 32 }).notNull(),
    refId: varchar("refId", { length: 100 }).notNull(),
    amount: int("amount").notNull(),
    note: varchar("note", { length: 255 }),
    createdBy: bigint("createdBy", { mode: "number", unsigned: true })
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntry: unique("spark_ledger_unique_entry").on(table.userId, table.kind, table.refId),
  }),
);

export const trophies = mysqlTable(
  "trophies",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    roomId: varchar("roomId", { length: 36 })
      .notNull()
      .references(() => competitionRooms.id),
    place: int("place").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntry: unique("trophies_unique_entry").on(table.userId, table.roomId),
  }),
);

export const classes = mysqlTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 40 }).notNull(),
    grade: int("grade").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uniqueTeacherClass: unique("classes_teacher_name_unique").on(table.teacherId, table.name),
    teacherIdx: index("classes_teacher_idx").on(table.teacherId),
  }),
);

export const classMembers = mysqlTable(
  "class_members",
  {
    classId: bigint("classId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => classes.id),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.classId, table.studentId] }),
    studentIdx: index("class_members_student_idx").on(table.studentId),
  }),
);

export const homeworkAssignments = mysqlTable(
  "homework_assignments",
  {
    id: serial("id").primaryKey(),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    classId: bigint("classId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => classes.id),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    dueAt: timestamp("dueAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    classIdx: index("homework_assignments_class_idx").on(table.classId),
    teacherIdx: index("homework_assignments_teacher_idx").on(table.teacherId),
  }),
);

export const homeworkSubmissions = mysqlTable(
  "homework_submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: bigint("assignmentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => homeworkAssignments.id),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    textAnswer: text("textAnswer"),
    status: mysqlEnum("status", ["submitted", "reviewed", "needs_revision"]).default("submitted").notNull(),
    teacherComment: text("teacherComment"),
    aiStatus: mysqlEnum("aiStatus", ["idle", "processing", "completed", "failed"]).default("idle").notNull(),
    aiReport: text("aiReport"),
    aiConfidence: int("aiConfidence"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uniqueSubmission: unique("homework_submission_assignment_student_unique").on(table.assignmentId, table.studentId),
    studentIdx: index("homework_submissions_student_idx").on(table.studentId),
    assignmentIdx: index("homework_submissions_assignment_idx").on(table.assignmentId),
  }),
);

export const homeworkFiles = mysqlTable(
  "homework_files",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    submissionId: bigint("submissionId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => homeworkSubmissions.id),
    storageName: varchar("storageName", { length: 255 }).notNull().unique(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    contentType: varchar("contentType", { length: 40 }).notNull(),
    size: int("size").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    submissionIdx: index("homework_files_submission_idx").on(table.submissionId),
  }),
);

export const gradeEntries = mysqlTable(
  "grade_entries",
  {
    id: serial("id").primaryKey(),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    classId: bigint("classId", { mode: "number", unsigned: true })
      .references(() => classes.id),
    submissionId: bigint("submissionId", { mode: "number", unsigned: true })
      .references(() => homeworkSubmissions.id),
    grade: int("grade").notNull(),
    comment: varchar("comment", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubmissionGrade: unique("grade_entries_submission_unique").on(table.submissionId),
    studentIdx: index("grade_entries_student_idx").on(table.studentId),
    teacherIdx: index("grade_entries_teacher_idx").on(table.teacherId),
  }),
);

export const aiChecks = mysqlTable(
  "ai_checks",
  {
    id: serial("id").primaryKey(),
    submissionId: bigint("submissionId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => homeworkSubmissions.id),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["completed", "failed"]).notNull(),
    errorMessage: varchar("errorMessage", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    teacherCreatedIdx: index("ai_checks_teacher_created_idx").on(table.teacherId, table.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudentStats = typeof studentStats.$inferSelect;
export type TopicProgressRow = typeof topicProgress.$inferSelect;
