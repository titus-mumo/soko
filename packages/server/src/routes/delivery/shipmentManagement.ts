import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  createOrderShipment,
  assignTrackingNumber,
  updateShipmentStatus,
  bulkInsertShipmentEvents,
} from "../../services/delivery.service";

// Shipments go from the Soko hub to the buyer, one per order. Only the hub
// (admins) creates and advances them; sellers drop items off instead.

const courier = t.Union([
  t.Literal("sendy"),
  t.Literal("fargo"),
  t.Literal("self"),
  t.Literal("other"),
]);

const shipmentStatus = t.Union([
  t.Literal("awaiting_pickup"),
  t.Literal("in_transit"),
  t.Literal("out_for_delivery"),
  t.Literal("delivered"),
  t.Literal("failed"),
  t.Literal("returned"),
]);

export const CreateShipment = new Elysia().use(adminPlugin).post(
  "/admin/orders/:orderId/shipment",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await createOrderShipment(params.orderId, {
      courier: body.courier,
      trackingNumber: body.trackingNumber,
    });

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "order_not_paid") {
      set.status = 400;
      return { success: false, message: "This order hasn't been paid." };
    }
    if (result === "shipment_already_exists") {
      set.status = 409;
      return { success: false, message: "This order has already shipped." };
    }
    if (result === "items_not_at_hub") {
      set.status = 400;
      return {
        success: false,
        message: "Every item must be received at the hub before shipping.",
      };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      courier,
      trackingNumber: t.Optional(t.String({ minLength: 1 })),
    }),
  },
);

export const AssignTrackingNumber = new Elysia().use(adminPlugin).patch(
  "/admin/shipments/:shipmentId/tracking",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await assignTrackingNumber(
      params.shipmentId,
      body.courier,
      body.trackingNumber,
    );

    if (result === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, message: "Tracking number assigned." };
  },
  { body: t.Object({ courier, trackingNumber: t.String({ minLength: 1 }) }) },
);

export const UpdateShipmentStatus = new Elysia().use(adminPlugin).patch(
  "/admin/shipments/:shipmentId/status",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateShipmentStatus(params.shipmentId, body.status, {
      description: body.description,
      location: body.location,
    });

    if (result === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, message: "Shipment status updated." };
  },
  {
    body: t.Object({
      status: shipmentStatus,
      description: t.Optional(t.String()),
      location: t.Optional(t.String()),
    }),
  },
);

export const BulkInsertShipmentEvents = new Elysia().use(adminPlugin).post(
  "/admin/shipments/:shipmentId/events",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await bulkInsertShipmentEvents(
      params.shipmentId,
      body.events,
    );

    if (result === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      events: t.Array(
        t.Object({
          status: shipmentStatus,
          description: t.Optional(t.String()),
          location: t.Optional(t.String()),
          happenedAt: t.Optional(t.String()),
        }),
      ),
    }),
  },
);
