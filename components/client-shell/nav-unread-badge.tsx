"use client";

import { useClientUnread } from "@/lib/messages/use-unread";

export default function NavUnreadBadge({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const count = useClientUnread(userId);
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-[16px] items-center justify-center rounded-full bg-lime px-1 text-[9px] font-bold leading-none text-bg ${className}`}
      aria-label={`${count} unread`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
