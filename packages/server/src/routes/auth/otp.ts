import Elysia, { t } from "elysia";
import {
  requestOtpController,
  verifyOtpController,
} from "../../controllers/auth.controller";

export const RequestOtp = new Elysia().post(
  "/otp/request",
  requestOtpController,
  {
    body: t.Object({
      phone: t.String({ minLength: 10 }),
    }),
  },
);

export const VerifyOtp = new Elysia().post("/otp/verify", verifyOtpController, {
  body: t.Object({
    phone: t.String({ minLength: 10 }),
    code: t.String({ minLength: 6, maxLength: 6 }),
    name: t.Optional(t.String({ minLength: 2 })),
  }),
});
