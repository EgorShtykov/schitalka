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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudentStats = typeof studentStats.$inferSelect;
export type TopicProgressRow = typeof topicProgress.$inferSelect;
