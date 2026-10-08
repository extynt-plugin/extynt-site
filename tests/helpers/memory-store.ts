import { randomUUID } from "node:crypto";
import type {
  ApplicationRow,
  DeviceCodeRow,
  DeviceRow,
  Store,
  TesterRow,
  UserRow,
} from "@/lib/store/types";

export interface MemoryState {
  applications: ApplicationRow[];
  testers: TesterRow[];
  devices: DeviceRow[];
  codes: DeviceCodeRow[];
  users: UserRow[];
  rate: Map<string, { start: Date; count: number }>;
}

function emptyState(): MemoryState {
  return {
    applications: [],
    testers: [],
    devices: [],
    codes: [],
    users: [],
    rate: new Map(),
  };
}

function applicationsOf(state: MemoryState): Store["applications"] {
  return {
    async insert(app) {
      const open = state.applications.some(
        (a) => a.email.toLowerCase() === app.email.toLowerCase() && a.status !== "rejected"
      );
      if (open) return "duplicate";
      state.applications.push({
        ...app,
        id: randomUUID(),
        status: "pending",
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      });
      return "created";
    },
    list: async () => [...state.applications],
    get: async (id) => state.applications.find((a) => a.id === id) ?? null,
    async setStatus(id, status, reviewer, now) {
      const a = state.applications.find((x) => x.id === id);
      if (a) Object.assign(a, { status, reviewedBy: reviewer, reviewedAt: now });
    },
  };
}

function testersOf(state: MemoryState): Store["testers"] {
  return {
    byEmail: async (email) => state.testers.find((t) => t.email === email.toLowerCase()) ?? null,
    async upsertActive(email, applicationId, accessUntil) {
      const existing = state.testers.find((t) => t.email === email.toLowerCase());
      if (existing) Object.assign(existing, { status: "active", applicationId, accessUntil });
      else {
        state.testers.push({
          id: randomUUID(),
          email: email.toLowerCase(),
          status: "active",
          accessUntil,
          applicationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    },
    async setStatus(email, status) {
      const t = state.testers.find((x) => x.email === email.toLowerCase());
      if (t) t.status = status;
      return !!t;
    },
    async setAccessUntil(email, accessUntil) {
      const t = state.testers.find((x) => x.email === email.toLowerCase());
      if (t) t.accessUntil = accessUntil;
      return !!t;
    },
    list: async () => [...state.testers],
  };
}

function devicesOf(state: MemoryState): Store["devices"] {
  return {
    get: async (id) => state.devices.find((d) => d.id === id) ?? null,
    listForUser: async (userId) => state.devices.filter((d) => d.userId === userId),
    listAll: async () => state.devices.map((d) => ({ ...d, email: null })),
    async touch(id, now) {
      const d = state.devices.find((x) => x.id === id);
      if (d) d.lastSeenAt = now;
    },
    async revoke(id, now) {
      const d = state.devices.find((x) => x.id === id && !x.revokedAt);
      if (d) d.revokedAt = now;
      return !!d;
    },
  };
}

function codesOf(state: MemoryState): Store["codes"] {
  return {
    async create(row) {
      state.codes.push({
        ...row,
        id: randomUUID(),
        lastPolledAt: null,
        approvedAt: null,
        approvedUserId: null,
        deniedAt: null,
        deviceId: null,
        consumedAt: null,
      });
    },
    byDeviceHash: async (h) => state.codes.find((c) => c.deviceCodeHash === h) ?? null,
    byUserHash: async (h) => state.codes.find((c) => c.userCodeHash === h) ?? null,
    async approve(id, userId, device, now) {
      const c = state.codes.find((x) => x.id === id);
      if (!c || c.approvedAt || c.deniedAt || c.expiresAt <= now) return null;
      const row: DeviceRow = {
        id: randomUUID(),
        userId,
        ...device,
        createdAt: now,
        lastSeenAt: null,
        revokedAt: null,
      };
      state.devices.push(row);
      Object.assign(c, { approvedAt: now, approvedUserId: userId, deviceId: row.id });
      return row;
    },
    async deny(id, now) {
      const c = state.codes.find((x) => x.id === id);
      if (!c || c.approvedAt || c.deniedAt) return false;
      c.deniedAt = now;
      return true;
    },
    async touchPoll(id, now, intervalSec) {
      const c = state.codes.find((x) => x.id === id);
      if (c) Object.assign(c, { lastPolledAt: now, intervalSec });
    },
    async consume(id, now) {
      const c = state.codes.find((x) => x.id === id);
      if (!c || c.consumedAt) return false;
      c.consumedAt = now;
      return true;
    },
  };
}

function restOf(state: MemoryState): Pick<Store, "users" | "rate"> {
  return {
    users: { byId: async (id) => state.users.find((u) => u.id === id) ?? null },
    rate: {
      async hit(key, windowSec, max, now) {
        const cur = state.rate.get(key);
        const fresh = !cur || now.getTime() - cur.start.getTime() >= windowSec * 1000;
        const next = fresh ? { start: now, count: 1 } : { start: cur.start, count: cur.count + 1 };
        state.rate.set(key, next);
        return next.count <= max;
      },
    },
  };
}

export function createMemoryStore(): { store: Store; state: MemoryState } {
  const state = emptyState();
  const store: Store = {
    applications: applicationsOf(state),
    testers: testersOf(state),
    devices: devicesOf(state),
    codes: codesOf(state),
    ...restOf(state),
  };
  return { store, state };
}
