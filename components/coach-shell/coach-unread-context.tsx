"use client";

import { createContext, useContext } from "react";

/** Live per-client unread counts, keyed by client id. Provided by CoachShell. */
export const CoachUnreadContext = createContext<Record<string, number>>({});

/** Unread count for one client (0 if none). */
export function useClientUnreadCount(clientId: string): number {
  return useContext(CoachUnreadContext)[clientId] ?? 0;
}
