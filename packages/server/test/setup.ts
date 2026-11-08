// Preloaded before every test file (see bunfig.toml). Replaces the three
// external services so tests never send SMS, call Google or hit M-Pesa.
import { mock } from "bun:test";

// The suite creates and hard-deletes rows. Refuse to touch anything but a
// local database (set ALLOW_REMOTE_TEST_DB=1 to override deliberately).
{
  const host = new URL(Bun.env.DB_URL ?? "postgres://missing").hostname;
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!local && Bun.env.ALLOW_REMOTE_TEST_DB !== "1") {
    throw new Error(
      `Refusing to run tests against non-local database host "${host}". ` +
        "Point DB_URL at your local Supabase, or set ALLOW_REMOTE_TEST_DB=1.",
    );
  }
}

// One id per `bun test` run; every row the tests create is tagged with it.
process.env.TEST_RUN ??= Date.now().toString(36);

/** Phone numbers ending in this always fail to receive an OTP. */
export const UNREACHABLE_PHONE_SUFFIX = "0000000";
/** The only OTP code the mock accepts. */
export const VALID_OTP = "123456";
/** Google auth codes the mock accepts; anything else fails. */
export const GOOGLE_GOOD_CODE = "good-google-code";
/** The secret Safaricom's callbacks carry (in the URL we give them). */
process.env.DARAJA_CALLBACK_SECRET ??= "test-callback-secret";
export const CALLBACK_PATH = `/payments/callback?key=${process.env.DARAJA_CALLBACK_SECRET}`;
/** The CallBackURL of the most recent STK push, for checking it. */
export const lastStk: { callbackUrl?: string } = {};
/** An M-Pesa number Daraja (mock) rejects. */
export const DARAJA_REJECTED_PHONE = "254711111111";

// ─── Twilio Verify ───────────────────────────────────────────────────────────
mock.module("../src/lib/twilio", () => ({
  sendOtp: async (phone: string) => !phone.endsWith(UNREACHABLE_PHONE_SUFFIX),
  verifyOtpWithTwilio: async (_phone: string, code: string) =>
    code === VALID_OTP,
}));

// ─── Google OAuth ────────────────────────────────────────────────────────────
mock.module("../src/lib/google", () => ({
  getGoogleAuthUrl: () =>
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
  getGoogleUser: async (code: string) =>
    code === GOOGLE_GOOD_CODE
      ? {
          googleId: `g-${process.env.TEST_RUN}`,
          email: `google.${process.env.TEST_RUN}@test.soko.local`,
          name: "Google Tester",
          picture: "https://picsum.photos/seed/google/100",
        }
      : null,
}));

// ─── Safaricom Daraja (fetch) ────────────────────────────────────────────────
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (url.includes("safaricom.co.ke")) {
    if (url.includes("/oauth/v1/generate")) {
      return Response.json({
        access_token: "mock-daraja-token",
        expires_in: "3599",
      });
    }
    if (url.includes("/mpesa/stkpush/")) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.PhoneNumber === DARAJA_REJECTED_PHONE) {
        return Response.json({
          ResponseCode: "1",
          errorMessage: "Invalid PhoneNumber",
        });
      }
      lastStk.callbackUrl = body.CallBackURL;
      const id = crypto.randomUUID();
      return Response.json({
        MerchantRequestID: `mock-merchant-${id}`,
        CheckoutRequestID: `ws_CO_mock_${id}`,
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
        CustomerMessage: "Success. Request accepted for processing",
      });
    }
  }
  return realFetch(input, init);
}) as typeof fetch;
