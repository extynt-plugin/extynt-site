import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { deviceCodes, devices, rateLimits } from "@/lib/db/schema";
import type { CodeStore, RateStore } from "./types";

export function codeStore(db: Db): CodeStore {
  return {
    async create(row) {
      await db.insert(deviceCodes).values(row);
    },
    async byDeviceHash(hash) {
      const [row] = await db.select().from(deviceCodes).where(eq(deviceCodes.deviceCodeHash, hash));
      return row ?? null;
    },
    async byUserHash(hash) {
      const [row] = await db.select().from(deviceCodes).where(eq(deviceCodes.userCodeHash, hash));
      return row ?? null;
    },
    async approve(id, userId, device, now) {
      const [claimed] = await db
        .update(deviceCodes)
        .set({ approvedAt: now, approvedUserId: userId })
        .where(
          and(
            eq(deviceCodes.id, id),
            isNull(deviceCodes.approvedAt),
            isNull(deviceCodes.deniedAt),
            gt(deviceCodes.expiresAt, now)
          )
        )
        .returning({ id: deviceCodes.id });
      if (!claimed) return null;
      const [created] = await db
        .insert(devices)
        .values({
          userId,
          name: device.name,
          platform: device.platform,
          appVersion: device.appVersion,
          machineIdHash: device.machineIdHash,
        })
        .returning();
      if (!created) return null;
      await db.update(deviceCodes).set({ deviceId: created.id }).where(eq(deviceCodes.id, id));
      return created;
    },
    async deny(id, now) {
      const rows = await db
        .update(deviceCodes)
        .set({ deniedAt: now })
        .where(
          and(eq(deviceCodes.id, id), isNull(deviceCodes.approvedAt), isNull(deviceCodes.deniedAt))
        )
        .returning({ id: deviceCodes.id });
      return rows.length > 0;
    },
    async touchPoll(id, now, intervalSec) {
      await db
        .update(deviceCodes)
        .set({ lastPolledAt: now, intervalSec })
        .where(eq(deviceCodes.id, id));
    },
    async consume(id, now) {
      const rows = await db
        .update(deviceCodes)
        .set({ consumedAt: now })
        .where(and(eq(deviceCodes.id, id), isNull(deviceCodes.consumedAt)))
        .returning({ id: deviceCodes.id });
      return rows.length > 0;
    },
  };
}

export function rateStore(db: Db): RateStore {
  return {
    async hit(key, windowSec, max, now) {
      const cutoff = new Date(now.getTime() - windowSec * 1000);
      const [row] = await db
        .insert(rateLimits)
        .values({ key, windowStart: now, count: 1 })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then 1 else ${rateLimits.count} + 1 end`,
            windowStart: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
          },
        })
        .returning({ count: rateLimits.count });
      return (row?.count ?? 1) <= max;
    },
  };
}
