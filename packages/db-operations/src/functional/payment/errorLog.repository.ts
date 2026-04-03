import { db } from "src/db";
import { errorLogsTable } from "src/schema";
import { eq } from "drizzle-orm";

export type ErrorLog = typeof errorLogsTable.$inferSelect;
export type NewErrorLog = typeof errorLogsTable.$inferInsert;

export class ErrorLogRepository {
  async insertErrorLog(
    endpoint: string,
    errorMessage: string,
    errorDetails?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): Promise<ErrorLog | null> {
    const [res] = await db
      .insert(errorLogsTable)
      .values({ endpoint, errorMessage, errorDetails, context })
      .returning();

    return res ?? null;
  }

  // Returns all errors logged against a specific endpoint.
  // Use this for admin alerting dashboards and endpoint health monitoring.
  async findErrorsByEndpoint(endpoint: string): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogsTable)
      .where(eq(errorLogsTable.endpoint, endpoint));
  }
}
