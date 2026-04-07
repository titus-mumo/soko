import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  getAllDeliveryZones,
  getDeliveryZonesByCounty,
  createDeliveryZone,
  updateDeliveryZone,
  updateDeliveryZoneFee,
  updateDeliveryZoneEstimatedDays,
  deleteDeliveryZone,
} from "../../services/delivery.service";

// Public
export const GetAllDeliveryZones = new Elysia().get("/zones", async () => {
  const result = await getAllDeliveryZones();
  return { success: true, data: result };
});

export const GetDeliveryZonesByCounty = new Elysia().get(
  "/zones/county/:county",
  async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getDeliveryZonesByCounty(params.county);

    if (result === "no_zones_found") {
      set.status = 404;
      return {
        success: false,
        message: "No delivery zones found for this county.",
      };
    }

    return { success: true, data: result };
  },
);

// Admin
export const CreateDeliveryZone = new Elysia().use(adminPlugin).post(
  "/admin/zones",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await createDeliveryZone(body);

    if (!result) {
      set.status = 500;
      return { success: false, message: "Failed to create delivery zone." };
    }

    set.status = 201;
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
);

export const UpdateDeliveryZone = new Elysia().use(adminPlugin).patch(
  "/admin/zones/:zoneId",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateDeliveryZone(params.zoneId, body);

    if (result === "delivery_zone_not_found") {
      set.status = 404;
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
);

export const UpdateDeliveryZoneFee = new Elysia().use(adminPlugin).patch(
  "/admin/zones/:zoneId/fee",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateDeliveryZoneFee(params.zoneId, body.baseFee);

    if (result === "delivery_zone_not_found") {
      set.status = 404;
      return { success: false, message: "Delivery zone not found." };
    }

    return { success: true, message: "Delivery fee updated." };
  },
  {
    body: t.Object({
      baseFee: t.String(),
    }),
  },
);

export const UpdateDeliveryZoneEstimatedDays = new Elysia()
  .use(adminPlugin)
  .patch(
    "/admin/zones/:zoneId/days",
    async (ctx) => {
      const { params, body, set } = ctx as any;
      const result = await updateDeliveryZoneEstimatedDays(
        params.zoneId,
        body.estimatedDays,
      );

      if (result === "delivery_zone_not_found") {
        set.status = 404;
        return { success: false, message: "Delivery zone not found." };
      }

      return { success: true, message: "Estimated days updated." };
    },
    {
      body: t.Object({
        estimatedDays: t.Number({ minimum: 1 }),
      }),
    },
  );

export const DeleteDeliveryZone = new Elysia()
  .use(adminPlugin)
  .delete("/admin/zones/:zoneId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteDeliveryZone(params.zoneId);

    if (result === "delivery_zone_not_found") {
      set.status = 404;
      return { success: false, message: "Delivery zone not found." };
    }

    return { success: true, message: "Delivery zone deleted." };
  });
