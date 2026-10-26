// Kenyan mobile numbers arrive as 0712345678, 712345678, 254712345678 or
// +254 712 345 678. Users are stored and matched in E.164 (+254712345678),
// the form Twilio needs; Daraja's 2547… is derived from it.

/** The local 9-digit part (7XXXXXXXX / 1XXXXXXXX), or null if not Kenyan mobile. */
function kenyanLocalPart(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("254")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return /^[17]\d{8}$/.test(local) ? local : null;
}

/**
 * E.164 form of a Kenyan mobile number. Anything else (e.g. the
 * `google_…` placeholder) is returned unchanged.
 */
export function normalizePhone(input: string): string {
  const local = kenyanLocalPart(input);
  return local ? `+254${local}` : input;
}

/**
 * Every stored form a number might have, for lookups. Rows saved before
 * numbers were normalized can hold any of them.
 */
export function phoneVariants(input: string): string[] {
  const local = kenyanLocalPart(input);
  if (!local) return [input];
  return [`+254${local}`, `254${local}`, `0${local}`, local];
}
