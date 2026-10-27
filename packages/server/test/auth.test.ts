import { afterAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
import {
  api,
  createUser,
  login,
  ok,
  PASSWORD,
  RUN,
  testPhone,
  Tracker,
} from "./helpers";
import { UserRepository } from "db-operations";
import { GOOGLE_GOOD_CODE, UNREACHABLE_PHONE_SUFFIX, VALID_OTP } from "./setup";

const t = new Tracker();
afterAll(() => t.cleanup());

describe("health", () => {
  test("GET / responds", async () => {
    const res = await api("GET", "/");
    expect(res.status).toBe(200);
    expect(res.body).toBe("soko server is running!");
  });

  test("GET /test-auth is gone (it echoed credentials)", async () => {
    const res = await api("GET", "/test-auth", { token: "abc" });
    expect(res.status).toBe(404);
  });
});

describe("POST /auth/register", () => {
  test("creates a buyer, returns a token and sets the refresh cookie", async () => {
    const email = `reg.${RUN}@test.soko.local`;
    const res = await api("POST", "/auth/register", {
      body: {
        name: "Reg Tester",
        email,
        phone: testPhone(),
        password: PASSWORD,
      },
    });
    const data = ok(res, 201);
    t.userIds.add(data.user.id);
    expect(data.user.email).toBe(email);
    expect(data.user.role).toBe("buyer");
    expect(data.user.passwordHash).toBeUndefined();
    expect(typeof data.accessToken).toBe("string");
    expect(res.refreshCookie).toStartWith("soko_refresh=");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  test("rejects a duplicate email with 409", async () => {
    const user = await createUser(t);
    const res = await api("POST", "/auth/register", {
      body: {
        name: "Dup",
        email: user.email,
        phone: testPhone(),
        password: PASSWORD,
      },
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  test("rejects a duplicate phone with 409", async () => {
    const user = await createUser(t);
    const res = await api("POST", "/auth/register", {
      body: {
        name: "Dup",
        email: `dup.${RUN}@test.soko.local`,
        phone: user.phone,
        password: PASSWORD,
      },
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/phone/i);
  });

  test("validates the body", async () => {
    const res = await api("POST", "/auth/register", {
      body: { name: "X", email: "not-an-email", phone: "1", password: "short" },
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  test("signs in with the right password", async () => {
    const user = await createUser(t);
    const res = await api("POST", "/auth/login", {
      body: { email: user.email, password: PASSWORD },
    });
    const data = ok(res);
    expect(data.user.id).toBe(user.id);
    expect(res.refreshCookie).toBeTruthy();
  });

  test("401 on a wrong password", async () => {
    const user = await createUser(t);
    const res = await api("POST", "/auth/login", {
      body: { email: user.email, password: "Wrong-pass1" },
    });
    expect(res.status).toBe(401);
  });

  test("404 for an unknown email", async () => {
    const res = await api("POST", "/auth/login", {
      body: { email: `nobody.${RUN}@test.soko.local`, password: PASSWORD },
    });
    expect(res.status).toBe(404);
  });
});

describe("OTP", () => {
  // OTP signs in existing accounts only; sign-up is /auth/register or Google.

  test("POST /auth/otp/request sends a code to a registered number", async () => {
    const user = await createUser(t, "otp");
    const res = await api("POST", "/auth/otp/request", {
      body: { phone: user.phone },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /auth/otp/request refuses an unregistered number", async () => {
    // The mock's sendOtp would succeed for this number, so a 404 proves no
    // SMS was attempted.
    const res = await api("POST", "/auth/otp/request", {
      body: { phone: testPhone() },
    });
    expect(res.status).toBe(404);
  });

  test("POST /auth/otp/request reports a delivery failure with 500", async () => {
    const user = await createUser(
      t,
      "otp",
      `+25471${UNREACHABLE_PHONE_SUFFIX}`,
    );
    const res = await api("POST", "/auth/otp/request", {
      body: { phone: user.phone },
    });
    expect(res.status).toBe(500);
  });

  test("POST /auth/otp/verify rejects a wrong code", async () => {
    const user = await createUser(t, "otp");
    const res = await api("POST", "/auth/otp/verify", {
      body: { phone: user.phone, code: "000000" },
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/otp/verify refuses an unregistered number without creating an account", async () => {
    const phone = testPhone();
    const res = await api("POST", "/auth/otp/verify", {
      body: { phone, code: VALID_OTP },
    });
    expect(res.status).toBe(404);
    // Still unknown afterwards: nothing was created.
    const again = await api("POST", "/auth/otp/request", { body: { phone } });
    expect(again.status).toBe(404);
  });

  test("POST /auth/register stores the phone in +254 form", async () => {
    const local = testPhone().replace("+254", "0");
    const user = await createUser(t, "otp", local);
    const me = ok<{ phone: string }>(
      await api("GET", "/users/me", { token: user.token }),
    );
    expect(me.phone).toBe(local.replace(/^0/, "+254"));
  });

  test("POST /auth/otp/* finds an account saved as 07… when given +254…", async () => {
    // Accounts saved before numbers were normalized hold whatever was typed.
    const user = await createUser(t, "otp");
    const local = user.phone.replace("+254", "0");
    await new UserRepository().updateUser(user.id, { phone: local });

    const req = await api("POST", "/auth/otp/request", {
      body: { phone: user.phone },
    });
    expect(req.status).toBe(200);
    const data = ok<{ user: { id: string } }>(
      await api("POST", "/auth/otp/verify", {
        body: { phone: user.phone, code: VALID_OTP },
      }),
    );
    expect(data.user.id).toBe(user.id);
  });

  test("POST /auth/otp/request accepts 07… and 254… forms", async () => {
    const user = await createUser(t, "otp");
    for (const phone of [
      user.phone.replace("+254", "0"),
      user.phone.replace("+", ""),
    ]) {
      const res = await api("POST", "/auth/otp/request", { body: { phone } });
      expect(res.status).toBe(200);
    }
  });

  test("POST /auth/otp/verify signs in the existing account", async () => {
    const user = await createUser(t, "otp");
    const data = ok<{ user: { id: string }; accessToken: string }>(
      await api("POST", "/auth/otp/verify", {
        body: { phone: user.phone, code: VALID_OTP },
      }),
    );
    expect(data.user.id).toBe(user.id);
    expect(data.accessToken).toBeTruthy();
  });
});

describe("Google OAuth", () => {
  test("GET /auth/google redirects to Google", async () => {
    const res = await api("GET", "/auth/google");
    expect([301, 302, 303, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("accounts.google.com");
  });

  test("GET /auth/google/callback signs in with a valid code", async () => {
    const res = await api(
      "GET",
      `/auth/google/callback?code=${GOOGLE_GOOD_CODE}`,
    );
    const data = ok(res);
    t.userIds.add(data.user.id);
    expect(data.user.email).toBe(`google.${RUN}@test.soko.local`);
    expect(data.accessToken).toBeTruthy();
  });

  test("GET /auth/google/callback fails with a bad code", async () => {
    const res = await api("GET", "/auth/google/callback?code=bad");
    expect(res.status).toBe(401);
  });

  test("GET /auth/google/callback handles a cancelled consent", async () => {
    const res = await api("GET", "/auth/google/callback?error=access_denied");
    expect(res.status).toBe(400);
  });
});

describe("sessions", () => {
  test("POST /auth/refresh issues a new access token from the cookie", async () => {
    const user = await createUser(t);
    const res = await api("POST", "/auth/refresh", {
      cookie: user.refreshCookie,
    });
    const data = ok(res);
    expect(typeof data.accessToken).toBe("string");
    const me = await api("GET", "/users/me", { token: data.accessToken });
    expect(me.status).toBe(200);
  });

  test("the refresh cookie reaches /auth/* (refresh and logout) and is HTTP-only", async () => {
    const res = await api("POST", "/auth/login", {
      body: { email: (await createUser(t)).email, password: PASSWORD },
    });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("soko_refresh=");
    expect(cookie).toContain("Path=/auth");
    expect(cookie).not.toContain("Path=/auth/refresh");
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  test("a reload mid-refresh doesn't log the user out (rotation grace)", async () => {
    const user = await createUser(t);
    // The first refresh rotates the token, but its response "never arrives"…
    ok(await api("POST", "/auth/refresh", { cookie: user.refreshCookie }));
    // …so the next page load sends the old cookie again: still signed in.
    const again = await api("POST", "/auth/refresh", {
      cookie: user.refreshCookie,
    });
    expect(again.status).toBe(200);
    expect(again.refreshCookie).toBeTruthy();
  });

  test("reusing an old refresh token (after the grace period) ends the session", async () => {
    const user = await createUser(t);
    const next = await api("POST", "/auth/refresh", {
      cookie: user.refreshCookie,
    });
    // Age the rotated token past the grace period.
    const token = decodeURIComponent(user.refreshCookie.split("=")[1]!);
    const sql = postgres(Bun.env.DB_URL!, { max: 1, prepare: false });
    await sql`update refresh_tokens set updated_at = now() - interval '5 minutes' where token = ${token}`;
    await sql.end();

    expect(
      (await api("POST", "/auth/refresh", { cookie: user.refreshCookie }))
        .status,
    ).toBe(401);
    // Possible theft: the newer token in that session is revoked too.
    expect(
      (await api("POST", "/auth/refresh", { cookie: next.refreshCookie! }))
        .status,
    ).toBe(401);
  });

  test("POST /auth/refresh rejects a missing cookie", async () => {
    const res = await api("POST", "/auth/refresh");
    expect(res.status).toBe(401);
  });

  test("POST /auth/logout revokes the refresh token", async () => {
    const user = await createUser(t);
    const out = await api("POST", "/auth/logout", {
      cookie: user.refreshCookie,
    });
    expect(out.status).toBe(200);
    const res = await api("POST", "/auth/refresh", {
      cookie: user.refreshCookie,
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/logout-all revokes every session", async () => {
    const user = await createUser(t);
    const second = await api("POST", "/auth/login", {
      body: { email: user.email, password: PASSWORD },
    });
    const res = await api("POST", "/auth/logout-all", { token: user.token });
    expect(res.status).toBe(200);
    for (const cookie of [user.refreshCookie, second.refreshCookie!]) {
      expect((await api("POST", "/auth/refresh", { cookie })).status).toBe(401);
    }
  });

  test("POST /auth/logout-all requires a token", async () => {
    expect((await api("POST", "/auth/logout-all")).status).toBe(401);
  });

  test("a refreshed token keeps working after login", async () => {
    const user = await createUser(t);
    const { accessToken } = await login(user.email);
    expect((await api("GET", "/users/me", { token: accessToken })).status).toBe(
      200,
    );
  });
});
