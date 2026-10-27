// Business details used across the legal pages (terms, privacy, returns,
// cookies). Fill in every TODO before launch — these are shown to customers
// and regulators, and a placeholder on a live policy page is not compliant.
// Have the final wording reviewed by a Kenyan lawyer.

export const LEGAL = {
  /** Registered company name, as on the certificate of incorporation. */
  companyName: "[TODO: Registered company name] (trading as Soko)",
  /** Business registration number (BRS). */
  registrationNumber: "[TODO: Company registration number]",
  /** Physical / postal address for legal notices. */
  address: "[TODO: Physical address], Nairobi, Kenya",
  /** Where customers send questions, complaints and data requests. */
  supportEmail: "[TODO: support@your-domain]",
  privacyEmail: "[TODO: privacy@your-domain]",
  supportPhone: "[TODO: +254 7XX XXX XXX]",
  /** ODPC registration as a data controller (Data Protection Act, 2019). */
  odpcRegistration: "[TODO: ODPC data controller registration number]",
};

/** When the policies last changed. Update with every material change. */
export const POLICIES_UPDATED = "27 October 2026";

/** Days after delivery to report a problem with an order. */
export const RETURN_WINDOW_DAYS = 7;
/** Working days to send an approved refund to M-Pesa. */
export const REFUND_WORKING_DAYS = 7;
/** How long request records (the audit log) are kept, in days. */
export const REQUEST_LOG_RETENTION_DAYS = 90;

export const POLICY_LINKS = [
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/cookies", label: "Cookie policy" },
] as const;
