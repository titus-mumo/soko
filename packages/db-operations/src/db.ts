import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";
require("dotenv").config();

// TODO: Find why .env injection into DB_URL only accepts .env file from the server package

// const DB_URL: string =
//   "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
// const client = postgres(Bun.env.DB_URL! as string);
const client = postgres(Bun.env.DB_URL! as string);

export const db = drizzle(client, { schema, logger: true });
