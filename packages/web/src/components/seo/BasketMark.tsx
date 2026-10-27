/** The Soko basket, white strokes (same paths as the wordmark). */
// For generated images (icons, share cards); the site itself uses <Wordmark>.
export function BasketMark({ size: px }: { size: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" />
      <path d="M8 10 12 4l4 6" />
    </svg>
  );
}
