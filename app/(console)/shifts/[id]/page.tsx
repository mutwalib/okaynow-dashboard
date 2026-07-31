"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  assignCaregiverToShift,
  cancelShift,
  completeShift,
  deleteShift,
  extendShift,
  getAdminClients,
  getCaregiverOptions,
  getClientCaregivers,
  getShiftClaims,
  getShift,
  getVisitByShift,
  publishShift,
  reopenShift,
  revertCompleteShift,
  revertStartShift,
  startShift,
  unassignCaregiverFromShift,
  unpublishShift,
  updatePlatformPayment,
} from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { formatDate, formatMoney, formatTime, isShiftBeforeScheduledEnd, shiftHours } from "@/lib/format";
import { canDeleteShift, canEditShift } from "@/lib/shift-mutability";
import { AddressLink } from "@/components/address-link";
import { StatusBadge } from "@/components/ui/badges";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";
import { ApiError } from "@/lib/api";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Pencil,
  Play,
  RotateCcw,
  Send,
  Timer,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [extensionEndTime, setExtensionEndTime] = useState("");
  const [assignCaregiverId, setAssignCaregiverId] = useState("");

  const query = useQuery({
    queryKey: ["shift", id],
    queryFn: () => getShift(id),
  });
  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => getAdminClients(),
  });
  const claims = useQuery({
    queryKey: ["shift-claims", id],
    queryFn: () => getShiftClaims(id),
  });
  const caregivers = useQuery({
    queryKey: ["caregiver-options"],
    queryFn: getCaregiverOptions,
  });
  const roster = useQuery({
    queryKey: ["client-roster", query.data?.clientProfileId],
    queryFn: () => getClientCaregivers(query.data!.clientProfileId!),
    enabled: !!query.data?.clientProfileId,
  });
  const visit = useQuery({
    queryKey: ["visit", id],
    queryFn: () => getVisitByShift(id),
    enabled: !!id,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["shift", id] });
    qc.invalidateQueries({ queryKey: ["shift-claims", id] });
    qc.invalidateQueries({ queryKey: ["visit", id] });
    qc.invalidateQueries({ queryKey: ["owner-shifts"] });
    qc.invalidateQueries({
      predicate: (q) => String(q.queryKey[0] ?? "").startsWith("dash-"),
    });
  }

  const cancel = useMutation({
    mutationFn: () => cancelShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift cancelled", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const reopen = useMutation({
    mutationFn: () => reopenShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift reopened", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: () => deleteShift(id),
    onSuccess: () => {
      showToast("Shift deleted", "success");
      router.push("/shifts");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const start = useMutation({
    mutationFn: () => startShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift started", "success");
    },
    onError: (err: Error) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? "Start endpoint not available yet (POST /api/admin/shifts/{id}/start)"
          : err.message;
      showToast(msg, "error");
    },
  });

  const revertStart = useMutation({
    mutationFn: () => revertStartShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Start undone — shift is confirmed again", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const complete = useMutation({
    mutationFn: () => completeShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift completed", "success");
    },
    onError: (err: Error) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? "Complete endpoint not available yet (POST /api/admin/shifts/{id}/complete)"
          : err.message;
      showToast(msg, "error");
    },
  });

  const revertComplete = useMutation({
    mutationFn: () => revertCompleteShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Completion undone — shift is in progress again", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const payment = useMutation({
    mutationFn: (paid: boolean) => updatePlatformPayment(id, paid),
    onSuccess: () => {
      invalidate();
      showToast("Platform payment status updated", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });
  const extend = useMutation({
    mutationFn: () => extendShift(id, extensionEndTime),
    onSuccess: () => {
      invalidate();
      showToast("Caregiver shift time extended", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });
  const assign = useMutation({
    mutationFn: () => assignCaregiverToShift(id, assignCaregiverId),
    onSuccess: () => {
      invalidate();
      setAssignCaregiverId("");
      showToast("Caregiver assigned to shift", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });
  const unassign = useMutation({
    mutationFn: () => unassignCaregiverFromShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Caregiver unassigned", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });
  const publish = useMutation({
    mutationFn: () => publishShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift released to caregivers", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });
  const unpublish = useMutation({
    mutationFn: () => unpublishShift(id),
    onSuccess: () => {
      invalidate();
      showToast("Shift held — hidden from marketplace", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const loadedEndTime = query.data?.endTime;
  useEffect(() => {
    if (loadedEndTime) setExtensionEndTime(loadedEndTime.slice(0, 5));
  }, [loadedEndTime]);

  if (query.isLoading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (query.isError || !query.data) {
    return <p className="text-sm text-danger">Shift not found.</p>;
  }

  const s = query.data;
  const client = clients.data?.content.find(
    (item) =>
      (s.clientProfileId &&
        item.clientType === "FAMILY" &&
        item.id === s.clientProfileId) ||
      (s.facilityProfileId &&
        item.clientType === "FACILITY" &&
        item.id === s.facilityProfileId),
  );
  const hours = shiftHours(s);
  const margin = Number(s.billRate) - Number(s.payRate);
  const canStart = s.status === "CONFIRMED";
  const canComplete =
    s.status === "IN_PROGRESS" && !isShiftBeforeScheduledEnd(s);
  const canUnassign = s.status === "CLAIMED" || s.status === "CONFIRMED";
  const allowEdit = canEditShift(s);
  const allowDelete = canDeleteShift(s);

  function ask(message: string, run: () => void) {
    if (confirmAction(message)) run();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in">
      <ButtonLink href="/shifts" variant="ghost" className="px-0" size="sm">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All shifts
      </ButtonLink>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={s.status} />
        <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold">
          {s.requiredQualification}
        </span>
        <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[11px] font-semibold">
          {s.scheduleType === "DAILY_ROUTINE" ? "Daily routine" : "One-off"}
        </span>
        <span className="font-mono text-[11px] text-ink-muted">{s.id}</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold">{formatDate(s.date)}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatTime(s.startTime)} – {formatTime(s.endTime)} · {hours.toFixed(1)}{" "}
          hrs
        </p>
      </div>

      {client ? (
        <div className="rounded border border-line bg-panel p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-ink-muted">
                {client.clientType === "FACILITY" ? "Facility client" : "Family client"}
              </p>
              <p className="mt-1 font-medium">
                {client.clientType === "FACILITY" && client.facilityName
                  ? client.facilityName
                  : `${client.firstName} ${client.lastName}`}
              </p>
              {client.clientType === "FACILITY" ? (
                <p className="text-xs text-ink-muted">
                  Contact: {client.firstName} {client.lastName}
                </p>
              ) : null}
              <p className="text-sm text-ink-muted">{client.email}</p>
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="text-sm text-accent-deep">
                  {client.phone}
                </a>
              ) : null}
            </div>
            <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              {client.status}
            </span>
          </div>
          <div className="mt-3">
            <AddressLink address={client} className="text-sm text-ink-muted" />
          </div>
          {client.careNeeds ? (
            <div className="mt-3 border-t border-line pt-3">
              <p className="font-mono text-[10px] uppercase text-ink-muted">Care needs</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                {client.careNeeds}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded border border-line bg-panel p-3">
        <p className="font-mono text-[10px] uppercase text-ink-muted">
          Caregiver claims
        </p>
        {claims.isLoading ? (
          <p className="mt-2 text-sm text-ink-muted">Loading claims…</p>
        ) : claims.data?.length ? (
          <div className="mt-2 divide-y divide-line">
            {claims.data.map((claim) => (
              <div
                key={claim.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-1"
              >
                <div>
                  <p className="font-medium">
                    {claim.caregiverFirstName} {claim.caregiverLastName}
                  </p>
                  <a
                    href={`mailto:${claim.caregiverEmail}`}
                    className="text-sm text-accent-deep"
                  >
                    {claim.caregiverEmail}
                  </a>
                  <p className="mt-1 text-xs text-ink-muted">
                    {claim.source === "ASSIGNED" ? "Assigned" : "Marketplace"} ·{" "}
                    {new Date(claim.claimedAt).toLocaleString()}
                  </p>
                  {claim.cancelReason ? (
                    <p className="mt-1 text-xs text-danger">{claim.cancelReason}</p>
                  ) : null}
                </div>
                <span className="rounded bg-panel-2 px-2 py-0.5 text-xs font-semibold">
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No caregiver has claimed this shift.</p>
        )}
      </div>

      {s.status === "DRAFT" ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Marketplace availability
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            This shift is a draft. It is only visible to the family/facility owner
            and you. Caregivers cannot see or claim it until you release it to the
            open board — or you can assign one caregiver privately below without
            ever opening it.
          </p>
          <Button
            className="mt-3"
            size="sm"
            disabled={publish.isPending}
            onClick={() =>
              ask("Release this draft to the caregiver open board?", () =>
                publish.mutate(),
              )
            }
          >
            {publish.isPending ? (
              "Releasing…"
            ) : (
              <>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Release to open board
              </>
            )}
          </Button>
        </div>
      ) : null}

      {s.status === "HELD" ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Marketplace availability
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            This shift is held — hidden from the caregiver marketplace. Assign a
            caregiver privately below, or release it to the open board again.
          </p>
          <Button
            className="mt-3"
            size="sm"
            disabled={publish.isPending}
            onClick={() =>
              ask("Release this held shift to the caregiver open board?", () =>
                publish.mutate(),
              )
            }
          >
            {publish.isPending ? (
              "Releasing…"
            ) : (
              <>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Release to open board
              </>
            )}
          </Button>
        </div>
      ) : null}

      {s.status === "OPEN" ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Marketplace availability
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            This shift is on the open board. Hold it to hide it from caregivers
            (status becomes HELD, not draft) if no one has claimed it yet.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            disabled={unpublish.isPending}
            onClick={() =>
              ask(
                "Hold this shift off the marketplace? Status becomes HELD.",
                () => unpublish.mutate(),
              )
            }
          >
            {unpublish.isPending ? (
              "Holding…"
            ) : (
              <>
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                Hold off marketplace
              </>
            )}
          </Button>
        </div>
      ) : null}

      {s.status === "OPEN" || s.status === "DRAFT" || s.status === "HELD" ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Direct assignment
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {s.status === "OPEN"
              ? "Assign & confirm a caregiver now (fills a marketplace slot), or leave it OPEN for eligible caregivers to claim."
              : "Assign & confirm a caregiver privately. The shift stays off the open board — only that caregiver, the family/facility, and you can see it."}
          </p>
          {(roster.data?.length ?? 0) > 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              Client roster:{" "}
              {roster.data!
                .map(
                  (r) =>
                    `${r.caregiverFirstName} ${r.caregiverLastName} (${r.assignmentType})`,
                )
                .join(", ")}
            </p>
          ) : null}
          <div className="mt-3 flex max-w-lg flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Field label="Caregiver">
                <Select
                  value={assignCaregiverId}
                  onChange={(e) => setAssignCaregiverId(e.target.value)}
                >
                  <option value="">Choose caregiver…</option>
                  {(caregivers.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ·{" "}
                      {c.qualifications.join(", ") || "no quals"}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              size="sm"
              disabled={!assignCaregiverId || assign.isPending}
              onClick={() =>
                ask("Assign and confirm this caregiver on the shift?", () =>
                  assign.mutate(),
                )
              }
            >
              {assign.isPending ? (
                "Assigning…"
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  Assign & confirm
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {canUnassign ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Assignment
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Remove the current caregiver. The shift returns to{" "}
            {s.marketplacePosted ? "OPEN" : "DRAFT"}.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            disabled={unassign.isPending}
            onClick={() =>
              ask("Remove the assigned caregiver from this shift?", () =>
                unassign.mutate(),
              )
            }
          >
            {unassign.isPending ? (
              "Unassigning…"
            ) : (
              <>
                <UserMinus className="h-3.5 w-3.5" aria-hidden />
                Unassign caregiver
              </>
            )}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">Pay</p>
          <p className="font-display text-xl font-semibold">
            {formatMoney(Number(s.payRate))}/hr
          </p>
        </div>
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">Bill</p>
          <p className="font-display text-xl font-semibold">
            {formatMoney(Number(s.billRate))}/hr
          </p>
        </div>
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">Margin</p>
          <p className="font-display text-xl font-semibold text-accent-deep">
            {formatMoney(margin)}/hr
          </p>
        </div>
      </div>

      {s.status === "CONFIRMED" || s.status === "IN_PROGRESS" ? (
        <div className="rounded border border-line bg-panel p-3">
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Extend caregiver time
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Current end: {formatTime(s.endTime)}. Choose a later time to update
            the shift hours and estimated pay.
          </p>
          <div className="mt-3 flex max-w-sm gap-2">
            <Input
              type="time"
              value={extensionEndTime}
              onChange={(event) => setExtensionEndTime(event.target.value)}
            />
            <Button
              size="sm"
              disabled={
                extend.isPending ||
                !extensionEndTime ||
                extensionEndTime <= s.endTime.slice(0, 5)
              }
              onClick={() => extend.mutate()}
            >
              {extend.isPending ? (
                "Extending…"
              ) : (
                <>
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  Extend shift
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-panel p-3">
        <div>
          <p className="font-mono text-[10px] uppercase text-ink-muted">
            Settlement (client + caregiver)
          </p>
          <p className={`mt-1 font-semibold ${s.platformPaid ? "text-success" : "text-warn"}`}>
            {s.platformPaid ? "BOTH PAID" : "OPEN / PARTIAL"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Marks both client collection and caregiver payout. Use{" "}
            <a href="/finance" className="text-accent-deep hover:underline">
              Finance
            </a>{" "}
            for separate pending/paid by period.
          </p>
        </div>
        <Button
          size="sm"
          variant={s.platformPaid ? "secondary" : "primary"}
          disabled={payment.isPending || s.status !== "COMPLETED"}
          onClick={() => payment.mutate(!s.platformPaid)}
        >
          {payment.isPending ? (
            "Saving…"
          ) : s.platformPaid ? (
            <>
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Mark unpaid
            </>
          ) : (
            <>
              <BadgeDollarSign className="h-3.5 w-3.5" aria-hidden />
              Mark both paid
            </>
          )}
        </Button>
      </div>

      <div className="rounded border border-line bg-panel p-3 space-y-2">
        <p className="font-mono text-[10px] uppercase text-ink-muted">
          Attendance
        </p>
        {visit.isLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !visit.data ? (
          <p className="text-sm text-ink-muted">
            Caregiver has not clocked in yet. Agency “Start shift” creates a
            manual attendance record.
          </p>
        ) : (
          <>
            <p className="text-sm">
              <span className="font-medium">
                {[visit.data.caregiverFirstName, visit.data.caregiverLastName]
                  .filter(Boolean)
                  .join(" ") || "Caregiver"}
              </span>{" "}
              clocked in{" "}
              <span className="tabular-nums">
                {new Date(visit.data.clockInAt).toLocaleString()}
              </span>{" "}
              · {visit.data.method}
            </p>
            <p
              className={`text-sm font-medium ${
                visit.data.clientArrivalConfirmed
                  ? "text-success"
                  : "text-warn"
              }`}
            >
              {visit.data.clientArrivalConfirmed
                ? `Client confirmed arrival${
                    visit.data.clientArrivalConfirmedAt
                      ? ` · ${new Date(
                          visit.data.clientArrivalConfirmedAt,
                        ).toLocaleString()}`
                      : ""
                  }`
                : "Client has not confirmed arrival yet"}
            </p>
            {visit.data.clockOutAt ? (
              <p className="text-sm text-ink-muted">
                Clocked out{" "}
                {new Date(visit.data.clockOutAt).toLocaleString()}
              </p>
            ) : null}
          </>
        )}
      </div>

      <AddressLink address={s} className="text-sm text-ink-muted" />
      {s.notes ? (
        <p className="whitespace-pre-wrap rounded border border-line bg-panel p-3 text-sm text-ink-muted">
          {s.notes}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {canStart ? (
          <Button
            size="sm"
            disabled={start.isPending}
            onClick={() =>
              ask("Mark this shift as started (in progress)?", () =>
                start.mutate(),
              )
            }
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start shift
          </Button>
        ) : null}
        {s.status === "IN_PROGRESS" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={revertStart.isPending}
            onClick={() =>
              ask("Undo start and return this shift to confirmed?", () =>
                revertStart.mutate(),
              )
            }
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Undo start
          </Button>
        ) : null}
        {canComplete ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={complete.isPending}
            onClick={() =>
              ask("Mark this shift as completed?", () => complete.mutate())
            }
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Complete shift
          </Button>
        ) : null}
        {s.status === "IN_PROGRESS" && isShiftBeforeScheduledEnd(s) ? (
          <p className="w-full text-xs text-ink-muted">
            Complete is available after the scheduled end time.
          </p>
        ) : null}
        {s.status === "COMPLETED" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={revertComplete.isPending}
            onClick={() =>
              ask(
                "Undo completion and return this shift to in progress? Unpaid settlements will be removed.",
                () => revertComplete.mutate(),
              )
            }
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Undo complete
          </Button>
        ) : null}
        {s.status !== "CANCELLED" && s.status !== "COMPLETED" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={cancel.isPending}
            onClick={() =>
              ask("Cancel this shift? This can be reopened later.", () =>
                cancel.mutate(),
              )
            }
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Cancel
          </Button>
        ) : null}
        {s.status === "CANCELLED" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={reopen.isPending}
            onClick={() =>
              ask("Reopen this cancelled shift?", () => reopen.mutate())
            }
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reopen
          </Button>
        ) : null}
        {allowEdit ? (
          <ButtonLink href={`/shifts/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </ButtonLink>
        ) : null}
        {allowDelete ? (
          <Button
            variant="danger"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (confirmAction("Delete this shift permanently?")) remove.mutate();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
