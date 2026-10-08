// Every database access in the app goes through these interfaces. Authorization is checked in
// the services before any call; the store itself performs no authorization.

export type ApplicationStatus = "pending" | "approved" | "rejected";
export type TesterStatus = "active" | "revoked";

export interface ApplicationRow {
  id: string;
  name: string;
  email: string;
  aeVersions: string[];
  os: string;
  work: string;
  portfolioUrl: string | null;
  consentAt: Date;
  status: ApplicationStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}

type NewApplication = Pick<
  ApplicationRow,
  "name" | "email" | "aeVersions" | "os" | "work" | "portfolioUrl" | "consentAt"
>;

export interface TesterRow {
  id: string;
  email: string;
  status: TesterStatus;
  accessUntil: Date | null;
  applicationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceRow {
  id: string;
  userId: string;
  name: string;
  platform: string | null;
  appVersion: string | null;
  machineIdHash: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
}

export interface DeviceCodeRow {
  id: string;
  deviceCodeHash: string;
  userCodeHash: string;
  expiresAt: Date;
  intervalSec: number;
  lastPolledAt: Date | null;
  approvedAt: Date | null;
  approvedUserId: string | null;
  deniedAt: Date | null;
  deviceId: string | null;
  consumedAt: Date | null;
  deviceName: string | null;
  platform: string | null;
  appVersion: string | null;
  machineIdHash: string;
}

type NewDeviceCode = Pick<
  DeviceCodeRow,
  | "deviceCodeHash"
  | "userCodeHash"
  | "expiresAt"
  | "intervalSec"
  | "deviceName"
  | "platform"
  | "appVersion"
  | "machineIdHash"
>;

export interface UserRow {
  id: string;
  email: string;
}

interface DeviceInfo {
  name: string;
  platform: string | null;
  appVersion: string | null;
  machineIdHash: string;
}

export interface ApplicationStore {
  insert(app: NewApplication): Promise<"created" | "duplicate">;
  list(): Promise<ApplicationRow[]>;
  get(id: string): Promise<ApplicationRow | null>;
  setStatus(id: string, status: ApplicationStatus, reviewer: string, now: Date): Promise<void>;
}

export interface TesterStore {
  byEmail(email: string): Promise<TesterRow | null>;
  upsertActive(
    email: string,
    applicationId: string | null,
    accessUntil: Date | null
  ): Promise<void>;
  setStatus(email: string, status: TesterStatus): Promise<boolean>;
  setAccessUntil(email: string, accessUntil: Date | null): Promise<boolean>;
  list(): Promise<TesterRow[]>;
}

export interface DeviceStore {
  get(id: string): Promise<DeviceRow | null>;
  listForUser(userId: string): Promise<DeviceRow[]>;
  listAll(): Promise<Array<DeviceRow & { email: string | null }>>;
  touch(id: string, now: Date): Promise<void>;
  revoke(id: string, now: Date): Promise<boolean>;
}

export interface CodeStore {
  create(row: NewDeviceCode): Promise<void>;
  byDeviceHash(hash: string): Promise<DeviceCodeRow | null>;
  byUserHash(hash: string): Promise<DeviceCodeRow | null>;
  /** Atomically approves a still-open code and creates its device. Null when no longer open. */
  approve(id: string, userId: string, device: DeviceInfo, now: Date): Promise<DeviceRow | null>;
  deny(id: string, now: Date): Promise<boolean>;
  touchPoll(id: string, now: Date, intervalSec: number): Promise<void>;
  /** One-time: true only for the first caller. */
  consume(id: string, now: Date): Promise<boolean>;
}

export interface UserStore {
  byId(id: string): Promise<UserRow | null>;
}

export interface RateStore {
  /** Counts a hit in a fixed window; false when the limit is exceeded. */
  hit(key: string, windowSec: number, max: number, now: Date): Promise<boolean>;
}

export interface Store {
  applications: ApplicationStore;
  testers: TesterStore;
  devices: DeviceStore;
  codes: CodeStore;
  users: UserStore;
  rate: RateStore;
}
