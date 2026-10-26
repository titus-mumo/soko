import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createProduct,
  createSeller,
  createUser,
  missingId,
  ok,
  placePaidOrder,
  RUN,
  Tracker,
  type Market,
  type TestSeller,
} from "./helpers";

const t = new Tracker();
let m: Market;
let otherSeller: TestSeller;

beforeAll(async () => {
  m = await createMarket(t);
  otherSeller = await createSeller(t);
});
afterAll(() => t.cleanup());

describe("delivery zones (public)", () => {
  test("GET /delivery/zones lists zones without login", async () => {
    const zones = ok<{ id: string }[]>(await api("GET", "/delivery/zones"));
    expect(zones.map((z) => z.id)).toContain(m.zone.id);
  });

  test("GET /delivery/zones/county/:county finds the zone", async () => {
    const zones = ok<{ id: string }[]>(
      await api(
        "GET",
        `/delivery/zones/county/${encodeURIComponent(m.zone.county)}`,
      ),
    );
    expect(zones.map((z) => z.id)).toEqual([m.zone.id]);
  });

  test("GET /delivery/zones/county/:county is 404 for an uncovered county", async () => {
    expect(
      (await api("GET", `/delivery/zones/county/Nowhere${RUN}`)).status,
    ).toBe(404);
  });
});

describe("admin zones", () => {
  let zoneId: string;

  test("POST /delivery/admin/zones creates a zone", async () => {
    const zone = ok(
      await api("POST", "/delivery/admin/zones", {
        token: m.admin.token,
        body: {
          name: `Admin Zone ${RUN}`,
          county: `AdminCounty${RUN}`,
          estimatedDays: 3,
          baseFee: "300.00",
        },
      }),
      201,
    );
    zoneId = zone.id;
    t.zoneIds.add(zone.id);
  });

  test("PATCH /delivery/admin/zones/:id updates fields", async () => {
    ok(
      await api("PATCH", `/delivery/admin/zones/${zoneId}`, {
        token: m.admin.token,
        body: { name: `Renamed Zone ${RUN}` },
      }),
    );
    const zones = ok<{ id: string; name: string }[]>(
      await api("GET", "/delivery/zones"),
    );
    expect(zones.find((z) => z.id === zoneId)?.name).toBe(
      `Renamed Zone ${RUN}`,
    );
  });

  test("PATCH …/fee and …/days update the pricing", async () => {
    ok(
      await api("PATCH", `/delivery/admin/zones/${zoneId}/fee`, {
        token: m.admin.token,
        body: { baseFee: "350.00" },
      }),
    );
    ok(
      await api("PATCH", `/delivery/admin/zones/${zoneId}/days`, {
        token: m.admin.token,
        body: { estimatedDays: 5 },
      }),
    );
    const zone = ok<{ id: string; baseFee: string; estimatedDays: number }[]>(
      await api("GET", "/delivery/zones"),
    ).find((z) => z.id === zoneId)!;
    expect(zone.baseFee).toBe("350.00");
    expect(zone.estimatedDays).toBe(5);
  });

  test("404s for unknown zones", async () => {
    const id = missingId();
    for (const [method, path, body] of [
      ["PATCH", `/delivery/admin/zones/${id}`, { name: "Ghost Zone" }],
      ["PATCH", `/delivery/admin/zones/${id}/fee`, { baseFee: "1.00" }],
      ["PATCH", `/delivery/admin/zones/${id}/days`, { estimatedDays: 1 }],
      ["DELETE", `/delivery/admin/zones/${id}`],
    ] as [string, string, unknown?][]) {
      expect(
        (await api(method, path, { token: m.admin.token, body })).status,
      ).toBe(404);
    }
  });

  test("DELETE /delivery/admin/zones/:id removes it", async () => {
    ok(
      await api("DELETE", `/delivery/admin/zones/${zoneId}`, {
        token: m.admin.token,
      }),
    );
    const zones = ok<{ id: string }[]>(await api("GET", "/delivery/zones"));
    expect(zones.map((z) => z.id)).not.toContain(zoneId);
  });

  test("zone management is admin-only", async () => {
    const res = await api("POST", "/delivery/admin/zones", {
      token: m.seller.token,
      body: {
        name: "Nope Zone",
        county: "Nope",
        estimatedDays: 1,
        baseFee: "1.00",
      },
    });
    expect(res.status).toBe(403);
  });
});

describe("hub fulfilment", () => {
  type Note = { type: string; title: string; body: string };
  type Item = { id: string; status: string; productVariantId: string };
  const notes = async (token: string) =>
    ok<Note[]>(await api("GET", "/notifications/me", { token }));
  const order = async (orderId: string) =>
    ok<{ order: { status: string }; items: Item[] }>(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
  const setItem = (token: string, itemId: string, status: string) =>
    api("PATCH", `/orders/seller/items/${itemId}/status`, {
      token,
      body: { status },
    });
  const admin = () => m.admin.token;

  let orderId: string;
  let itemId: string;
  let shipmentId: string;
  const trackingNumber = `TRK-${RUN}`;

  beforeAll(async () => {
    ({ orderId, orderItemId: itemId } = await placePaidOrder(m));
  });

  test("payment confirms the items and tells the seller once where to drop off", async () => {
    expect((await order(orderId)).items[0].status).toBe("confirmed");
    const ref = orderId.slice(-8).toUpperCase();
    const forOrder = (await notes(m.seller.token)).filter(
      (n) => n.type === "seller_new_order" && n.body.includes(ref),
    );
    expect(forOrder).toHaveLength(1);
    expect(forOrder[0].body).toContain("Nairobi CBD");
  });

  test("seller packs and drops off without notifying the buyer", async () => {
    const before = (await notes(m.buyer.token)).length;
    ok(await setItem(m.seller.token, itemId, "processing"));
    ok(await setItem(m.seller.token, itemId, "dropped_off"));
    expect((await notes(m.buyer.token)).length).toBe(before);
    const o = await order(orderId);
    expect(o.items[0].status).toBe("dropped_off");
    expect(o.order.status).toBe("processing");
  });

  test("sellers can't move backwards or do the hub's steps", async () => {
    expect((await setItem(m.seller.token, itemId, "processing")).status).toBe(
      400,
    );
    for (const s of ["at_hub", "shipped", "delivered"])
      expect((await setItem(m.seller.token, itemId, s)).status).toBe(400);
  });

  test("another store can't touch my item", async () => {
    expect((await setItem(otherSeller.token, itemId, "cancelled")).status).toBe(
      404,
    );
  });

  test("the order can't ship before its items reach the hub", async () => {
    const res = await api(
      "POST",
      `/delivery/admin/orders/${orderId}/shipment`,
      { token: admin(), body: { courier: "sendy" } },
    );
    expect(res.status).toBe(400);
  });

  test("the hub lists the order, with store names for staff", async () => {
    const hub = ok<
      {
        order: { id: string };
        items: { storeName: string }[];
        readyToShip: boolean;
      }[]
    >(await api("GET", "/orders/admin/hub", { token: admin() }));
    const entry = hub.find((h) => h.order.id === orderId);
    expect(entry).toBeDefined();
    expect(entry!.items[0].storeName).toBeTruthy();
    expect(entry!.readyToShip).toBe(false);
  });

  test("the hub receives the item", async () => {
    ok(
      await api("PATCH", `/orders/admin/items/${itemId}/received`, {
        token: admin(),
      }),
    );
    expect((await order(orderId)).items[0].status).toBe("at_hub");
  });

  test("before shipping, the buyer's shipment is null", async () => {
    const s = await api("GET", `/delivery/me/orders/${orderId}/shipment`, {
      token: m.buyer.token,
    });
    expect(s.status).toBe(200);
    expect(s.body.data).toBeNull();
  });

  test("the hub ships the whole order once", async () => {
    const s = ok<{ id: string; status: string; orderId: string }>(
      await api("POST", `/delivery/admin/orders/${orderId}/shipment`, {
        token: admin(),
        body: { courier: "sendy", trackingNumber },
      }),
      201,
    );
    shipmentId = s.id;
    expect(s.orderId).toBe(orderId);
    expect(s.status).toBe("awaiting_pickup");
    const again = await api(
      "POST",
      `/delivery/admin/orders/${orderId}/shipment`,
      { token: admin(), body: { courier: "self" } },
    );
    expect(again.status).toBe(409);
  });

  test("GET /delivery/track/:trackingNumber is public", async () => {
    const timeline = ok(await api("GET", `/delivery/track/${trackingNumber}`));
    expect(timeline.shipment.id).toBe(shipmentId);
  });

  test("GET /delivery/track/:trackingNumber is 404 when unknown", async () => {
    expect((await api("GET", `/delivery/track/NOPE-${RUN}`)).status).toBe(404);
  });

  test("in transit: items and order are shipped; the buyer hears once", async () => {
    const before = (await notes(m.buyer.token)).length;
    ok(
      await api("PATCH", `/delivery/admin/shipments/${shipmentId}/status`, {
        token: admin(),
        body: { status: "in_transit" },
      }),
    );
    const o = await order(orderId);
    expect(o.order.status).toBe("shipped");
    expect(o.items[0].status).toBe("shipped");
    const after = await notes(m.buyer.token);
    expect(after.length).toBe(before + 1);
    expect(after.some((n) => n.title === "Your order has shipped")).toBe(true);
  });

  test("delivered: items and order are delivered", async () => {
    ok(
      await api("PATCH", `/delivery/admin/shipments/${shipmentId}/status`, {
        token: admin(),
        body: { status: "delivered", location: "Westlands" },
      }),
    );
    const o = await order(orderId);
    expect(o.order.status).toBe("delivered");
    expect(o.items[0].status).toBe("delivered");
  });

  test("the buyer sees the shipment and its timeline", async () => {
    const tl = ok(
      await api("GET", `/delivery/me/orders/${orderId}/shipment`, {
        token: m.buyer.token,
      }),
    );
    expect(tl.shipment.id).toBe(shipmentId);
    expect(tl.events.map((e: { status: string }) => e.status)).toEqual(
      expect.arrayContaining(["awaiting_pickup", "in_transit", "delivered"]),
    );
  });

  test("other buyers can't see it", async () => {
    const stranger = await createUser(t);
    const res = await api("GET", `/delivery/me/orders/${orderId}/shipment`, {
      token: stranger.token,
    });
    expect(res.status).toBe(404);
  });

  test("POST …/events bulk-inserts courier events", async () => {
    ok(
      await api("POST", `/delivery/admin/shipments/${shipmentId}/events`, {
        token: admin(),
        body: { events: [{ status: "in_transit", location: "Thika Road" }] },
      }),
      201,
    );
  });

  test("shipment writes 404 for unknown shipments", async () => {
    const id = missingId();
    const writes: [string, object][] = [
      [`/delivery/admin/shipments/${id}/status`, { status: "in_transit" }],
      [
        `/delivery/admin/shipments/${id}/tracking`,
        { courier: "self", trackingNumber: "X" },
      ],
    ];
    for (const [path, body] of writes)
      expect((await api("PATCH", path, { token: admin(), body })).status).toBe(
        404,
      );
  });

  test("shipping and receiving are hub-only", async () => {
    const ship = await api(
      "POST",
      `/delivery/admin/orders/${orderId}/shipment`,
      { token: m.seller.token, body: { courier: "self" } },
    );
    expect(ship.status).toBe(403);
    const receive = await api(
      "PATCH",
      `/orders/admin/items/${itemId}/received`,
      { token: m.seller.token },
    );
    expect(receive.status).toBe(403);
    // The old seller shipment endpoint is gone.
    const old = await api("POST", "/delivery/seller/shipments", {
      token: m.seller.token,
      body: { orderItemId: itemId, courier: "self" },
    });
    expect(old.status).toBe(404);
  });

  test("one store cancels its item: buyer told once, the rest still ships", async () => {
    // An order with items from two stores.
    const second = await createProduct(otherSeller, m.category.id, {
      stock: 5,
    });
    ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: second.variantId, quantity: 1 },
      }),
      201,
    );
    const placed = await placePaidOrder(m);
    const items = (await order(placed.orderId)).items;
    expect(items).toHaveLength(2);
    // Buyers don't see stores; tell the lines apart by product.
    const theirs = items.find((i) => i.productVariantId === second.variantId)!;
    const mine = items.find((i) => i.productVariantId !== second.variantId)!;

    const before = (await notes(m.buyer.token)).filter(
      (n) => n.type === "order_item_cancelled",
    ).length;
    ok(await setItem(otherSeller.token, theirs.id, "cancelled"));
    const after = (await notes(m.buyer.token)).filter(
      (n) => n.type === "order_item_cancelled",
    ).length;
    expect(after).toBe(before + 1);
    expect((await order(placed.orderId)).order.status).not.toBe("cancelled");

    ok(
      await api("PATCH", `/orders/admin/items/${mine.id}/received`, {
        token: admin(),
      }),
    );
    const hub = ok<{ order: { id: string }; readyToShip: boolean }[]>(
      await api("GET", "/orders/admin/hub", { token: admin() }),
    );
    expect(hub.find((h) => h.order.id === placed.orderId)?.readyToShip).toBe(
      true,
    );
    ok(
      await api("POST", `/delivery/admin/orders/${placed.orderId}/shipment`, {
        token: admin(),
        body: { courier: "self" },
      }),
      201,
    );
  });

  test("an order whose every item is cancelled becomes cancelled", async () => {
    const placed = await placePaidOrder(m);
    ok(await setItem(m.seller.token, placed.orderItemId, "cancelled"));
    expect((await order(placed.orderId)).order.status).toBe("cancelled");
    const types = (await notes(m.buyer.token)).map((n) => n.type);
    expect(types).toContain("order_cancelled");
  });
});
