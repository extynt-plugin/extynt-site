import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

function create() {
  return drizzle(neon(getEnv().databaseUrl), { schema });
}

export type Db = ReturnType<typeof create>;

let cached: Db | undefined;

export function getDb(): Db {
  cached ??= create();
  return cached;
}
