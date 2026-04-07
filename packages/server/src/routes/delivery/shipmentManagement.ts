import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  createShipment,
  assignTrackingNumber,
  updateShipmentStatus,
  bulkInsertShipmentEvents,
} from "../../services/delivery.service";

export const CreateShipment = new Elysia().use(sellerPlugin).post(
  "/seller/shipments",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await createShipment(userId, body.orderItemId, {
      courier: body.courier,
    });

    if (result === "order_item_not_found") {
      set.status = 404;
      return { success: false, message: "Order item not found." };
    }
    if (result === "shipment_already_exists") {
      set.status = 409;
      return {
        success: false,
        message: "Shipment already exists for this order item.",
      };
    }

    set.status = 201;
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
);

export const AssignTrackingNumber = new Elysia().use(sellerPlugin).patch(
  "/seller/shipments/:shipmentId/tracking",
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
);

export const UpdateShipmentStatus = new Elysia().use(sellerPlugin).patch(
  "/seller/shipments/:shipmentId/status",
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
);

export const BulkInsertShipmentEvents = new Elysia().use(sellerPlugin).post(
  "/seller/shipments/:shipmentId/events",
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
);
