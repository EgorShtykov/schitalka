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

export const stipendPrograms = mysqlTable(
  "stipend_programs",
  {
    id: serial("id").primaryKey(),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    amountPerHomework: int("amountPerHomework").default(250).notNull(),
    cycleBonus: int("cycleBonus").default(1000).notNull(),
    cycleWeeks: int("cycleWeeks").default(4).notNull(),
    homeworkPerWeek: int("homeworkPerWeek").default(2).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uniqueTeacher: unique("stipend_programs_teacher_unique").on(table.teacherId),
  }),
);

export const stipendCycles = mysqlTable(
  "stipend_cycles",
  {
    id: serial("id").primaryKey(),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    balance: int("balance").default(0).notNull(),
    homeworkCount: int("homeworkCount").default(0).notNull(),
    bonusGranted: boolean("bonusGranted").default(false).notNull(),
    status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    studentStatusIdx: index("stipend_cycles_student_status_idx").on(table.studentId, table.status),
  }),
);

export const stipendEvents = mysqlTable(
  "stipend_events",
  {
    id: serial("id").primaryKey(),
    cycleId: bigint("cycleId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => stipendCycles.id),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    kind: mysqlEnum("kind", ["homework_credit", "cycle_bonus", "prize_debit", "refund"]).notNull(),
    refId: varchar("refId", { length: 100 }).notNull(),
    amount: int("amount").notNull(),
    note: varchar("note", { length: 255 }),
    createdBy: bigint("createdBy", { mode: "number", unsigned: true })
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEntry: unique("stipend_events_unique_entry").on(table.studentId, table.kind, table.refId),
    cycleIdx: index("stipend_events_cycle_idx").on(table.cycleId),
  }),
);

export const prizes = mysqlTable(
  "prizes",
  {
    id: serial("id").primaryKey(),
    teacherId: bigint("teacherId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 120 }).notNull(),
    category: varchar("category", { length: 40 }).default("Разное").notNull(),
    emoji: varchar("emoji", { length: 8 }).default("🎁").notNull(),
    price: int("price").notNull(),
    active: boolean("active").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    teacherIdx: index("prizes_teacher_idx").on(table.teacherId),
  }),
);

export const prizeGoals = mysqlTable("prize_goals", {
  studentId: bigint("studentId", { mode: "number", unsigned: true })
    .primaryKey()
    .references(() => users.id),
  prizeId: bigint("prizeId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => prizes.id),
  chosenAt: timestamp("chosenAt").defaultNow().notNull(),
});

export const prizeClaims = mysqlTable(
  "prize_claims",
  {
    id: serial("id").primaryKey(),
    studentId: bigint("studentId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    prizeId: bigint("prizeId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => prizes.id),
    cycleId: bigint("cycleId", { mode: "number", unsigned: true })
      .notNull()
      .references(() => stipendCycles.id),
    title: varchar("title", { length: 120 }).notNull(),
    priceSnapshot: int("priceSnapshot").notNull(),
    actualPrice: int("actualPrice"),
    status: mysqlEnum("status", ["requested", "approved", "ordered", "delivered", "cancelled"])
      .default("requested")
      .notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    studentIdx: index("prize_claims_student_idx").on(table.studentId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudentStats = typeof studentStats.$inferSelect;
export type TopicProgressRow = typeof topicProgress.$inferSelect;
