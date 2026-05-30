"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readEnv, shouldGate } from "@/lib/pwa/install-gate";

export default function LoginAsClientLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // Default to the normal login URL (SSR-safe); after mount, swap to /install
  // on gated mobile browsers so the common path never flashes the login form.
  const [href, setHref] = useState("/login?role=client");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (shouldGate(readEnv())) setHref("/install");
  }, []);
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
