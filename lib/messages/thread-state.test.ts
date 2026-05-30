import { describe, it, expect } from "vitest";
import { mergeIncoming, applyReadReceipt, countUnreadFor } from "./thread-state";
import type { Message } from "@/actions/messages";

function msg(over: Partial<Message>): Message {
  return {
    id: "1",
    client_id: "c",
    sender_id: "s",
    body: "hi",
    created_at: "2026-05-30T10:00:00.000Z",
    read_at: null,
    ...over,
  };
}

describe("mergeIncoming", () => {
  it("appends a new message", () => {
    const a = msg({ id: "1", created_at: "2026-05-30T10:00:00.000Z" });
    const b = msg({ id: "2", created_at: "2026-05-30T10:01:00.000Z" });
    expect(mergeIncoming([a], b).map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("ignores a duplicate id (realtime echo of own send)", () => {
    const a = msg({ id: "1" });
    expect(mergeIncoming([a], msg({ id: "1", body: "echo" }))).toEqual([a]);
  });

  it("keeps ascending created_at order when an older message arrives late", () => {
    const a = msg({ id: "2", created_at: "2026-05-30T10:01:00.000Z" });
    const older = msg({ id: "1", created_at: "2026-05-30T10:00:00.000Z" });
    expect(mergeIncoming([a], older).map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("applyReadReceipt", () => {
  it("sets read_at on the matching message", () => {
    const a = msg({ id: "1", read_at: null });
    const out = applyReadReceipt([a], { id: "1", read_at: "2026-05-30T11:00:00.000Z" });
    expect(out[0].read_at).toBe("2026-05-30T11:00:00.000Z");
  });

  it("leaves other messages untouched", () => {
    const a = msg({ id: "1" });
    const b = msg({ id: "2" });
    const out = applyReadReceipt([a, b], { id: "1", read_at: "2026-05-30T11:00:00.000Z" });
    expect(out[1]).toBe(b);
  });
});

describe("countUnreadFor", () => {
  it("counts messages not sent by me with no read_at", () => {
    const list = [
      msg({ id: "1", sender_id: "coach", read_at: null }),
      msg({ id: "2", sender_id: "coach", read_at: "2026-05-30T11:00:00.000Z" }),
      msg({ id: "3", sender_id: "me", read_at: null }),
    ];
    expect(countUnreadFor(list, "me")).toBe(1);
  });
});
