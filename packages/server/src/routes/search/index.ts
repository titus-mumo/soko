import Elysia, { t } from "elysia";
import { getSuggestions } from "../../services/search.service";

export const searchRoutes = new Elysia().group("/search", (app) =>
  // Public — powers the search box's suggestions.
  app.get(
    "/suggest",
    async ({ query }) => ({
      success: true,
      data: await getSuggestions(query.q ?? ""),
    }),
    { query: t.Object({ q: t.Optional(t.String()) }) },
  ),
);
