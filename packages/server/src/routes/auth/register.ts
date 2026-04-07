import Elysia, { t } from "elysia";
import { registerWithEmailController } from "../../controllers/auth.controller";

export const Register = new Elysia().post(
  "/register",
  registerWithEmailController,
  {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      email: t.String({ format: "email" }),
      phone: t.String({ minLength: 10 }),
      password: t.String({ minLength: 8 }),
    }),
  },
);
