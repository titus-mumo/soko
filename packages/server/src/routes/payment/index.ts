import Elysia from "elysia";
import { InitiatePayment } from "./initiatePayment";
import { GetPaymentByOrderId } from "./getPayment";
import { DarajaCallback } from "./darajaCallback";

export const paymentRoutes = new Elysia().group("/payments", (app) =>
  app
    .use(InitiatePayment)
    .use(GetPaymentByOrderId)
    .use(DarajaCallback)
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
