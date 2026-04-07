import Elysia, { t } from "elysia";
import {
  googleRedirectController,
  googleCallbackController,
} from "../../controllers/auth.controller";

export const GoogleRedirect = new Elysia().get(
  "/google",
  googleRedirectController,
);

export const GoogleCallback = new Elysia().get(
  "/google/callback",
  googleCallbackController,
  {
    query: t.Object({
      code: t.Optional(t.String()),
      error: t.Optional(t.String()),
    }),
  },
);
