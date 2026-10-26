// Signed-in home: the same page without the hero banner — people who are
// signed in came to shop. The middleware serves this at "/" when the session
// hint cookie is set (see lib/session-hint.ts).
import { HomeView } from "@/components/home/HomeView";

export { metadata } from "@/app/(public)/(home)/page";

export const revalidate = 60;

export default function SignedInHome() {
  return <HomeView hero={false} />;
}
