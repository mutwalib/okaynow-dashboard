"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { getShift, updateShift } from "@/lib/api";
import { canEditShift } from "@/lib/shift-mutability";
import {
  ShiftForm,
  type ShiftFormValues,
} from "@/components/shift-form";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";

export default function EditShiftPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const shift = useQuery({
    queryKey: ["shift", id],
    queryFn: () => getShift(id),
  });

  if (shift.isLoading) {
    return <p className="text-sm text-ink-muted">Loading shift…</p>;
  }
  if (!shift.data) {
    return <p className="text-sm text-danger">Shift not found.</p>;
  }

  if (!canEditShift(shift.data)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-in">
        <ButtonLink href={`/shifts/${id}`} variant="ghost" className="px-0" size="sm">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Shift details
        </ButtonLink>
        <p className="text-sm text-danger">
          Past shifts and shifts that are claimed, confirmed, or in progress
          cannot be edited.
        </p>
      </div>
    );
  }

  const clientRef = shift.data.facilityProfileId
    ? `FACILITY:${shift.data.facilityProfileId}`
    : shift.data.clientProfileId
      ? `FAMILY:${shift.data.clientProfileId}`
      : "";

  async function save(values: ShiftFormValues) {
    try {
      await updateShift(id, {
        requiredQualification: values.requiredQualification,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        addressLine: values.addressLine,
        city: values.city,
        state: values.state,
        zip: values.zip,
        payRate: values.payRate,
        billRate: values.billRate,
        notes: values.notes || undefined,
      });
      showToast("Shift updated", "success");
      router.push(`/shifts/${id}`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update shift",
        "error",
      );
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in">
      <ButtonLink href={`/shifts/${id}`} variant="ghost" className="px-0" size="sm">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Shift details
      </ButtonLink>
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Save className="h-5 w-5 text-ink-muted" aria-hidden />
          Edit shift
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update hours, rates, location, or notes for this day.
        </p>
      </div>
      <div className="rounded border border-line bg-panel p-4">
        <ShiftForm
          mode="edit"
          submitLabel="Save changes"
          onSubmit={save}
          defaultValues={{
            clientRef,
            requiredQualification: shift.data.requiredQualification,
            scheduleType: shift.data.scheduleType ?? "ONE_OFF",
            date: shift.data.date,
            startTime: shift.data.startTime.slice(0, 5),
            endTime: shift.data.endTime.slice(0, 5),
            addressLine: shift.data.addressLine,
            city: shift.data.city,
            state: "MA",
            zip: shift.data.zip,
            payRate: Number(shift.data.payRate),
            billRate: Number(shift.data.billRate),
            requiredHeadcount: shift.data.requiredHeadcount ?? 1,
            notes: shift.data.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
