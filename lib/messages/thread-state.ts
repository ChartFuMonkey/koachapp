import type { Message } from "@/actions/messages";

/** Append `incoming` to `list`, ignoring duplicates by id, kept sorted by created_at asc. */
export function mergeIncoming(list: Message[], incoming: Message): Message[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  const next = [...list, incoming];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return next;
}

/** Patch read_at on the message whose id matches `update.id`. */
export function applyReadReceipt(
  list: Message[],
  update: Pick<Message, "id" | "read_at">
): Message[] {
  return list.map((m) => (m.id === update.id ? { ...m, read_at: update.read_at } : m));
}

/** Count messages addressed to `userId` (not sent by them) that are still unread. */
export function countUnreadFor(list: Message[], userId: string): number {
  return list.filter((m) => m.sender_id !== userId && m.read_at == null).length;
}
