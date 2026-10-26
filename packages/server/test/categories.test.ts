import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createCategory,
  createUser,
  missingId,
  ok,
  RUN,
  Tracker,
  type TestUser,
} from "./helpers";

const t = new Tracker();
let admin: TestUser;
let buyer: TestUser;
let root: { id: string; slug: string };
let child: { id: string; slug: string };

beforeAll(async () => {
  admin = await createAdmin(t);
  buyer = await createUser(t);
  root = await createCategory(t, admin);
  child = await createCategory(t, admin, { parentId: root.id });
});
afterAll(() => t.cleanup());

describe("public category reads", () => {
  test("GET /categories lists root categories (no login needed)", async () => {
    const roots = ok<{ id: string; parentId: string | null }[]>(
      await api("GET", "/categories"),
    );
    expect(roots.map((c) => c.id)).toContain(root.id);
    expect(roots.map((c) => c.id)).not.toContain(child.id);
    expect(roots.every((c) => !c.parentId)).toBe(true);
  });

  test("GET /categories/sub/:parentId lists children", async () => {
    const subs = ok<{ id: string }[]>(
      await api("GET", `/categories/sub/${root.id}`),
    );
    expect(subs.map((c) => c.id)).toEqual([child.id]);
  });

  test("GET /categories/:slug returns one category", async () => {
    const cat = ok(await api("GET", `/categories/${root.slug}`));
    expect(cat.id).toBe(root.id);
  });

  test("GET /categories/:slug is 404 for unknown slugs", async () => {
    expect((await api("GET", `/categories/nope-${RUN}`)).status).toBe(404);
  });
});

describe("admin category management", () => {
  test("GET /categories/all includes children and is admin-only", async () => {
    const all = ok<{ id: string }[]>(
      await api("GET", "/categories/all", { token: admin.token }),
    );
    expect(all.map((c) => c.id)).toEqual(
      expect.arrayContaining([root.id, child.id]),
    );
    expect(
      (await api("GET", "/categories/all", { token: buyer.token })).status,
    ).toBe(403);
    expect((await api("GET", "/categories/all")).status).toBe(401);
  });

  test("POST /categories rejects a duplicate slug", async () => {
    const res = await api("POST", "/categories", {
      token: admin.token,
      body: { name: "Duplicate", slug: root.slug },
    });
    expect(res.status).toBe(409);
  });

  test("POST /categories validates the body", async () => {
    const res = await api("POST", "/categories", {
      token: admin.token,
      body: { name: "x", slug: "y" },
    });
    expect(res.status).toBe(400);
  });

  test("POST /categories is admin-only", async () => {
    const res = await api("POST", "/categories", {
      token: buyer.token,
      body: { name: "Sneaky", slug: `sneaky-${RUN}` },
    });
    expect(res.status).toBe(403);
  });

  test("PATCH /categories/:id renames it", async () => {
    const updated = ok(
      await api("PATCH", `/categories/${child.id}`, {
        token: admin.token,
        body: { name: "Renamed Child" },
      }),
    );
    expect(updated.name).toBe("Renamed Child");
  });

  test("PATCH /categories/:id rejects a slug already in use", async () => {
    const res = await api("PATCH", `/categories/${child.id}`, {
      token: admin.token,
      body: { slug: root.slug },
    });
    expect(res.status).toBe(409);
  });

  test("PATCH /categories/:id is 404 for an unknown id", async () => {
    const res = await api("PATCH", `/categories/${missingId()}`, {
      token: admin.token,
      body: { name: "Ghost" },
    });
    expect(res.status).toBe(404);
  });

  test("deactivate hides it from public lists; activate restores it", async () => {
    ok(
      await api("PATCH", `/categories/${child.id}/deactivate`, {
        token: admin.token,
      }),
    );
    let subs = ok<{ id: string }[]>(
      await api("GET", `/categories/sub/${root.id}`),
    );
    expect(subs.map((c) => c.id)).not.toContain(child.id);

    ok(
      await api("PATCH", `/categories/${child.id}/activate`, {
        token: admin.token,
      }),
    );
    subs = ok<{ id: string }[]>(await api("GET", `/categories/sub/${root.id}`));
    expect(subs.map((c) => c.id)).toContain(child.id);
  });

  test("DELETE /categories/:id removes an unused category", async () => {
    const temp = await createCategory(t, admin);
    ok(await api("DELETE", `/categories/${temp.id}`, { token: admin.token }));
    expect((await api("GET", `/categories/${temp.slug}`)).status).toBe(404);
  });

  test("DELETE /categories/:id is 404 for an unknown id", async () => {
    const res = await api("DELETE", `/categories/${missingId()}`, {
      token: admin.token,
    });
    expect(res.status).toBe(404);
  });
});
