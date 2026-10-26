import { api } from "./api";
import type {
  ApiResponse,
  Courier,
  DeliveryZone,
  Shipment,
  ShipmentStatus,
  ShipmentTimeline,
} from "./types";

// ─── Zones (public) ──────────────────────────────────────────────────────────

export async function getAllDeliveryZones(): Promise<DeliveryZone[]> {
  const { data } =
    await api.get<ApiResponse<DeliveryZone[]>>("/delivery/zones");
  return data.data;
}

export async function getDeliveryZonesByCounty(
  county: string,
): Promise<DeliveryZone[]> {
  const { data } = await api.get<ApiResponse<DeliveryZone[]>>(
    `/delivery/zones/county/${encodeURIComponent(county)}`,
  );
  return data.data;
}

// ─── Tracking ────────────────────────────────────────────────────────────────

/** The shipment and timeline for one of the buyer's orders; null until it ships. */
export async function getOrderShipment(
  orderId: string,
): Promise<ShipmentTimeline | null> {
  const { data } = await api.get<ApiResponse<ShipmentTimeline | null>>(
    `/delivery/me/orders/${orderId}/shipment`,
  );
  return data.data;
}

export async function trackShipment(
  trackingNumber: string,
): Promise<ShipmentTimeline> {
  const { data } = await api.get<ApiResponse<ShipmentTimeline>>(
    `/delivery/track/${encodeURIComponent(trackingNumber)}`,
  );
  return data.data;
}

// ─── Hub (admin) ─────────────────────────────────────────────────────────────

/** Ships an order from the hub once all its items have been received. */
export async function createOrderShipment(
  orderId: string,
  courier: Courier,
  trackingNumber?: string,
): Promise<Shipment> {
  const { data } = await api.post<ApiResponse<Shipment>>(
    `/delivery/admin/orders/${orderId}/shipment`,
    { courier, ...(trackingNumber && { trackingNumber }) },
  );
  return data.data;
}

export async function assignTrackingNumber(
  shipmentId: string,
  courier: Courier,
  trackingNumber: string,
): Promise<void> {
  await api.patch(`/delivery/admin/shipments/${shipmentId}/tracking`, {
    courier,
    trackingNumber,
  });
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  extra?: { description?: string; location?: string },
): Promise<void> {
  await api.patch(`/delivery/admin/shipments/${shipmentId}/status`, {
    status,
    ...extra,
  });
}
