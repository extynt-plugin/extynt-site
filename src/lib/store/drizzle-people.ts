import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { applications, devices, testers, users } from "@/lib/db/schema";
import type {
  ApplicationRow,
  ApplicationStatus,
  ApplicationStore,
  DeviceStore,
  TesterRow,
  TesterStatus,
  TesterStore,
  UserStore,
} from "./types";

export function applicationStore(db: Db): ApplicationStore {
  return {
    async insert(app) {
      const rows = await db
        .insert(applications)
        .values(app)
        .onConflictDoNothing()
        .returning({ id: applications.id });
      return rows.length > 0 ? "created" : "duplicate";
    },
    async list() {
      const rows = await db
        .select()
        .from(applications)
        .orderBy(sql`${applications.createdAt} desc`);
      return rows.map((r) => ({ ...r, status: r.status as ApplicationStatus }));
    },
    async get(id) {
      const [row] = await db.select().from(applications).where(eq(applications.id, id));
      return row
        ? ({ ...row, status: row.status as ApplicationStatus } satisfies ApplicationRow)
        : null;
    },
    async setStatus(id, status, reviewer, now) {
      await db
        .update(applications)
        .set({ status, reviewedBy: reviewer, reviewedAt: now })
        .where(eq(applications.id, id));
    },
  };
}

function testerRow(r: typeof testers.$inferSelect): TesterRow {
  return { ...r, status: r.status as TesterStatus };
}

export function testerStore(db: Db): TesterStore {
  return {
    async byEmail(email) {
      const [row] = await db.select().from(testers).where(eq(testers.email, email.toLowerCase()));
      return row ? testerRow(row) : null;
    },
    async upsertActive(email, applicationId, accessUntil) {
      const values = { email: email.toLowerCase(), status: "active", applicationId, accessUntil };
      await db
        .insert(testers)
        .values(values)
        .onConflictDoUpdate({
          target: testers.email,
          set: { status: "active", accessUntil, applicationId, updatedAt: new Date() },
        });
    },
    async setStatus(email, status) {
      const rows = await db
        .update(testers)
        .set({ status, updatedAt: new Date() })
        .where(eq(testers.email, email.toLowerCase()))
        .returning({ id: testers.id });
      return rows.length > 0;
    },
    async setAccessUntil(email, accessUntil) {
      const rows = await db
        .update(testers)
        .set({ accessUntil, updatedAt: new Date() })
        .where(eq(testers.email, email.toLowerCase()))
        .returning({ id: testers.id });
      return rows.length > 0;
    },
    async list() {
      const rows = await db
        .select()
        .from(testers)
        .orderBy(sql`${testers.createdAt} desc`);
      return rows.map(testerRow);
    },
  };
}

export function deviceStore(db: Db): DeviceStore {
  return {
    async get(id) {
      const [row] = await db.select().from(devices).where(eq(devices.id, id));
      return row ?? null;
    },
    listForUser: (userId) =>
      db
        .select()
        .from(devices)
        .where(eq(devices.userId, userId))
        .orderBy(sql`${devices.createdAt} desc`),
    async listAll() {
      const rows = await db
        .select({ device: devices, email: users.email })
        .from(devices)
        .leftJoin(users, eq(users.id, devices.userId))
        .orderBy(sql`${devices.createdAt} desc`);
      return rows.map((r) => ({ ...r.device, email: r.email }));
    },
    async touch(id, now) {
      await db.update(devices).set({ lastSeenAt: now }).where(eq(devices.id, id));
    },
    async revoke(id, now) {
      const rows = await db
        .update(devices)
        .set({ revokedAt: now })
        .where(and(eq(devices.id, id), isNull(devices.revokedAt)))
        .returning({ id: devices.id });
      return rows.length > 0;
    },
  };
}

export function userStore(db: Db): UserStore {
  return {
    async byId(id) {
      const [row] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, id));
      return row?.email ? { id: row.id, email: row.email } : null;
    },
  };
}
