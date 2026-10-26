import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
} from "../../services/user.service";
import { selfAddress } from "../../lib/views";

export const GetUserAddresses = new Elysia()
  .use(authPlugin)
  .get("/me/addresses", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getUserAddresses(userId);
    return { success: true, data: result.map(selfAddress) };
  });

export const AddAddress = new Elysia().use(authPlugin).post(
  "/me/addresses",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await addAddress(userId, body);

    if (!result) {
      set.status = 500;
      return { success: false, message: "Failed to add address." };
    }

    set.status = 201;
    return { success: true, data: selfAddress(result) };
  },
  {
    body: t.Object({
      label: t.String(),
      county: t.String(),
      town: t.String(),
      street: t.Optional(t.String()),
      latitude: t.Optional(t.String()),
      longitude: t.Optional(t.String()),
      isDefault: t.Optional(t.Boolean()),
    }),
  },
);

export const UpdateAddress = new Elysia().use(authPlugin).patch(
  "/me/addresses/:addressId",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateAddress(userId, params.addressId, body);

    if (result === "address_not_found") {
      set.status = 404;
      return { success: false, message: "Address not found." };
    }

    return { success: true, data: selfAddress(result) };
  },
  {
    body: t.Object({
      label: t.Optional(t.String()),
      county: t.Optional(t.String()),
      town: t.Optional(t.String()),
      street: t.Optional(t.String()),
      latitude: t.Optional(t.String()),
      longitude: t.Optional(t.String()),
      isDefault: t.Optional(t.Boolean()),
    }),
  },
);

export const SetDefaultAddress = new Elysia()
  .use(authPlugin)
  .patch("/me/addresses/:addressId/default", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await setDefaultAddress(userId, params.addressId);

    if (result === "address_not_found") {
      set.status = 404;
      return { success: false, message: "Address not found." };
    }

    return { success: true, data: selfAddress(result) };
  });

export const RemoveAddress = new Elysia()
  .use(authPlugin)
  .delete("/me/addresses/:addressId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await removeAddress(userId, params.addressId);

    if (!result) {
      set.status = 404;
      return { success: false, message: "Address not found." };
    }

    return { success: true, message: "Address removed successfully." };
  });
