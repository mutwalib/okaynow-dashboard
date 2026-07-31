import type { AppNotification, UserRole } from "@/lib/types";

export function parseNotificationShiftId(payload: string | null): string | null {
  if (!payload) return null;
  try {
    const data = JSON.parse(payload) as { shiftId?: string };
    return typeof data.shiftId === "string" && data.shiftId ? data.shiftId : null;
  } catch {
    return null;
  }
}

/** Deep-link for an in-app notification, or null when there is nowhere useful to go. */
export function notificationHref(
  notification: AppNotification,
  role: UserRole | null | undefined,
): string | null {
  if (notification.type === "INVOICE_SENT") {
    return role === "ADMIN" ? "/finance" : role === "CLIENT" ? "/client/billing" : null;
  }

  const shiftId = parseNotificationShiftId(notification.payload);
  if (!shiftId) return null;

  switch (role) {
    case "ADMIN":
      return `/shifts/${shiftId}`;
    case "CAREGIVER":
      return `/caregiver/shifts/${shiftId}`;
    case "CLIENT":
      return `/client/shifts/${shiftId}`;
    case "FACILITY":
      return `/facility/shifts/${shiftId}`;
    default:
      return null;
  }
}
