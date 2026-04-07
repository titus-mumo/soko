import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getShipmentByTrackingNumber,
  getShipmentByOrderItemId,
  getShipmentTimeline,
} from "../../services/delivery.service";

// Public
export const TrackShipment = new Elysia().get(
  "/track/:trackingNumber",
  async (ctx) => {
    const { params, set } = ctx as any;
    const shipment = await getShipmentByTrackingNumber(params.trackingNumber);

    if (shipment === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    const timeline = await getShipmentTimeline(shipment.id);

    if (timeline === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, data: timeline };
  },
);

// Buyer
export const GetShipmentByOrderItem = new Elysia()
  .use(authPlugin)
  .get("/me/shipments/order-item/:orderItemId", async (ctx) => {
    const { params, set } = ctx as any;
    const shipment = await getShipmentByOrderItemId(params.orderItemId);

    if (shipment === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, data: shipment };
  });

export const GetShipmentTimeline = new Elysia()
  .use(authPlugin)
  .get("/me/shipments/timeline/:shipmentId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getShipmentTimeline(params.shipmentId);

    if (result === "shipment_not_found") {
      set.status = 404;
      return { success: false, message: "Shipment not found." };
    }

    return { success: true, data: result };
  });
