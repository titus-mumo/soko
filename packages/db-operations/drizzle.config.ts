import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config();

// Define the shape of configs
interface DbCredentials {
  url: string;
}

interface DrizzleConfig {
  schema: string;
  out: string;
  dialect: "postgresql";
  dbCredentials: DbCredentials;
  verbose: boolean;
  strict: boolean;
}

// Safely handle environment variables
const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
};

// Define your config with type safety
export default defineConfig({
  schema: "./src/schema.ts",
  out: "supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnvVariable("DB_URL"),
  },
  verbose: true,
  strict: true,
} as DrizzleConfig);
