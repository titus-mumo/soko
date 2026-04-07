import Elysia from "elysia";
import {
  GetAllDeliveryZones,
  GetDeliveryZonesByCounty,
  CreateDeliveryZone,
  UpdateDeliveryZone,
  UpdateDeliveryZoneFee,
  UpdateDeliveryZoneEstimatedDays,
  DeleteDeliveryZone,
} from "./deliveryZones";
import {
  TrackShipment,
  GetShipmentByOrderItem,
  GetShipmentTimeline,
} from "./shipmentTracking";
import {
  CreateShipment,
  AssignTrackingNumber,
  UpdateShipmentStatus,
  BulkInsertShipmentEvents,
} from "./shipmentManagement";

export const deliveryRoutes = new Elysia().group("/delivery", (app) =>
  app
    // Public — zones
    .use(GetAllDeliveryZones)
    .use(GetDeliveryZonesByCounty)
    // Public — tracking
    .use(TrackShipment)
    // Buyer — shipment tracking
    .use(GetShipmentByOrderItem)
    .use(GetShipmentTimeline)
    // Seller — shipment management
    .use(CreateShipment)
    .use(AssignTrackingNumber)
    .use(UpdateShipmentStatus)
    .use(BulkInsertShipmentEvents)
    // Admin — zone management
    .use(CreateDeliveryZone)
    .use(UpdateDeliveryZone)
    .use(UpdateDeliveryZoneFee)
    .use(UpdateDeliveryZoneEstimatedDays)
    .use(DeleteDeliveryZone)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
