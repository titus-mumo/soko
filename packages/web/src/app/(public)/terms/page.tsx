import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL, RETURN_WINDOW_DAYS } from "@/lib/legal";

export const metadata = pageMetadata({
  title: "Terms of service",
  description:
    "The terms for using Soko: accounts, orders, M-Pesa payments, delivery, cancellations and your rights.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      path="/terms"
      summary={
        <>
          <p>
            These terms are the agreement between you and{" "}
            <strong>{LEGAL.companyName}</strong> (&ldquo;Soko&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) when you use the Soko website
            and place orders. In short: Soko sells and delivers the products
            listed, you pay with M-Pesa, and you can cancel before we start
            packing or report a problem after delivery.
          </p>
          <p className="mt-2">
            Please read them with our{" "}
            <Link href="/privacy">privacy policy</Link> and{" "}
            <Link href="/returns">returns &amp; refunds policy</Link>. By
            creating an account or placing an order you agree to these terms.
          </p>
        </>
      }
      sections={[
        {
          id: "about",
          title: "About Soko",
          body: (
            <>
              <p>
                Soko is an online shop operated by {LEGAL.companyName},
                registration number {LEGAL.registrationNumber}, of{" "}
                {LEGAL.address}. Every order on Soko is sold, fulfilled and
                delivered by Soko, and Soko is responsible to you for it — you
                don&apos;t deal with anyone else.
              </p>
              <p>
                You can reach us at {LEGAL.supportEmail} or {LEGAL.supportPhone}
                .
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "Your account",
          body: (
            <>
              <ul>
                <li>
                  You must be at least 18 years old, or have a parent or
                  guardian&apos;s permission, to create an account or order.
                </li>
                <li>
                  Give us accurate details — your name, email, phone number and
                  delivery address — and keep them up to date.
                </li>
                <li>
                  Keep your password and sign-in codes private. You&apos;re
                  responsible for activity on your account; tell us straight
                  away if you think someone else has used it.
                </li>
                <li>
                  You can sign in with email and password, a one-time code sent
                  by SMS to your registered number, or Google.
                </li>
              </ul>
              <p>
                We may suspend or close an account that breaks these terms, is
                used for fraud, or puts other customers or Soko at risk. To
                close your account yourself, contact us.
              </p>
            </>
          ),
        },
        {
          id: "products-prices",
          title: "Products and prices",
          body: (
            <>
              <p>
                We describe and photograph products as accurately as we can, but
                colours and sizes on screen can vary slightly. Product condition
                (new, used or refurbished) is shown on every listing.
              </p>
              <p>
                Prices are in Kenya Shillings (KES). The delivery fee for your
                county is shown at checkout before you pay. If a price is
                clearly wrong because of an error, we may cancel the order and
                refund anything you paid.
              </p>
              <p>
                Adding an item to your cart holds it for you for a limited time
                (currently 60 minutes from your last cart activity); it is not
                reserved after that, and stock is only committed when you place
                the order.
              </p>
            </>
          ),
        },
        {
          id: "orders-payment",
          title: "Orders and payment",
          body: (
            <>
              <ol>
                <li>
                  When you place an order we confirm what you&apos;re buying,
                  the total and the delivery fee. The order is then{" "}
                  <strong>pending</strong> until it&apos;s paid.
                </li>
                <li>
                  You pay with <strong>M-Pesa</strong>: we send a payment prompt
                  (STK push) to the phone number you choose, and you approve it
                  with your M-Pesa PIN. Soko never sees your PIN.
                </li>
                <li>
                  Once Safaricom confirms the payment your order is{" "}
                  <strong>confirmed</strong> and we start preparing it. The
                  contract between us is formed at that point.
                </li>
              </ol>
              <p>
                We may decline or cancel an order — for example if an item is
                out of stock, the payment fails, or we suspect fraud. If you
                have paid, we refund you in full.
              </p>
              <p>
                Promo codes are subject to the conditions shown when you use
                them (such as a minimum order, an expiry date or a usage limit),
                have no cash value and can be withdrawn at any time.
              </p>
            </>
          ),
        },
        {
          id: "delivery",
          title: "Delivery",
          body: (
            <>
              <p>
                We deliver to the counties listed on our{" "}
                <Link href="/delivery">delivery zones page</Link>, with the fee
                and estimated delivery time for each. Your order is collected at
                our Nairobi hub and sent to you in one delivery.
              </p>
              <p>
                Delivery times are estimates, not guarantees. We&apos;ll keep
                you updated on your order page and by notification. Please make
                sure someone is available to receive the delivery at the address
                you gave; risk in the goods passes to you when they&apos;re
                delivered.
              </p>
            </>
          ),
        },
        {
          id: "cancellations-returns",
          title: "Cancellations, returns and refunds",
          body: (
            <>
              <p>
                You can cancel an order yourself from your Orders page while
                it&apos;s pending or confirmed — before we start packing it. If
                something is wrong with your order, report it within{" "}
                {RETURN_WINDOW_DAYS} days of delivery. Full details are in our{" "}
                <Link href="/returns">returns &amp; refunds policy</Link>.
              </p>
              <p>
                Nothing in these terms limits your rights under the Consumer
                Protection Act, 2012 or other Kenyan law.
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: "Reviews",
          body: (
            <>
              <p>
                After an item is delivered you can review it. Reviews must be
                honest and about the product, and must not include contact
                details, links, offensive or unlawful content, or someone
                else&apos;s personal information. We may remove reviews that
                break these rules. By posting a review you allow us to show it
                on Soko.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          body: (
            <>
              <p>When using Soko you must not:</p>
              <ul>
                <li>
                  break the law, or use Soko for fraud or to resell stolen
                  goods;
                </li>
                <li>
                  try to access accounts, data or parts of the service you
                  aren&apos;t allowed to, or test, probe or attack its security;
                </li>
                <li>
                  copy, scrape or harvest the site or its data by automated
                  means, or overload it — we limit how often requests can be
                  made and may block clients that exceed those limits;
                </li>
                <li>interfere with other customers&apos; use of Soko.</li>
              </ul>
              <p>
                We log requests to the service for security (see our{" "}
                <Link href="/privacy">privacy policy</Link>) and may suspend
                access that breaks these rules.
              </p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Our responsibility to you",
          body: (
            <>
              <p>
                We provide Soko with reasonable care and skill. We&apos;re
                responsible for loss or damage you suffer that is a foreseeable
                result of us breaking these terms or failing to use reasonable
                care. We aren&apos;t responsible for losses that weren&apos;t
                foreseeable, for business losses, or for delays caused by events
                outside our reasonable control (such as network or M-Pesa
                outages, severe weather or civil disruption).
              </p>
              <p>
                Our total liability for any order is limited to the amount you
                paid for it, except where the law doesn&apos;t allow liability
                to be limited — for example for death or personal injury caused
                by negligence, or fraud.
              </p>
            </>
          ),
        },
        {
          id: "ip",
          title: "Content and trademarks",
          body: (
            <p>
              The Soko name, logo, website design and content belong to Soko or
              its licensors. You may use the site to shop for your own,
              non-commercial use; anything else needs our written permission.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              We may update these terms — for example when we change how Soko
              works or the law changes. The date at the top shows the latest
              version, and we&apos;ll tell you about important changes by email
              or on the site. Orders are governed by the terms in force when you
              placed them.
            </p>
          ),
        },
        {
          id: "law",
          title: "Law and complaints",
          body: (
            <>
              <p>
                These terms are governed by the laws of Kenya, and the courts of
                Kenya have jurisdiction over any dispute.
              </p>
              <p>
                If you have a complaint, contact us first at{" "}
                {LEGAL.supportEmail} — most problems are resolved quickly. For
                an order, you can also raise a dispute from your{" "}
                <Link href="/disputes">Disputes page</Link>. If we can&apos;t
                resolve it, you may contact the Competition Authority of Kenya
                (consumer protection) or seek other remedies available by law.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
