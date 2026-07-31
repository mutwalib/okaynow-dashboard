"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmAction } from "@/lib/confirm";
import type { Shift } from "@/lib/types";
import { isShiftBeforeScheduledEnd } from "@/lib/format";
import { canDeleteShift, canEditShift } from "@/lib/shift-mutability";
import {
  assignCaregiverToShift,
  cancelShift,
  completeShift,
  deleteShift,
  getCaregiverOptions,
  publishShift,
  reopenShift,
  revertCompleteShift,
  revertStartShift,
  startShift,
  unassignCaregiverFromShift,
  unpublishShift,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";
import {
  CheckCircle2,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

function invalidateShiftQueries(
  qc: ReturnType<typeof useQueryClient>,
  shiftId: string,
) {
  qc.invalidateQueries({ queryKey: ["owner-shifts"] });
  qc.invalidateQueries({ queryKey: ["shift", shiftId] });
  qc.invalidateQueries({ queryKey: ["shift-claims", shiftId] });
  qc.invalidateQueries({
    predicate: (q) => String(q.queryKey[0] ?? "").startsWith("dash-"),
  });
}

export function ShiftListActions({ shift }: { shift: Shift }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [caregiverId, setCaregiverId] = useState("");

  const caregivers = useQuery({
    queryKey: ["caregiver-options"],
    queryFn: getCaregiverOptions,
    enabled: assignOpen,
  });

  function onOk(message: string, run: () => void) {
    if (confirmAction(message)) run();
  }

  const publish = useMutation({
    mutationFn: () => publishShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift released to open board", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift held — hidden from marketplace", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const assign = useMutation({
    mutationFn: () => assignCaregiverToShift(shift.id, caregiverId),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      setAssignOpen(false);
      setCaregiverId("");
      showToast("Caregiver assigned", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const unassign = useMutation({
    mutationFn: () => unassignCaregiverFromShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Caregiver unassigned", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const start = useMutation({
    mutationFn: () => startShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift started", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const revertStart = useMutation({
    mutationFn: () => revertStartShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Start undone — shift is confirmed again", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const complete = useMutation({
    mutationFn: () => completeShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift completed", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const revertComplete = useMutation({
    mutationFn: () => revertCompleteShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Completion undone — shift is in progress again", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift cancelled", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const reopen = useMutation({
    mutationFn: () => reopenShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift reopened", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: () => deleteShift(shift.id),
    onSuccess: () => {
      invalidateShiftQueries(qc, shift.id);
      showToast("Shift deleted", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const busy =
    publish.isPending ||
    unpublish.isPending ||
    assign.isPending ||
    unassign.isPending ||
    start.isPending ||
    revertStart.isPending ||
    complete.isPending ||
    revertComplete.isPending ||
    cancel.isPending ||
    reopen.isPending ||
    remove.isPending;

  const canRelease = shift.status === "DRAFT" || shift.status === "HELD";
  const canWithdraw = shift.status === "OPEN";
  const canAssign =
    shift.status === "DRAFT" ||
    shift.status === "HELD" ||
    shift.status === "OPEN";
  const canUnassign =
    shift.status === "CLAIMED" || shift.status === "CONFIRMED";
  const canStart = shift.status === "CONFIRMED";
  const canRevertStart = shift.status === "IN_PROGRESS";
  const canComplete =
    shift.status === "IN_PROGRESS" && !isShiftBeforeScheduledEnd(shift);
  const canRevertComplete = shift.status === "COMPLETED";
  const canCancel =
    shift.status === "DRAFT" ||
    shift.status === "HELD" ||
    shift.status === "OPEN" ||
    shift.status === "CLAIMED" ||
    shift.status === "CONFIRMED" ||
    shift.status === "IN_PROGRESS";
  const canReopen = shift.status === "CANCELLED";
  const allowEdit = canEditShift(shift);
  const allowDelete = canDeleteShift(shift);

  return (
    <div className="flex min-w-[12rem] flex-col items-stretch gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {canRelease ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              onOk(
                shift.status === "HELD"
                  ? "Release this held shift to the caregiver open board?"
                  : "Release this draft to the caregiver open board?",
                () => publish.mutate(),
              )
            }
            title="Release to caregiver open board"
          >
            <Send className="h-3 w-3" aria-hidden />
            {publish.isPending ? "…" : "Release"}
          </Button>
        ) : null}
        {canWithdraw ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onOk(
                "Hold this shift off the marketplace? Caregivers will no longer see it. Status becomes HELD (not draft).",
                () => unpublish.mutate(),
              )
            }
            title="Hold off marketplace"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            {unpublish.isPending ? "…" : "Hold"}
          </Button>
        ) : null}
        {canAssign ? (
          <Button
            size="sm"
            variant={assignOpen ? "secondary" : "primary"}
            disabled={busy}
            onClick={() => setAssignOpen((v) => !v)}
          >
            <UserPlus className="h-3 w-3" aria-hidden />
            Assign
          </Button>
        ) : null}
        {canUnassign ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onOk(
                "Remove the assigned caregiver from this shift?",
                () => unassign.mutate(),
              )
            }
          >
            <UserMinus className="h-3 w-3" aria-hidden />
            {unassign.isPending ? "…" : "Unassign"}
          </Button>
        ) : null}
        {canStart ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              onOk("Mark this shift as started (in progress)?", () =>
                start.mutate(),
              )
            }
          >
            <Play className="h-3 w-3" aria-hidden />
            {start.isPending ? "…" : "Start"}
          </Button>
        ) : null}
        {canRevertStart ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onOk("Undo start and return this shift to confirmed?", () =>
                revertStart.mutate(),
              )
            }
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            {revertStart.isPending ? "…" : "Undo start"}
          </Button>
        ) : null}
        {canComplete ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              onOk("Mark this shift as completed?", () => complete.mutate())
            }
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {complete.isPending ? "…" : "Complete"}
          </Button>
        ) : null}
        {canRevertComplete ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onOk(
                "Undo completion and return this shift to in progress? Unpaid settlements will be removed.",
                () => revertComplete.mutate(),
              )
            }
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            {revertComplete.isPending ? "…" : "Undo complete"}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              onOk("Cancel this shift? This can be reopened later.", () =>
                cancel.mutate(),
              )
            }
          >
            <X className="h-3 w-3" aria-hidden />
            Cancel
          </Button>
        ) : null}
        {canReopen ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              onOk("Reopen this cancelled shift?", () => reopen.mutate())
            }
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            {reopen.isPending ? "…" : "Reopen"}
          </Button>
        ) : null}
        {allowEdit ? (
          <Link
            href={`/shifts/${shift.id}/edit`}
            className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent-deep"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Edit
          </Link>
        ) : null}
        {allowDelete ? (
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() =>
              onOk("Delete this shift permanently?", () => remove.mutate())
            }
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            {remove.isPending ? "…" : "Delete"}
          </Button>
        ) : null}
        <Link
          href={`/shifts/${shift.id}`}
          className="px-1 text-xs font-medium text-ink-muted hover:text-accent-deep hover:underline"
        >
          Details
        </Link>
      </div>

      {assignOpen && canAssign ? (
        <div className="flex flex-col gap-1 rounded border border-line bg-canvas p-1.5">
          <Select
            value={caregiverId}
            onChange={(e) => setCaregiverId(e.target.value)}
            disabled={caregivers.isLoading || assign.isPending}
          >
            <option value="">
              {caregivers.isLoading ? "Loading…" : "Choose caregiver…"}
            </option>
            {(caregivers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
                {c.qualifications.length
                  ? ` · ${c.qualifications.join(", ")}`
                  : ""}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={!caregiverId || assign.isPending}
            onClick={() =>
              onOk(
                "Assign and confirm this caregiver on the shift?",
                () => assign.mutate(),
              )
            }
          >
            {assign.isPending ? "Assigning…" : "Confirm assign"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
