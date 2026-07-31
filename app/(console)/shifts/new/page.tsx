"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { createShift } from "@/lib/api";
import { ShiftForm, parseClientRef, type ShiftFormValues } from "@/components/shift-form";
import { useToast } from "@/lib/toast-context";
import { ButtonLink } from "@/components/ui/button";

function NewShiftInner() {
  const router = useRouter();
  const search = useSearchParams();
  const routine = search.get("routine") === "1";
  const { showToast } = useToast();

  async function onSubmit(values: ShiftFormValues) {
    try {
      const owner = parseClientRef(values.clientRef);
      const { clientRef: _clientRef, ...rest } = values;
      const created = await createShift({
        ...rest,
        ...owner,
        state: values.state || "MA",
        notes: values.notes || undefined,
        date:
          values.scheduleType === "ONE_OFF" ? values.date : undefined,
        endDate: undefined,
        assignFromRoster:
          values.scheduleType === "DAILY_ROUTINE"
            ? values.assignFromRoster !== false
            : undefined,
      });
      const first = created.shifts[0];
      const skipped = created.skippedOverlapCount ?? 0;
      showToast(
        created.createdCount > 1 || skipped > 0
          ? `Created ${created.createdCount} daily schedule day${created.createdCount === 1 ? "" : "s"}${
              skipped > 0
                ? ` (skipped ${skipped} overlapping day${skipped === 1 ? "" : "s"})`
                : ""
            }`
          : "Draft shift created",
        "success",
      );
      router.push(
        values.scheduleType === "DAILY_ROUTINE"
          ? "/schedule"
          : `/shifts/${first.id}`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not create shift",
        "error",
      );
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in">
      <ButtonLink
        href={routine ? "/schedule" : "/shifts"}
        variant="ghost"
        className="px-0"
        size="sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {routine ? "Schedule" : "All shifts"}
      </ButtonLink>
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Plus className="h-5 w-5 text-ink-muted" aria-hidden />
          {routine ? "Create daily routine" : "Create shift"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {routine
            ? "Ongoing every-day coverage (no end date). Days fill from the client roster; call out on a calendar day to open the marketplace for that date only."
            : "Shifts start as drafts. Release them when caregivers should be able to claim."}
        </p>
      </div>
      <div className="rounded border border-line bg-panel p-4">
        <ShiftForm
          submitLabel={routine ? "Create daily schedule" : "Create shift"}
          onSubmit={onSubmit}
          defaultValues={
            routine
              ? { scheduleType: "DAILY_ROUTINE", assignFromRoster: true }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default function NewShiftPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <NewShiftInner />
    </Suspense>
  );
}
