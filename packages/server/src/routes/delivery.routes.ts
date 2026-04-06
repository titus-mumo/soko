import Elysia, { t } from "elysia";
import {
  authPlugin,
  adminPlugin,
  sellerPlugin,
} from "../middleware/auth.middleware";
import {
  getAllDeliveryZones,
  getDeliveryZonesByCounty,
  createDeliveryZone,
  updateDeliveryZone,
  updateDeliveryZoneFee,
  updateDeliveryZoneEstimatedDays,
  deleteDeliveryZone,
  getShipmentByOrderItemId,
  getShipmentByTrackingNumber,
  createShipment,
  assignTrackingNumber,
  updateShipmentStatus,
  getShipmentTimeline,
  bulkInsertShipmentEvents,
} from "../services/delivery.service";

export const deliveryRoutes = new Elysia({ prefix: "/delivery" })

  // ─────────────────────────────────────────
  // Public — Delivery Zones
  // ─────────────────────────────────────────

  // Get all active delivery zones.
  // Use this to show available delivery options at checkout.
  .get("/zones", async (ctx) => {
    const result = await getAllDeliveryZones();
    return { success: true, data: result };
  })

  // Get delivery zones for a specific county.
  // Use this to resolve delivery fee when buyer selects an address.
  .get("/zones/county/:county", async (ctx) => {
    const { params } = ctx as any;
    const result = await getDeliveryZonesByCounty(params.county);

    if (result === "no_zones_found") {
      ctx.set.status = 404;
      return {
        success: false,
        message: "No delivery zones found for this county.",
      };
    }

    return { success: true, data: result };
  })

  // ─────────────────────────────────────────
  // Public — Tracking
  // ─────────────────────────────────────────

  // Track a shipment by tracking number.
  // Use this for the public tracking page.
  .get("/track/:trackingNumber", async (ctx) => {
    const { params } = ctx as any;
    const shipment = await getShipmentByTrackingNumber(params.trackingNumber);

    if (shipment === "shipment_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    const timeline = await getShipmentTimeline(shipment.id);

    if (timeline === "shipment_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, data: timeline };
  })

  // ─────────────────────────────────────────
  // Buyer — Shipment Tracking
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Get shipment details for a specific order item.
      .get("/shipments/order-item/:orderItemId", async (ctx) => {
        const { params } = ctx as any;
        const shipment = await getShipmentByOrderItemId(params.orderItemId);

        if (shipment === "shipment_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Shipment not found." };
        }

        return { success: true, data: shipment };
      })

      // Get the full tracking timeline for a shipment.
      .get("/shipments/timeline/:shipmentId", async (ctx) => {
        const { params } = ctx as any;
        const result = await getShipmentTimeline(params.shipmentId);

        if (result === "shipment_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Shipment not found." };
        }

        return { success: true, data: result };
      }),
  )

  // ─────────────────────────────────────────
  // Seller — Shipment Management
  // ─────────────────────────────────────────

  .group("/seller", (app) =>
    app
      .use(sellerPlugin())

      // Create a shipment for an order item.
      // Call this after confirming the order item.
      .post(
        "/shipments",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await createShipment(userId, body.orderItemId, {
            courier: body.courier,
          });

          if (result === "order_item_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order item not found." };
          }

          if (result === "shipment_already_exists") {
            ctx.set.status = 409;
            return {
              success: false,
              message: "Shipment already exists for this order item.",
            };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            orderItemId: t.String(),
            courier: t.Union([
              t.Literal("sendy"),
              t.Literal("fargo"),
              t.Literal("self"),
              t.Literal("other"),
            ]),
          }),
        },
      )

      // Assign a tracking number and courier to a shipment.
      .patch(
        "/shipments/:shipmentId/tracking",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await assignTrackingNumber(
            params.shipmentId,
            body.courier,
            body.trackingNumber,
          );

          if (result === "shipment_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Shipment not found." };
          }

          return { success: true, message: "Tracking number assigned." };
        },
        {
          body: t.Object({
            courier: t.Union([
              t.Literal("sendy"),
              t.Literal("fargo"),
              t.Literal("self"),
              t.Literal("other"),
            ]),
            trackingNumber: t.String(),
          }),
        },
      )

      // Update the status of a shipment and log the event.
      .patch(
        "/shipments/:shipmentId/status",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateShipmentStatus(
            params.shipmentId,
            body.status,
            {
              description: body.description,
              location: body.location,
            },
          );

          if (result === "shipment_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Shipment not found." };
          }

          return { success: true, message: "Shipment status updated." };
        },
        {
          body: t.Object({
            status: t.Union([
              t.Literal("awaiting_pickup"),
              t.Literal("in_transit"),
              t.Literal("out_for_delivery"),
              t.Literal("delivered"),
              t.Literal("failed"),
              t.Literal("returned"),
            ]),
            description: t.Optional(t.String()),
            location: t.Optional(t.String()),
          }),
        },
      )

      // Bulk insert shipment events from a courier webhook.
      .post(
        "/shipments/:shipmentId/events",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await bulkInsertShipmentEvents(
            params.shipmentId,
            body.events,
          );

          if (result === "shipment_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Shipment not found." };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            events: t.Array(
              t.Object({
                status: t.Union([
                  t.Literal("awaiting_pickup"),
                  t.Literal("in_transit"),
                  t.Literal("out_for_delivery"),
                  t.Literal("delivered"),
                  t.Literal("failed"),
                  t.Literal("returned"),
                ]),
                description: t.Optional(t.String()),
                location: t.Optional(t.String()),
                happenedAt: t.Optional(t.String()),
              }),
            ),
          }),
        },
      ),
  )

  // ─────────────────────────────────────────
  // Admin — Delivery Zone Management
  // ─────────────────────────────────────────

  .group("/admin/zones", (app) =>
    app
      .use(adminPlugin())

      // Create a new delivery zone.
      .post(
        "/",
        async (ctx) => {
          const { body } = ctx as any;
          const result = await createDeliveryZone(body);

          if (!result) {
            ctx.set.status = 500;
            return {
              success: false,
              message: "Failed to create delivery zone.",
            };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            name: t.String({ minLength: 2 }),
            county: t.String(),
            estimatedDays: t.Number({ minimum: 1 }),
            baseFee: t.String(),
          }),
        },
      )

      // Update a delivery zone.
      .patch(
        "/:zoneId",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateDeliveryZone(params.zoneId, body);

          if (result === "delivery_zone_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Delivery zone not found." };
          }

          return { success: true, data: result };
        },
        {
          body: t.Object({
            name: t.Optional(t.String({ minLength: 2 })),
            county: t.Optional(t.String()),
            estimatedDays: t.Optional(t.Number({ minimum: 1 })),
            baseFee: t.Optional(t.String()),
          }),
        },
      )

      // Update the base fee for a delivery zone.
      .patch(
        "/:zoneId/fee",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateDeliveryZoneFee(
            params.zoneId,
            body.baseFee,
          );

          if (result === "delivery_zone_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Delivery zone not found." };
          }

          return { success: true, message: "Delivery fee updated." };
        },
        {
          body: t.Object({
            baseFee: t.String(),
          }),
        },
      )

      // Update the estimated delivery days for a zone.
      .patch(
        "/:zoneId/days",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateDeliveryZoneEstimatedDays(
            params.zoneId,
            body.estimatedDays,
          );

          if (result === "delivery_zone_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Delivery zone not found." };
          }

          return { success: true, message: "Estimated days updated." };
        },
        {
          body: t.Object({
            estimatedDays: t.Number({ minimum: 1 }),
          }),
        },
      )

      // Soft delete a delivery zone.
      .delete("/:zoneId", async (ctx) => {
        const { params } = ctx as any;
        const result = await deleteDeliveryZone(params.zoneId);

        if (result === "delivery_zone_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Delivery zone not found." };
        }

        return { success: true, message: "Delivery zone deleted." };
      }),
  );
