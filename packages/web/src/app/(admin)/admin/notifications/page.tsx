"use client";

import { useState } from "react";
import { sendNotification, broadcastNotification } from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";

type Channel = "push" | "sms" | "email";
type Mode = "single" | "broadcast";

const CHANNELS: Channel[] = ["push", "sms", "email"];

const INIT_SINGLE = {
  userId: "",
  type: "system",
  title: "",
  body: "",
  channel: "push" as Channel,
};

const INIT_BROADCAST = {
  userIds: "",
  type: "system",
  title: "",
  message: "",
  channel: "push" as Channel,
};

export default function AdminNotificationsPage() {
  const [mode, setMode] = useState<Mode>("single");

  // Single
  const [single, setSingle] = useState(INIT_SINGLE);
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleMsg, setSingleMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Broadcast
  const [broadcast, setBroadcast] = useState(INIT_BROADCAST);
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const setSingleField = (k: string, v: string) =>
    setSingle((p) => ({ ...p, [k]: v }));
  const setBroadcastField = (k: string, v: string) =>
    setBroadcast((p) => ({ ...p, [k]: v }));

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleSaving(true);
    setSingleMsg(null);
    try {
      await sendNotification(single);
      setSingleMsg({ ok: true, text: "Notification sent." });
      setSingle(INIT_SINGLE);
    } catch {
      setSingleMsg({ ok: false, text: "Failed to send notification." });
    } finally {
      setSingleSaving(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const userIds = broadcast.userIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      setBroadcastMsg({ ok: false, text: "Provide at least one user ID." });
      return;
    }
    setBroadcastSaving(true);
    setBroadcastMsg(null);
    try {
      await broadcastNotification({ ...broadcast, userIds });
      setBroadcastMsg({
        ok: true,
        text: `Broadcast sent to ${userIds.length} user${userIds.length !== 1 ? "s" : ""}.`,
      });
      setBroadcast(INIT_BROADCAST);
    } catch {
      setBroadcastMsg({ ok: false, text: "Failed to send broadcast." });
    } finally {
      setBroadcastSaving(false);
    }
  };

  const inputCls =
    "h-9 w-full rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
  const labelCls = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Send or broadcast notifications to users
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        {(["single", "broadcast"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              mode === m
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {m === "single" ? "Send to user" : "Broadcast"}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <form
          onSubmit={handleSingle}
          className="max-w-lg space-y-4 rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div>
            <label className={labelCls}>User ID</label>
            <input
              className={inputCls}
              value={single.userId}
              onChange={(e) => setSingleField("userId", e.target.value)}
              required
              placeholder="uuid"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <input
                className={inputCls}
                value={single.type}
                onChange={(e) => setSingleField("type", e.target.value)}
                placeholder="system"
              />
            </div>
            <div>
              <label className={labelCls}>Channel</label>
              <select
                className={inputCls}
                value={single.channel}
                onChange={(e) => setSingleField("channel", e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={single.title}
              onChange={(e) => setSingleField("title", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Body</label>
            <textarea
              rows={3}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={single.body}
              onChange={(e) => setSingleField("body", e.target.value)}
              required
            />
          </div>
          {singleMsg && (
            <p
              className={`text-xs ${singleMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
            >
              {singleMsg.text}
            </p>
          )}
          <Button type="submit" size="sm" disabled={singleSaving}>
            {singleSaving ? "Sending…" : "Send notification"}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleBroadcast}
          className="max-w-lg space-y-4 rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div>
            <label className={labelCls}>
              User IDs (one per line or comma-separated)
            </label>
            <textarea
              rows={4}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={broadcast.userIds}
              onChange={(e) => setBroadcastField("userIds", e.target.value)}
              required
              placeholder="uuid1&#10;uuid2&#10;uuid3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <input
                className={inputCls}
                value={broadcast.type}
                onChange={(e) => setBroadcastField("type", e.target.value)}
                placeholder="system"
              />
            </div>
            <div>
              <label className={labelCls}>Channel</label>
              <select
                className={inputCls}
                value={broadcast.channel}
                onChange={(e) => setBroadcastField("channel", e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={broadcast.title}
              onChange={(e) => setBroadcastField("title", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea
              rows={3}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={broadcast.message}
              onChange={(e) => setBroadcastField("message", e.target.value)}
              required
            />
          </div>
          {broadcastMsg && (
            <p
              className={`text-xs ${broadcastMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
            >
              {broadcastMsg.text}
            </p>
          )}
          <Button type="submit" size="sm" disabled={broadcastSaving}>
            {broadcastSaving ? "Sending…" : "Broadcast"}
          </Button>
        </form>
      )}
    </div>
  );
}
