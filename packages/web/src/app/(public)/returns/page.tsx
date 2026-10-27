import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL, REFUND_WORKING_DAYS, RETURN_WINDOW_DAYS } from "@/lib/legal";

export const metadata = pageMetadata({
  title: "Returns, refunds and cancellations",
  description:
    "How to cancel a Soko order, report a problem after delivery, return an item and get your money back on M-Pesa.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Returns, refunds and cancellations"
      path="/returns"
      summary={
        <ul className="!mt-0 list-disc space-y-1 pl-5">
          <li>
            <strong>Changed your mind before we pack?</strong> Cancel from your
            Orders page while the order is pending or confirmed.
          </li>
          <li>
            <strong>Something wrong with your delivery?</strong> Report it
            within {RETURN_WINDOW_DAYS} days from your Disputes page.
          </li>
          <li>
            <strong>Refunds</strong> go back to the M-Pesa number you paid with,
            usually within {REFUND_WORKING_DAYS} working days of approval.
          </li>
        </ul>
      }
      sections={[
        {
          id: "cancel",
          title: "Cancelling an order",
          body: (
            <>
              <p>
                You can cancel an order yourself from{" "}
                <Link href="/orders">your Orders page</Link> while it&apos;s{" "}
                <strong>pending</strong> (not yet paid) or{" "}
                <strong>confirmed</strong> (paid, not yet being packed). If you
                had paid, you get a full refund.
              </p>
              <p>
                Once we&apos;ve started packing or the order has shipped, it can
                no longer be cancelled online — contact us at{" "}
                {LEGAL.supportEmail} and we&apos;ll help where we can.
              </p>
              <p>
                We may cancel an order, or one item in it, if it can&apos;t be
                supplied — for example it&apos;s out of stock or damaged before
                dispatch. We&apos;ll tell you, and refund anything you paid for
                it.
              </p>
            </>
          ),
        },
        {
          id: "problems",
          title: "Problems with a delivery",
          body: (
            <>
              <p>
                If an item arrives damaged, faulty, wrong, incomplete or not as
                described, report it within {RETURN_WINDOW_DAYS} days of
                delivery:
              </p>
              <ol>
                <li>
                  Go to <Link href="/disputes">your Disputes page</Link> and
                  raise a dispute on the order.
                </li>
                <li>
                  Describe the problem; photos help us resolve it faster. Keep
                  the item and its packaging.
                </li>
                <li>
                  We review it and agree the fix with you — a replacement, a
                  repair, or a refund. If we need the item back, we&apos;ll
                  arrange collection or tell you how to return it, at no cost to
                  you.
                </li>
              </ol>
              <p>
                Disputes can be raised on orders that are confirmed, being
                prepared, shipped or delivered.
              </p>
            </>
          ),
        },
        {
          id: "change-of-mind",
          title: "Changing your mind",
          body: (
            <>
              <p>
                If you change your mind, cancel the order before we start
                packing it — see <a href="#cancel">Cancelling an order</a>. Once
                an order has been delivered, we don&apos;t accept returns
                because you no longer want an item, so please check sizes,
                colours and product details before you pay.
              </p>
              <p>
                This doesn&apos;t affect returns for items that are damaged,
                faulty, wrong or not as described — those are always covered
                (see <a href="#problems">Problems with a delivery</a>), as are
                your rights under Kenyan law.
              </p>
            </>
          ),
        },
        {
          id: "refunds",
          title: "Refunds",
          body: (
            <>
              <p>
                Approved refunds are sent to the M-Pesa number the order was
                paid from, usually within {REFUND_WORKING_DAYS} working days. A
                full order refund includes the delivery fee; a refund for part
                of an order covers the affected items. If a promo code was
                applied, the refund reflects what you actually paid.
              </p>
              <p>
                If you haven&apos;t received a refund you were promised, contact{" "}
                {LEGAL.supportEmail} with your order number.
              </p>
            </>
          ),
        },
        {
          id: "warranty",
          title: "Warranties",
          body: (
            <p>
              Where a product listing mentions a manufacturer&apos;s warranty,
              it applies in addition to your rights under this policy and Kenyan
              law. Contact us if you need help making a warranty claim.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your legal rights",
          body: (
            <p>
              This policy adds to, and doesn&apos;t limit, your rights under the
              Consumer Protection Act, 2012 and other Kenyan law. See also our{" "}
              <Link href="/terms">terms of service</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
