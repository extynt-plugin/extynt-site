import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Auth.js adapter tables (shape required by @auth/drizzle-adapter).
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    aeVersions: text("ae_versions").array().notNull(),
    os: text("os").notNull(),
    work: text("work").notNull(),
    portfolioUrl: text("portfolio_url"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [
    uniqueIndex("applications_open_email_idx")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.status} in ('pending', 'approved')`),
    index("applications_status_idx").on(t.status, t.createdAt),
  ]
);

export const testers = pgTable("testers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"),
  accessUntil: timestamp("access_until", { withTimezone: true }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    platform: text("platform"),
    appVersion: text("app_version"),
    machineIdHash: text("machine_id_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("devices_user_idx").on(t.userId), index("devices_machine_idx").on(t.machineIdHash)]
);

export const deviceCodes = pgTable("device_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceCodeHash: text("device_code_hash").notNull().unique(),
  userCodeHash: text("user_code_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  intervalSec: integer("interval_sec").notNull(),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedUserId: text("approved_user_id").references(() => users.id, { onDelete: "cascade" }),
  deniedAt: timestamp("denied_at", { withTimezone: true }),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  deviceName: text("device_name"),
  platform: text("platform"),
  appVersion: text("app_version"),
  machineIdHash: text("machine_id_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
