// Buyers and sellers deal through Soko, so text either side writes for the
// other — listings, reviews — can't carry ways to reach someone directly.
// Deliberately broad: a false positive costs a rewording; a miss costs a
// sale leaving the platform.

const PATTERNS: RegExp[] = [
  // Kenyan phone numbers, however they're spaced: 07…, 01…, 254…, +254…
  /(?:\+?254|\b0)[\s.\-()]*[17](?:[\s.\-()]*\d){8}\b/,
  // Any other run of 9+ digits, allowing separators (spelled-out numbers)
  /\d(?:[\s.\-()]*\d){8,}/,
  // Email addresses
  /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}/i,
  // Links and handles to take the conversation elsewhere
  /\bhttps?:\/\/|\bwww\.|\b[\w-]+\.(?:com|co\.ke|ke|net|org|shop|store|biz|info|me|io|app)\b/i,
  /\b(?:whats\s*app|wa\.me|telegram|t\.me|instagram|insta|facebook|fb\.com|tiktok|snapchat|call\s+me|text\s+me|dm\s+me|inbox\s+me)\b/i,
];

/** True if `text` looks like it contains a phone number, email or link. */
export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false;
  return PATTERNS.some((re) => re.test(text));
}

/** True if any of the given texts does. */
export function anyContactInfo(
  ...texts: (string | null | undefined)[]
): boolean {
  return texts.some(containsContactInfo);
}

export const CONTACT_INFO_MESSAGE =
  "Please remove phone numbers, emails, links and social handles. Buyers and sellers talk through Soko.";
