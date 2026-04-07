import Elysia, { t } from "elysia";
import { loginWithEmailController } from "../../controllers/auth.controller";

export const Login = new Elysia().post("/login", loginWithEmailController, {
  body: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 1 }),
  }),
});
