"use client";

import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import { getAccessToken } from "./auth-cookie";
import type { AppNotification, ShiftBoardUpdate } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

function brokerUrl() {
  if (API_BASE_URL.startsWith("https://")) {
    return `${API_BASE_URL.replace(/^https/, "wss")}/ws`;
  }
  return `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
}

export type RealtimeHandlers = {
  onNotification?: (n: AppNotification) => void;
  onShiftBoard?: (u: ShiftBoardUpdate) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

export function createRealtimeClient(handlers: RealtimeHandlers) {
  let shiftSub: StompSubscription | null = null;
  let notifSub: StompSubscription | null = null;

  const client = new Client({
    brokerURL: brokerUrl(),
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: () => {
      const token = getAccessToken();
      client.connectHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : {};
    },
    onConnect: () => {
      handlers.onConnected?.();
      shiftSub = client.subscribe("/topic/shifts", (message: IMessage) => {
        try {
          handlers.onShiftBoard?.(JSON.parse(message.body) as ShiftBoardUpdate);
        } catch {
          /* ignore malformed */
        }
      });
      notifSub = client.subscribe(
        "/user/queue/notifications",
        (message: IMessage) => {
          try {
            handlers.onNotification?.(
              JSON.parse(message.body) as AppNotification,
            );
          } catch {
            /* ignore malformed */
          }
        },
      );
    },
    onDisconnect: () => {
      handlers.onDisconnected?.();
    },
    onStompError: () => {
      handlers.onDisconnected?.();
    },
    onWebSocketClose: () => {
      handlers.onDisconnected?.();
    },
  });

  return {
    activate() {
      if (!getAccessToken()) return;
      if (!client.active) client.activate();
    },
    deactivate() {
      shiftSub?.unsubscribe();
      notifSub?.unsubscribe();
      shiftSub = null;
      notifSub = null;
      void client.deactivate();
    },
    get connected() {
      return client.connected;
    },
  };
}
