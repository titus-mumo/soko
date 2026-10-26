import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createUser,
  missingId,
  ok,
  placeOrder,
  Tracker,
  type Market,
} from "./helpers";

const t = new Tracker();
let m: Market;

/** An order the buyer can dispute (confirmed). */
async function disputableOrder() {
  const { orderId } = await placeOrder(m);
  ok(
    await api("PATCH", `/orders/admin/${orderId}/status`, {
      token: m.admin.token,
      body: { status: "confirmed" },
    }),
  );
  return orderId;
}

async function raise(orderId: string) {
  ok(
    await api("POST", "/disputes/me", {
      token: m.buyer.token,
      body: {
        orderId,
        reason: "Item not as described",
        description: "Wrong colour",
      },
    }),
    201,
  );
  const list = ok<{ id: string; orderId: string }[]>(
    await api("GET", `/disputes/me/order/${orderId}`, { token: m.buyer.token }),
  );
  return list[0].id;
}

beforeAll(async () => {
  m = await createMarket(t);
});
afterAll(() => t.cleanup());

describe("buyer disputes", () => {
  test("POST /disputes/me raises a dispute on a confirmed order", async () => {
    const orderId = await disputableOrder();
    const id = await raise(orderId);
    const mine = ok<{ id: string; status: string }[]>(
      await api("GET", "/disputes/me", { token: m.buyer.token }),
    );
    expect(mine.find((d) => d.id === id)?.status).toBe("open");
  });

  test("400 for a pending order", async () => {
    const { orderId } = await placeOrder(m);
    const res = await api("POST", "/disputes/me", {
      token: m.buyer.token,
      body: { orderId, reason: "Too slow" },
    });
    expect(res.status).toBe(400);
  });

  test("404 for someone else's order", async () => {
    const orderId = await disputableOrder();
    const other = await createUser(t);
    const res = await api("POST", "/disputes/me", {
      token: other.token,
      body: { orderId, reason: "Not mine" },
    });
    expect(res.status).toBe(404);
  });

  test("400 for a reason under 5 characters", async () => {
    const orderId = await disputableOrder();
    const res = await api("POST", "/disputes/me", {
      token: m.buyer.token,
      body: { orderId, reason: "bad" },
    });
    expect(res.status).toBe(400);
  });

  test("GET /disputes/me/order/:id is 404 for another buyer", async () => {
    const orderId = await disputableOrder();
    const other = await createUser(t);
    expect(
      (
        await api("GET", `/disputes/me/order/${orderId}`, {
          token: other.token,
        })
      ).status,
    ).toBe(404);
  });
});

describe("admin dispute workflow", () => {
  // By design the service closes a dispute as soon as it's resolved, keeping
  // the resolution text — so it ends up under "closed", not "resolved".
  test("open → under review → resolved (then auto-closed), notifying the buyer", async () => {
    const id = await raise(await disputableOrder());

    const open = ok<{ id: string }[]>(
      await api("GET", "/disputes/admin/status/open", { token: m.admin.token }),
    );
    expect(open.map((d) => d.id)).toContain(id);

    ok(
      await api("PATCH", `/disputes/admin/${id}/review`, {
        token: m.admin.token,
      }),
    );
    ok(
      await api("PATCH", `/disputes/admin/${id}/resolve`, {
        token: m.admin.token,
        body: { resolution: "Full refund issued to M-Pesa." },
      }),
    );

    const closed = ok<
      { id: string; resolution: string; resolvedAt: string | null }[]
    >(
      await api("GET", "/disputes/admin/status/closed", {
        token: m.admin.token,
      }),
    );
    const dispute = closed.find((d) => d.id === id);
    expect(dispute?.resolution).toBe("Full refund issued to M-Pesa.");
    expect(dispute?.resolvedAt).toBeTruthy();

    const notes = ok<{ type: string }[]>(
      await api("GET", "/notifications/me", { token: m.buyer.token }),
    );
    const types = notes.map((n) => n.type);
    expect(types).toContain("dispute_update"); // moved under review
    expect(types).toContain("dispute_resolved");
  });

  test("PATCH /disputes/admin/:id/close closes it", async () => {
    const id = await raise(await disputableOrder());
    ok(
      await api("PATCH", `/disputes/admin/${id}/close`, {
        token: m.admin.token,
      }),
    );
    const closed = ok<{ id: string }[]>(
      await api("GET", "/disputes/admin/status/closed", {
        token: m.admin.token,
      }),
    );
    expect(closed.map((d) => d.id)).toContain(id);
  });

  test("resolve needs a 10+ character resolution", async () => {
    const id = await raise(await disputableOrder());
    const res = await api("PATCH", `/disputes/admin/${id}/resolve`, {
      token: m.admin.token,
      body: { resolution: "ok" },
    });
    expect(res.status).toBe(400);
  });

  test("404 for unknown disputes", async () => {
    const id = missingId();
    expect(
      (
        await api("PATCH", `/disputes/admin/${id}/review`, {
          token: m.admin.token,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await api("PATCH", `/disputes/admin/${id}/close`, {
          token: m.admin.token,
        })
      ).status,
    ).toBe(404);
  });

  test("admin dispute routes are admin-only", async () => {
    expect(
      (
        await api("GET", "/disputes/admin/status/open", {
          token: m.buyer.token,
        })
      ).status,
    ).toBe(403);
  });
});
