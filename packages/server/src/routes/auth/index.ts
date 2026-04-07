import Elysia from "elysia";
import { Register } from "./register";
import { Login } from "./login";
import { RequestOtp, VerifyOtp } from "./otp";
import { GoogleRedirect, GoogleCallback } from "./google";
import { RefreshToken } from "./refresh";
import { Logout, LogoutAll } from "./logout";

export const authRoutes = new Elysia().group("/auth", (app) =>
  app
    .use(Register)
    .use(Login)
    .use(RequestOtp)
    .use(VerifyOtp)
    .use(GoogleRedirect)
    .use(GoogleCallback)
    .use(RefreshToken)
    .use(Logout)
    .use(LogoutAll)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
