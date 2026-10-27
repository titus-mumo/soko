// Signed-in copy of a public page: same content, rendered inside the app
// layout with the sidebar. The middleware serves it at the public URL when
// the session hint cookie is set (see lib/session-hint.ts).
export { default, metadata } from "@/app/(public)/terms/page";
