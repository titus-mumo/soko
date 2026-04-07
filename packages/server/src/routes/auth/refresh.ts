import Elysia from "elysia";
import { refreshTokenController } from "../../controllers/auth.controller";

export const RefreshToken = new Elysia().post(
  "/refresh",
  refreshTokenController,
);
