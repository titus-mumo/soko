import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import App from "../src/app";
import { sniffImage, storageConfigured } from "../src/lib/storage";
import { createAdmin, createUser, Tracker, type TestUser } from "./helpers";

// A real 1×1 PNG.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhgGAWr8ROAAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

const t = new Tracker();
let admin: TestUser;
let buyer: TestUser;
const uploaded: string[] = [];

beforeAll(async () => {
  admin = await createAdmin(t);
  buyer = await createUser(t);
});
afterAll(async () => {
  // Remove what this file stored.
  const url = Bun.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  const prefixes = uploaded.map((u) => u.split("/public/product-images/")[1]);
  if (url && key && prefixes.length)
    await fetch(`${url}/storage/v1/object/product-images`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes }),
    });
  await t.cleanup();
});

function upload(
  token: string | undefined,
  files: { name: string; bytes: Uint8Array; type: string }[],
) {
  const form = new FormData();
  for (const f of files)
    form.append(
      "files",
      new File([f.bytes as Uint8Array<ArrayBuffer>], f.name, { type: f.type }),
    );
  return App.handle(
    new Request("http://localhost/uploads/admin/product-images", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    }),
  );
}

describe("image sniffing", () => {
  test("recognises formats by content, not name", () => {
    expect(sniffImage(PNG)?.type).toBe("image/png");
    expect(
      sniffImage(new TextEncoder().encode("hello, not an image")),
    ).toBeNull();
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe(
      "jpg",
    );
  });
});

describe.skipIf(!storageConfigured())(
  "POST /uploads/admin/product-images",
  () => {
    test("stores photos and returns public URLs that serve them", async () => {
      const res = await upload(admin.token, [
        { name: "a.png", bytes: PNG, type: "image/png" },
        { name: "b.png", bytes: PNG, type: "image/png" },
      ]);
      expect(res.status).toBe(201);
      const { data } = (await res.json()) as { data: { urls: string[] } };
      expect(data.urls).toHaveLength(2);
      uploaded.push(...data.urls);
      const served = await fetch(data.urls[0]);
      expect(served.status).toBe(200);
      expect(served.headers.get("content-type")).toContain("image/png");
    });

    test("rejects a non-image renamed to .png", async () => {
      const res = await upload(admin.token, [
        {
          name: "evil.png",
          bytes: new TextEncoder().encode("<script>alert(1)</script>"),
          type: "image/png",
        },
      ]);
      expect(res.status).toBe(415);
    });

    test("rejects files over 5 MB", async () => {
      const big = new Uint8Array(5 * 1024 * 1024 + 1);
      big.set(PNG.subarray(0, 8));
      const res = await upload(admin.token, [
        { name: "big.png", bytes: big, type: "image/png" },
      ]);
      expect(res.status).toBe(413);
    });

    test("is admin-only", async () => {
      const png = [{ name: "a.png", bytes: PNG, type: "image/png" }];
      expect((await upload(buyer.token, png)).status).toBe(403);
      expect((await upload(undefined, png)).status).toBe(401);
    });
  },
);
