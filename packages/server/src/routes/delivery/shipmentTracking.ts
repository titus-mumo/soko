import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getShipmentByTrackingNumber,
  getBuyerOrderShipment,
  getShipmentTimeline,
} from "../../services/delivery.service";
import { shipmentTracking } from "../../lib/views";

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

    return { success: true, data: shipmentTracking(timeline) };
  },
);

// Buyer — the shipment for one of their orders, with its timeline. `data` is
// null until the order leaves the hub.
export const GetOrderShipment = new Elysia()
  .use(authPlugin)
  .get("/me/orders/:orderId/shipment", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await getBuyerOrderShipment(userId, params.orderId);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }

    // null until the hub ships the order.
    return { success: true, data: result && shipmentTracking(result) };
  });
