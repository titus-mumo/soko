import { z } from "zod";

/**
 * Normalizes a Kenyan mobile number to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
 * Accepts 0712345678, 712345678, 254712345678 and +254 712 345 678.
 * Returns null if it isn't a valid Kenyan mobile number.
 *
 * Always send phones to the API in this form — the server matches users by
 * exact phone string, and Twilio needs E.164.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("254")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return /^[17]\d{8}$/.test(local) ? `+254${local}` : null;
}

const INVALID = "Enter a valid Kenyan number, e.g. 0712 345 678";

/** Form field: any accepted format. Normalize with normalizeKenyanPhone on submit. */
export const kenyanPhoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number")
  .refine((v) => normalizeKenyanPhone(v) !== null, INVALID);

/** Same, but empty is allowed. */
export const optionalKenyanPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || normalizeKenyanPhone(v) !== null, INVALID);
