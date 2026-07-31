import type { ShiftStatus } from "./types";

/** Calendar date (YYYY-MM-DD) is before today in local time. */
export function isShiftPastDate(date: string): boolean {
  return date < new Date().toISOString().slice(0, 10);
}

const LOCKED_STATUSES: ReadonlySet<ShiftStatus> = new Set([
  "CLAIMED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_SHOW",
]);

/**
 * Open / held drafts can be edited. Past shifts and anything already claimed,
 * confirmed, in progress, completed, or no-show cannot.
 */
export function canEditShift(shift: {
  date: string;
  status: ShiftStatus;
}): boolean {
  if (isShiftPastDate(shift.date)) return false;
  if (LOCKED_STATUSES.has(shift.status)) return false;
  if (shift.status === "CANCELLED") return false;
  return true;
}

/**
 * Same lock as edit, but cancelled shifts may still be removed from the schedule.
 */
export function canDeleteShift(shift: {
  date: string;
  status: ShiftStatus;
}): boolean {
  if (isShiftPastDate(shift.date)) return false;
  return !LOCKED_STATUSES.has(shift.status);
}
