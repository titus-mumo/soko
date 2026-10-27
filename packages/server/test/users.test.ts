import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createUser,
  login,
  missingId,
  ok,
  PASSWORD,
  testPhone,
  Tracker,
  type TestUser,
} from "./helpers";

const t = new Tracker();
let admin: TestUser;
let user: TestUser;

beforeAll(async () => {
  admin = await createAdmin(t);
  user = await createUser(t);
});
afterAll(() => t.cleanup());

describe("GET /users/me", () => {
  test("returns the signed-in user without the password hash", async () => {
    const me = ok(await api("GET", "/users/me", { token: user.token }));
    expect(me.id).toBe(user.id);
    expect(me.email).toBe(user.email);
    expect(me.passwordHash).toBeUndefined();
  });

  test("401 without a token", async () => {
    expect((await api("GET", "/users/me")).status).toBe(401);
  });

  test("401 with a forged token", async () => {
    expect((await api("GET", "/users/me", { token: "not.a.jwt" })).status).toBe(
      401,
    );
  });
});

describe("PATCH /users/me", () => {
  test("updates name and photo", async () => {
    const updated = ok(
      await api("PATCH", "/users/me", {
        token: user.token,
        body: {
          name: "Renamed Tester",
          profilePhoto: "https://picsum.photos/1",
        },
      }),
    );
    expect(updated.name).toBe("Renamed Tester");
    expect(updated.profilePhoto).toBe("https://picsum.photos/1");
  });

  test("409 when the email belongs to someone else", async () => {
    const res = await api("PATCH", "/users/me", {
      token: user.token,
      body: { email: admin.email },
    });
    expect(res.status).toBe(409);
  });

  test("409 when the phone belongs to someone else", async () => {
    const res = await api("PATCH", "/users/me", {
      token: user.token,
      body: { phone: admin.phone },
    });
    expect(res.status).toBe(409);
  });

  test("400 on an invalid email", async () => {
    const res = await api("PATCH", "/users/me", {
      token: user.token,
      body: { email: "nope" },
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /users/me/password", () => {
  test("changes the password; the old one stops working", async () => {
    const u = await createUser(t);
    const res = await api("PATCH", "/users/me/password", {
      token: u.token,
      body: { currentPassword: PASSWORD, newPassword: "N3wPassword!" },
    });
    expect(res.status).toBe(200);
    expect(
      (
        await api("POST", "/auth/login", {
          body: { email: u.email, password: PASSWORD },
        })
      ).status,
    ).toBe(401);
    expect((await login(u.email, "N3wPassword!")).accessToken).toBeTruthy();
  });

  test("401 when the current password is wrong", async () => {
    const res = await api("PATCH", "/users/me/password", {
      token: user.token,
      body: { currentPassword: "Wrong-pass1", newPassword: "N3wPassword!" },
    });
    expect(res.status).toBe(401);
  });
});

describe("addresses", () => {
  let first: { id: string };
  let second: { id: string };

  test("POST /users/me/addresses creates addresses", async () => {
    first = ok(
      await api("POST", "/users/me/addresses", {
        token: user.token,
        body: {
          label: "home",
          county: "Nairobi",
          town: "Westlands",
          isDefault: true,
        },
      }),
      201,
    );
    second = ok(
      await api("POST", "/users/me/addresses", {
        token: user.token,
        body: {
          label: "work",
          county: "Kiambu",
          town: "Thika",
          street: "Kenyatta Hwy",
        },
      }),
      201,
    );
    expect(first.id).toBeTruthy();
  });

  test("GET /users/me/addresses lists only my addresses", async () => {
    const list = ok<{ id: string }[]>(
      await api("GET", "/users/me/addresses", { token: user.token }),
    );
    expect(list.map((a) => a.id).sort()).toEqual([first.id, second.id].sort());
    const other = ok<unknown[]>(
      await api("GET", "/users/me/addresses", { token: admin.token }),
    );
    expect(other).toHaveLength(0);
  });

  test("PATCH /users/me/addresses/:id updates fields", async () => {
    const updated = ok(
      await api("PATCH", `/users/me/addresses/${second.id}`, {
        token: user.token,
        body: { town: "Ruiru" },
      }),
    );
    expect(updated.town).toBe("Ruiru");
  });

  test("PATCH /users/me/addresses/:id/default moves the default", async () => {
    ok(
      await api("PATCH", `/users/me/addresses/${second.id}/default`, {
        token: user.token,
      }),
    );
    const list = ok<{ id: string; isDefault: boolean }[]>(
      await api("GET", "/users/me/addresses", { token: user.token }),
    );
    const defaults = list.filter((a) => a.isDefault).map((a) => a.id);
    expect(defaults).toEqual([second.id]);
  });

  test("other users can't modify my address (404)", async () => {
    const res = await api("PATCH", `/users/me/addresses/${first.id}`, {
      token: admin.token,
      body: { town: "Hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /users/me/addresses/:id removes it", async () => {
    ok(
      await api("DELETE", `/users/me/addresses/${first.id}`, {
        token: user.token,
      }),
    );
    const list = ok<{ id: string }[]>(
      await api("GET", "/users/me/addresses", { token: user.token }),
    );
    expect(list.map((a) => a.id)).toEqual([second.id]);
  });

  test("DELETE of a missing address is 404", async () => {
    const res = await api("DELETE", `/users/me/addresses/${missingId()}`, {
      token: user.token,
    });
    expect(res.status).toBe(404);
  });
});

describe("admin: users", () => {
  test("GET /users/admin lists users", async () => {
    const list = ok<{ id: string }[]>(
      await api("GET", "/users/admin", { token: admin.token }),
    );
    expect(list.map((u) => u.id)).toContain(user.id);
  });

  test("GET /users/admin is admin-only", async () => {
    expect(
      (await api("GET", "/users/admin", { token: user.token })).status,
    ).toBe(403);
    expect((await api("GET", "/users/admin")).status).toBe(401);
  });

  test("GET /users/admin/:id returns one user", async () => {
    const u = ok(
      await api("GET", `/users/admin/${user.id}`, { token: admin.token }),
    );
    expect(u.id).toBe(user.id);
  });

  test("GET /users/admin/:id is 404 for an unknown id", async () => {
    const res = await api("GET", `/users/admin/${missingId()}`, {
      token: admin.token,
    });
    expect(res.status).toBe(404);
  });

  test("PATCH /users/admin/:id/role changes the role", async () => {
    const u = await createUser(t);
    ok(
      await api("PATCH", `/users/admin/${u.id}/role`, {
        token: admin.token,
        body: { role: "admin" },
      }),
    );
    expect((await login(u.email)).user.role).toBe("admin");
  });

  test("PATCH /users/admin/:id/role can't create sellers", async () => {
    const u = await createUser(t);
    const res = await api("PATCH", `/users/admin/${u.id}/role`, {
      token: admin.token,
      body: { role: "seller" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /users/admin/:id/role rejects unknown roles", async () => {
    const res = await api("PATCH", `/users/admin/${user.id}/role`, {
      token: admin.token,
      body: { role: "superuser" },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /users/admin/:id/verify verifies the user", async () => {
    ok(
      await api("PATCH", `/users/admin/${user.id}/verify`, {
        token: admin.token,
      }),
    );
    const u = ok(
      await api("GET", `/users/admin/${user.id}`, { token: admin.token }),
    );
    expect(u.isVerified).toBe(true);
  });

  test("DELETE /users/admin/:id removes the user", async () => {
    const u = await createUser(t);
    ok(await api("DELETE", `/users/admin/${u.id}`, { token: admin.token }));
    const res = await api("GET", `/users/admin/${u.id}`, {
      token: admin.token,
    });
    expect(res.status).toBe(404);
  });

  test("admin routes reject non-admins", async () => {
    const paths: [string, string, unknown?][] = [
      ["GET", `/users/admin/${user.id}`],
      ["PATCH", `/users/admin/${user.id}/role`, { role: "admin" }],
      ["PATCH", `/users/admin/${user.id}/verify`],
      ["DELETE", `/users/admin/${admin.id}`],
    ];
    for (const [method, path, body] of paths) {
      const res = await api(method, path, { token: user.token, body });
      expect(res.status).toBe(403);
    }
  });
});

test("phone numbers are unique per user", async () => {
  const phone = testPhone();
  const a = await createUser(t);
  ok(await api("PATCH", "/users/me", { token: a.token, body: { phone } }));
  const b = await createUser(t);
  expect(
    (await api("PATCH", "/users/me", { token: b.token, body: { phone } }))
      .status,
  ).toBe(409);
});
