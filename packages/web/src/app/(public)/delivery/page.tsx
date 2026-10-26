import { fetchDeliveryZones } from "@/lib/server-api";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { cardClasses } from "@/components/ui/Card";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Delivery zones and fees",
  description:
    "Where Soko delivers, how long it takes and what it costs, by county.",
  path: "/delivery",
});

export default async function DeliveryPage() {
  const zones = await fetchDeliveryZones();
  const byCounty = [...zones].sort(
    (a, b) =>
      a.county.localeCompare(b.county) || Number(a.baseFee) - Number(b.baseFee),
  );

  return (
    <div className="space-y-8">
      <JsonLd data={breadcrumbJsonLd([["Delivery", "/delivery"]])} />
      <PageHeader
        title="Delivery zones"
        description="The fee for your order is set by your delivery county and shown at checkout before you pay."
      />

      {byCounty.length === 0 ? (
        <EmptyState
          icon="truck"
          title="Delivery zones aren't set up yet"
          description="Fees are shown at checkout once your address is in a delivery zone."
        />
      ) : (
        <div
          className={cardClasses({
            padded: false,
            className: "overflow-x-auto",
          })}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  County
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Zone
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Arrives in
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Fee
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {byCounty.map((z) => (
                <tr key={z.id}>
                  <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {z.county}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    {z.name}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    {z.estimatedDays} day{z.estimatedDays === 1 ? "" : "s"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Price amount={z.baseFee} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
