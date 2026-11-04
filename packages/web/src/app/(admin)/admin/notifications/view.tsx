"use client";

import { useState } from "react";
import {
  sendNotification,
  broadcastNotification,
  type UserPick,
} from "@/lib/admin.api";
import { UserPicker } from "@/components/admin/UserPicker";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FilterChips } from "@/components/ui/FilterChips";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage } from "@/lib/utils";
import type { NotificationChannel } from "@/lib/types";

type Mode = "single" | "broadcast";

const CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: "push", label: "In-app" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

const INIT_SINGLE = {
  to: [] as UserPick[],
  type: "system",
  title: "",
  body: "",
  channel: "push" as NotificationChannel,
};

const INIT_BROADCAST = {
  to: [] as UserPick[],
  type: "system",
  title: "",
  message: "",
  channel: "push" as NotificationChannel,
};

function ChannelSelect({
  value,
  onChange,
}: {
  value: NotificationChannel;
  onChange: (v: NotificationChannel) => void;
}) {
  return (
    <Select
      label="Channel"
      value={value}
      onChange={(e) => onChange(e.target.value as NotificationChannel)}
    >
      {CHANNELS.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}

export default function AdminNotificationsPage() {
  const [mode, setMode] = useState<Mode>("single");

  const [single, setSingle] = useState(INIT_SINGLE);
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);

  const [broadcast, setBroadcast] = useState(INIT_BROADCAST);
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = single.to[0];
    if (!recipient) {
      setSingleError("Choose who to send it to.");
      return;
    }
    if (!single.title.trim() || !single.body.trim()) {
      setSingleError("Title and message are required.");
      return;
    }
    setSingleSaving(true);
    setSingleError(null);
    try {
      await sendNotification({
        userId: recipient.id,
        type: single.type,
        channel: single.channel,
        title: single.title.trim(),
        body: single.body.trim(),
      });
      toast.success(`Notification sent to ${recipient.name}`);
      setSingle(INIT_SINGLE);
    } catch (err) {
      setSingleError(apiErrorMessage(err, "Failed to send notification."));
    } finally {
      setSingleSaving(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const userIds = broadcast.to.map((u) => u.id);
    if (userIds.length === 0) {
      setBroadcastError("Add at least one recipient.");
      return;
    }
    if (!broadcast.title.trim() || !broadcast.message.trim()) {
      setBroadcastError("Title and message are required.");
      return;
    }
    setBroadcastSaving(true);
    setBroadcastError(null);
    try {
      await broadcastNotification({
        userIds,
        type: broadcast.type,
        channel: broadcast.channel,
        title: broadcast.title.trim(),
        message: broadcast.message.trim(),
      });
      toast.success(
        `Broadcast sent to ${userIds.length} user${userIds.length !== 1 ? "s" : ""}`,
      );
      setBroadcast(INIT_BROADCAST);
    } catch (err) {
      setBroadcastError(apiErrorMessage(err, "Failed to send broadcast."));
    } finally {
      setBroadcastSaving(false);
    }
  };

  const formCls =
    "max-w-lg space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send a notification"
        description="Message one person or broadcast to many"
      />

      <FilterChips
        label="Notification mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "single", label: "Send to user" },
          { value: "broadcast", label: "Broadcast" },
        ]}
      />

      {mode === "single" ? (
        <form onSubmit={handleSingle} className={formCls} noValidate>
          <UserPicker
            label="To"
            value={single.to}
            onChange={(to) => setSingle((p) => ({ ...p, to }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Type"
              value={single.type}
              onChange={(e) =>
                setSingle((p) => ({ ...p, type: e.target.value }))
              }
              placeholder="system"
            />
            <ChannelSelect
              value={single.channel}
              onChange={(channel) => setSingle((p) => ({ ...p, channel }))}
            />
          </div>
          <Input
            label="Title"
            value={single.title}
            onChange={(e) =>
              setSingle((p) => ({ ...p, title: e.target.value }))
            }
          />
          <Textarea
            label="Message"
            rows={3}
            value={single.body}
            onChange={(e) => setSingle((p) => ({ ...p, body: e.target.value }))}
          />
          <FormError message={singleError} />
          <Button type="submit" isLoading={singleSaving}>
            Send notification
          </Button>
        </form>
      ) : (
        <form onSubmit={handleBroadcast} className={formCls} noValidate>
          <UserPicker
            label="To"
            multiple
            value={broadcast.to}
            onChange={(to) => setBroadcast((p) => ({ ...p, to }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Type"
              value={broadcast.type}
              onChange={(e) =>
                setBroadcast((p) => ({ ...p, type: e.target.value }))
              }
              placeholder="system"
            />
            <ChannelSelect
              value={broadcast.channel}
              onChange={(channel) => setBroadcast((p) => ({ ...p, channel }))}
            />
          </div>
          <Input
            label="Title"
            value={broadcast.title}
            onChange={(e) =>
              setBroadcast((p) => ({ ...p, title: e.target.value }))
            }
          />
          <Textarea
            label="Message"
            rows={3}
            value={broadcast.message}
            onChange={(e) =>
              setBroadcast((p) => ({ ...p, message: e.target.value }))
            }
          />
          <FormError message={broadcastError} />
          <Button type="submit" isLoading={broadcastSaving}>
            Send broadcast
          </Button>
        </form>
      )}
    </div>
  );
}
