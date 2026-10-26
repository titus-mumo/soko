import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";
import { config } from "dotenv";

config();

const client = postgres(Bun.env.DB_URL! as string, {
  ssl: Bun.env.NODE_ENV === "production" ? "require" : false,
});

export const db = drizzle(client, {
  schema,
  logger: Bun.env.NODE_ENV !== "test",
});
