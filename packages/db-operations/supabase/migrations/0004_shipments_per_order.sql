ALTER TABLE "shipments" DROP CONSTRAINT "shipments_order_item_id_order_items_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "order_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "order_item_id";--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_unique" UNIQUE("order_id");