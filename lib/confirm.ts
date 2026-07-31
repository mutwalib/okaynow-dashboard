"use client";

/** Ask before a destructive / lifecycle action. Returns true if the user confirms. */
export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

/**
 * Prompt for a decline/cancel reason. Returns trimmed text, or null if
 * cancelled / left blank.
 */
export function promptDeclineReason(
  message = "Reason for declining this claim:",
): string | null {
  const value = window.prompt(message, "");
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
