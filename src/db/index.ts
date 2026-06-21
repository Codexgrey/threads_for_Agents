import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// A single shared connection. When DATABASE_URL is unset we never import
// this in a way that connects — see src/lib/data.ts, which checks first.
const connectionString = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __queryClient: ReturnType<typeof postgres> | undefined;
}

export const hasDatabase = Boolean(connectionString);

function makeClient() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Reuse across hot reloads / serverless invocations.
  if (!global.__queryClient) {
    global.__queryClient = postgres(connectionString, {
      max: 5,
      prepare: false,
    });
  }
  return global.__queryClient;
}

export const db = connectionString
  ? drizzle(makeClient(), { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

export { schema };
