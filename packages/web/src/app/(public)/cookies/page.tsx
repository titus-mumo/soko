import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = pageMetadata({
  title: "Cookie policy",
  description:
    "The cookies and browser storage Soko uses, what each one does and how long it lasts. No advertising or tracking cookies.",
  path: "/cookies",
});

// Keep these tables in step with the code: server/src/controllers/
// auth.controller.ts (soko_refresh), web/src/lib/session-hint.ts
// (soko_session), and the localStorage keys in web/src/lib and store.
export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      path="/cookies"
      summary={
        <p>
          Soko only uses cookies and browser storage that the site needs to work
          — to keep you signed in, remember your cart and settings. We
          don&apos;t use advertising or third-party tracking cookies, so
          there&apos;s nothing to opt out of.
        </p>
      }
      sections={[
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>What it does</th>
                  <th>Lasts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>soko_refresh</code>
                  </td>
                  <td>
                    Keeps you signed in between visits. Secure and HTTP-only —
                    the page&apos;s scripts can&apos;t read it.
                  </td>
                  <td>7 days, or until you sign out</td>
                </tr>
                <tr>
                  <td>
                    <code>soko_session</code>
                  </td>
                  <td>
                    Notes that this browser is signed in, so pages open in the
                    right layout. Contains no personal data.
                  </td>
                  <td>30 days, or until you sign out</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "storage",
          title: "Browser storage",
          body: (
            <>
              <p>
                Some things are kept in your browser&apos;s storage instead
                (local storage, or session storage where noted). They stay on
                your device and aren&apos;t sent to us except when you use them
                (for example, checking out your cart).
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>soko-auth</code>
                    </td>
                    <td>
                      Your basic account details, so the site loads signed in.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>soko:guest-cart</code>
                    </td>
                    <td>
                      Your cart before you sign in; it moves to your account
                      when you do.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>soko:promo-code</code>
                    </td>
                    <td>
                      A promo code you entered, until you check out or close the
                      browser tab (session storage).
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>soko:recent-searches</code>
                    </td>
                    <td>Your recent searches, shown in the search box.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>soko:recently-viewed</code>
                    </td>
                    <td>
                      Products you viewed recently, shown on your dashboard.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>soko_sidebar_collapsed</code>
                    </td>
                    <td>Whether you collapsed the side menu.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>theme</code>
                    </td>
                    <td>Whether you chose the light or dark look.</td>
                  </tr>
                </tbody>
              </table>
            </>
          ),
        },
        {
          id: "control",
          title: "Your choices",
          body: (
            <p>
              You can clear cookies and site data in your browser settings at
              any time. If you do, you&apos;ll be signed out and lose a guest
              cart and your saved preferences; blocking these cookies entirely
              stops sign-in from working.
            </p>
          ),
        },
        {
          id: "more",
          title: "More information",
          body: (
            <p>
              How we handle personal data generally is explained in our{" "}
              <Link href="/privacy">privacy policy</Link>. Questions:{" "}
              {LEGAL.privacyEmail}.
            </p>
          ),
        },
      ]}
    />
  );
}
