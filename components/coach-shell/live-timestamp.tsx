"use client";

import { useEffect, useState } from "react";

function formatNow(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .toUpperCase()
    .replace(",", " ·");
}

export function LiveTimestamp({ className }: { className?: string }) {
  const [now, setNow] = useState<string>(() => formatNow());

  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className={className}>{now}</span>;
}
