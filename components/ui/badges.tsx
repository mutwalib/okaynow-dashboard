import type { ClaimStatus, ShiftStatus } from "@/lib/types";
import { claimStatusClass, shiftStatusClass } from "@/lib/format";

export function StatusBadge({ status }: { status: ShiftStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${shiftStatusClass(status)}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function ClaimBadge({ status }: { status: ClaimStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${claimStatusClass(status)}`}
    >
      {status}
    </span>
  );
}
