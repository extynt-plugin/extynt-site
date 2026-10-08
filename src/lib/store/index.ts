import { getDb } from "@/lib/db/client";
import { codeStore, rateStore } from "./drizzle-codes";
import { applicationStore, deviceStore, testerStore, userStore } from "./drizzle-people";
import type { Store } from "./types";

let cached: Store | undefined;

export function getStore(): Store {
  if (!cached) {
    const db = getDb();
    cached = {
      applications: applicationStore(db),
      testers: testerStore(db),
      devices: deviceStore(db),
      codes: codeStore(db),
      users: userStore(db),
      rate: rateStore(db),
    };
  }
  return cached;
}
