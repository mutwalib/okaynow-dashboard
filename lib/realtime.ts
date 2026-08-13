"use client";

import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import { ensureFreshAccessToken } from "./api";
import { clearAuthSession } from "./auth-cookie";
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
  let stopped = false;

  const client = new Client({
    brokerURL: brokerUrl(),
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: async () => {
      const token = await ensureFreshAccessToken({ force: true });
      if (!token) {
        stopped = true;
        client.reconnectDelay = 0;
        client.connectHeaders = {};
        void client.deactivate();
        handlers.onDisconnected?.();
        clearAuthSession();
        return;
      }
      client.connectHeaders = { Authorization: `Bearer ${token}` };
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
      stopped = true;
      client.reconnectDelay = 0;
      void client.deactivate();
    },
    onWebSocketClose: () => {
      if (!stopped) handlers.onDisconnected?.();
    },
  });

  return {
    activate() {
      stopped = false;
      client.reconnectDelay = 4000;
      void (async () => {
        const token = await ensureFreshAccessToken({ force: true });
        if (!token || stopped) {
          handlers.onDisconnected?.();
          return;
        }
        client.connectHeaders = { Authorization: `Bearer ${token}` };
        if (!client.active) client.activate();
      })();
    },
    deactivate() {
      stopped = true;
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
