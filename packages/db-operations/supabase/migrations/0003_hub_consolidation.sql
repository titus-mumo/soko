ALTER TYPE "public"."order_status" ADD VALUE 'dropped_off' BEFORE 'shipped';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'at_hub' BEFORE 'shipped';--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Link existing per-item shipments to their order.
UPDATE "shipments" s SET "order_id" = oi."order_id"
FROM "order_items" oi
WHERE oi."id" = s."order_item_id";--> statement-breakpoint
-- Orders now have one shipment. Keep the most recently updated one per
-- order; the others (and their events, by cascade) are removed.
DELETE FROM "shipments" s
USING (
  SELECT "id", row_number() OVER (
    PARTITION BY "order_id" ORDER BY "updated_at" DESC, "created_at" DESC
  ) AS rn
  FROM "shipments"
) ranked
WHERE s."id" = ranked."id" AND ranked.rn > 1;
