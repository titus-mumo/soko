import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createUser,
  missingId,
  ok,
  Tracker,
  type TestUser,
} from "./helpers";

const t = new Tracker();
let admin: TestUser;
let user: TestUser;

type Note = { id: string; isRead: boolean; channel: string; title: string };

const send = (to: TestUser, title: string, channel = "push") =>
  api("POST", "/notifications/admin/send", {
    token: admin.token,
    body: {
      userId: to.id,
      type: "system",
      title,
      body: `${title} body`,
      channel,
    },
  });

const mine = async (u = user) =>
  ok<Note[]>(await api("GET", "/notifications/me", { token: u.token }));

beforeAll(async () => {
  admin = await createAdmin(t);
  user = await createUser(t);
});
afterAll(() => t.cleanup());

describe("admin sending", () => {
  test("POST /notifications/admin/send delivers to one user", async () => {
    const res = await send(user, "Hello");
    expect([200, 201]).toContain(res.status);
    expect((await mine()).map((n) => n.title)).toContain("Hello");
  });

  test("POST /notifications/admin/broadcast delivers to many users", async () => {
    const other = await createUser(t);
    const res = await api("POST", "/notifications/admin/broadcast", {
      token: admin.token,
      body: {
        userIds: [user.id, other.id],
        type: "system",
        title: "Broadcast",
        message: "To everyone",
        channel: "push",
      },
    });
    expect([200, 201]).toContain(res.status);
    expect((await mine()).map((n) => n.title)).toContain("Broadcast");
    expect((await mine(other)).map((n) => n.title)).toContain("Broadcast");
  });

  test("broadcast needs at least one user", async () => {
    const res = await api("POST", "/notifications/admin/broadcast", {
      token: admin.token,
      body: {
        userIds: [],
        type: "system",
        title: "Empty",
        message: "x",
        channel: "push",
      },
    });
    expect(res.status).toBe(400);
  });

  test("sending is admin-only", async () => {
    const res = await api("POST", "/notifications/admin/send", {
      token: user.token,
      body: {
        userId: user.id,
        type: "system",
        title: "Self",
        body: "x",
        channel: "push",
      },
    });
    expect(res.status).toBe(403);
  });
});

describe("my notifications", () => {
  test("GET /notifications/me/unread and …/count agree", async () => {
    await send(user, "Unread one");
    const unread = ok<Note[]>(
      await api("GET", "/notifications/me/unread", { token: user.token }),
    );
    expect(unread.every((n) => !n.isRead)).toBe(true);
    const { count } = ok(
      await api("GET", "/notifications/me/unread/count", { token: user.token }),
    );
    expect(count).toBe(unread.length);
  });

  test("GET /notifications/me/channel/:channel filters by channel", async () => {
    await send(user, "By SMS", "sms");
    const sms = ok<Note[]>(
      await api("GET", "/notifications/me/channel/sms", { token: user.token }),
    );
    expect(sms.map((n) => n.title)).toContain("By SMS");
    expect(sms.every((n) => n.channel === "sms")).toBe(true);
  });

  test("PATCH /notifications/me/:id/read marks one read", async () => {
    const [first] = (await mine()).filter((n) => !n.isRead);
    ok(
      await api("PATCH", `/notifications/me/${first.id}/read`, {
        token: user.token,
      }),
    );
    expect((await mine()).find((n) => n.id === first.id)?.isRead).toBe(true);
  });

  test("marking someone else's notification is 404", async () => {
    const [note] = await mine();
    const other = await createUser(t);
    const res = await api("PATCH", `/notifications/me/${note.id}/read`, {
      token: other.token,
    });
    expect(res.status).toBe(404);
  });

  test("PATCH /notifications/me/read-all clears the unread count", async () => {
    ok(await api("PATCH", "/notifications/me/read-all", { token: user.token }));
    const { count } = ok(
      await api("GET", "/notifications/me/unread/count", { token: user.token }),
    );
    expect(count).toBe(0);
  });

  test("DELETE /notifications/me/:id deletes one", async () => {
    const [note] = await mine();
    ok(
      await api("DELETE", `/notifications/me/${note.id}`, {
        token: user.token,
      }),
    );
    expect((await mine()).map((n) => n.id)).not.toContain(note.id);
  });

  test("DELETE of an unknown notification is 404", async () => {
    const res = await api("DELETE", `/notifications/me/${missingId()}`, {
      token: user.token,
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /notifications/me clears all", async () => {
    ok(await api("DELETE", "/notifications/me", { token: user.token }));
    expect(await mine()).toEqual([]);
  });

  test("notification routes need a token", async () => {
    expect((await api("GET", "/notifications/me")).status).toBe(401);
  });
});
