import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL, REQUEST_LOG_RETENTION_DAYS } from "@/lib/legal";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "What personal data Soko collects, why, who we share it with, how long we keep it, and your rights under Kenya's Data Protection Act.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      path="/privacy"
      summary={
        <>
          <p>
            We collect what we need to run your account, take payment and
            deliver your orders, and to keep Soko secure. We don&apos;t sell
            your data or use it for advertising. You have rights over your data
            under Kenya&apos;s <strong>Data Protection Act, 2019</strong> — see
            section 8 for how to use them.
          </p>
        </>
      }
      sections={[
        {
          id: "who",
          title: "Who we are",
          body: (
            <>
              <p>
                {LEGAL.companyName} (&ldquo;Soko&rdquo;) of {LEGAL.address} is
                the data controller for personal data processed through the Soko
                website. We are registered with the Office of the Data
                Protection Commissioner (ODPC) under number{" "}
                {LEGAL.odpcRegistration}.
              </p>
              <p>For anything about your data, contact {LEGAL.privacyEmail}.</p>
            </>
          ),
        },
        {
          id: "collect",
          title: "What we collect",
          body: (
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Account</td>
                  <td>
                    Name, email address, phone number, your password (stored
                    only as a one-way hash), and a profile photo if you add one.
                    If you sign in with Google: your name, email and profile
                    photo from Google.
                  </td>
                </tr>
                <tr>
                  <td>Addresses</td>
                  <td>
                    Delivery addresses you save: label, county, town and street.
                  </td>
                </tr>
                <tr>
                  <td>Orders</td>
                  <td>
                    What you ordered, prices, delivery fee, promo codes, order
                    and delivery status, and notes you add.
                  </td>
                </tr>
                <tr>
                  <td>Payments</td>
                  <td>
                    The M-Pesa phone number you pay with, the amount, and the
                    transaction details Safaricom returns (such as the M-Pesa
                    receipt number). We never receive your M-Pesa PIN.
                  </td>
                </tr>
                <tr>
                  <td>Reviews and disputes</td>
                  <td>
                    What you write in reviews and when you report a problem with
                    an order.
                  </td>
                </tr>
                <tr>
                  <td>Activity and security</td>
                  <td>
                    For each request to our service: date and time, the page or
                    action, the result, how long it took, your IP address,
                    browser type, and your account if you&apos;re signed in.
                    Request contents (such as passwords or form entries) are not
                    recorded.
                  </td>
                </tr>
                <tr>
                  <td>On your device</td>
                  <td>
                    A few cookies and browser storage items — see our{" "}
                    <Link href="/cookies">cookie policy</Link>.
                  </td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "use",
          title: "How and why we use it",
          body: (
            <ul>
              <li>
                <strong>To provide our service</strong> (performing our contract
                with you): creating your account, signing you in, taking
                payment, delivering orders, handling cancellations, refunds and
                disputes, and sending order updates.
              </li>
              <li>
                <strong>To keep Soko secure</strong> (our legitimate interests):
                detecting and preventing fraud, password guessing and abuse,
                limiting excessive requests, and investigating problems.
              </li>
              <li>
                <strong>To meet legal obligations</strong>: keeping tax and
                accounting records, and responding to lawful requests from
                authorities.
              </li>
              <li>
                <strong>To improve Soko</strong> (our legitimate interests):
                understanding which pages and features are used and how well the
                service performs, using aggregated information.
              </li>
            </ul>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>
                We share personal data only with organisations that help us run
                Soko, only as much as they need, and under contracts that
                require them to protect it:
              </p>
              <ul>
                <li>
                  <strong>Safaricom (M-Pesa)</strong> — to request and confirm
                  your payments.
                </li>
                <li>
                  <strong>Twilio</strong> — to send one-time sign-in codes by
                  SMS to your phone number.
                </li>
                <li>
                  <strong>Google</strong> — only if you choose to sign in with
                  Google.
                </li>
                <li>
                  <strong>Delivery partners</strong> — your name, phone number
                  and delivery address, to deliver your order.
                </li>
                <li>
                  <strong>Hosting and infrastructure providers</strong> — the
                  companies that host our website, servers and database
                  (currently Vercel, Render and Supabase).
                </li>
                <li>
                  <strong>Authorities</strong> — where the law requires it, or
                  to protect our customers, Soko or others from fraud or harm.
                </li>
              </ul>
              <p>We do not sell your personal data.</p>
            </>
          ),
        },
        {
          id: "transfers",
          title: "Transfers outside Kenya",
          body: (
            <p>
              Some of our providers store or process data outside Kenya — for
              example, our database is hosted in the European Union. Where data
              leaves Kenya we rely on safeguards permitted by the Data
              Protection Act, 2019, such as the provider&apos;s contractual
              commitments and security measures, and the destination&apos;s data
              protection laws.
            </p>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <ul>
              <li>
                <strong>Account and addresses</strong>: while your account is
                open. When you close it, we delete or anonymise them, except
                what we must keep for the reasons below.
              </li>
              <li>
                <strong>Orders and payments</strong>: as long as Kenyan tax and
                accounting law requires (generally at least five years), and to
                deal with any dispute.
              </li>
              <li>
                <strong>Request records (activity and security)</strong>:{" "}
                {REQUEST_LOG_RETENTION_DAYS} days, then deleted automatically.
              </li>
              <li>
                <strong>Sign-in sessions</strong>: up to 7 days unless you sign
                out sooner. One-time sign-in codes expire within minutes.
              </li>
            </ul>
          ),
        },
        {
          id: "security",
          title: "How we protect it",
          body: (
            <p>
              Data is encrypted in transit (HTTPS). Passwords are stored only as
              one-way hashes. Sign-in sessions are protected by short-lived
              access tokens and secure, HTTP-only cookies. Access to customer
              data is limited to staff who need it, and access to our systems is
              logged and monitored. No system is perfectly secure; if a breach
              affects your data we will notify you and the ODPC as the law
              requires.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>Under the Data Protection Act, 2019 you have the right to:</p>
              <ul>
                <li>be told how your data is used (this policy);</li>
                <li>access the personal data we hold about you;</li>
                <li>
                  correct inaccurate data — you can update most of it yourself
                  in your profile;
                </li>
                <li>
                  have your data deleted, subject to what we must keep by law;
                </li>
                <li>object to processing based on our legitimate interests;</li>
                <li>receive your data in a portable format;</li>
                <li>withdraw consent where we rely on it.</li>
              </ul>
              <p>
                To use any of these rights, email {LEGAL.privacyEmail}. We may
                need to confirm your identity, and we&apos;ll respond within the
                time the law allows. If you&apos;re unhappy with how we handle
                your data, you can complain to the{" "}
                <strong>Office of the Data Protection Commissioner</strong>{" "}
                (www.odpc.go.ke).
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              Soko is not intended for children under 18 to use without a parent
              or guardian. We don&apos;t knowingly collect data from children;
              if you believe a child has given us personal data, contact us and
              we&apos;ll delete it.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              We&apos;ll update this policy when our practices or the law
              change. The date at the top shows the latest version, and
              we&apos;ll tell you about important changes by email or on the
              site.
            </p>
          ),
        },
      ]}
    />
  );
}
