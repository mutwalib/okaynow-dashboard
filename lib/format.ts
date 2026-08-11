import type { ClaimStatus, Shift, ShiftStatus } from "./types";

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMoneyExact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Local calendar ISO date (YYYY-MM-DD). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Default stats window: 7 days ago → today. */
export function defaultStatsDateRange(): {
  periodStart: string;
  periodEnd: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return { periodStart: toIsoDate(start), periodEnd: toIsoDate(end) };
}

export function shiftHours(shift: Pick<Shift, "startTime" | "endTime">): number {
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let hours = eh + em / 60 - (sh + sm / 60);
  if (hours <= 0) hours += 24;
  return hours;
}

/**
 * True when the shift's scheduled end (America/New_York) is still after now.
 * Overnight shifts (end ≤ start) end on the next calendar day.
 */
export function isShiftBeforeScheduledEnd(
  shift: Pick<Shift, "date" | "startTime" | "endTime">,
): boolean {
  const [sh, sm] = shift.startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = shift.endTime.slice(0, 5).split(":").map(Number);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  let endDate = shift.date;
  if (overnight) {
    const d = new Date(`${shift.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    endDate = d.toISOString().slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const scheduledEndEt = `${endDate}T${pad(eh)}:${pad(em)}:00`;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const nowEt = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  return scheduledEndEt > nowEt;
}

export function shiftStatusClass(status: ShiftStatus): string {
  switch (status) {
    case "DRAFT":
    case "HELD":
      return "badge-progress";
    case "OPEN":
      return "badge-open";
    case "CLAIMED":
    case "CONFIRMED":
      return "badge-confirmed";
    case "IN_PROGRESS":
      return "badge-progress";
    case "COMPLETED":
      return "badge-done";
    case "CANCELLED":
    case "NO_SHOW":
      return "badge-cancel";
    default:
      return "badge-open";
  }
}

export function claimStatusClass(status: ClaimStatus): string {
  switch (status) {
    case "PENDING":
      return "badge-progress";
    case "CONFIRMED":
      return "badge-confirmed";
    case "CANCELLED":
      return "badge-cancel";
    default:
      return "badge-open";
  }
}
