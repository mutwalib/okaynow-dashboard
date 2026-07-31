"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, UserMinus, UserPlus } from "lucide-react";
import {
  assignClientCaregiver,
  fillClientCaregiverOpenShifts,
  getCaregiverOptions,
  getClientCaregivers,
  unassignClientCaregiver,
} from "@/lib/api";
import type { AssignmentType } from "@/lib/types";
import { confirmAction } from "@/lib/confirm";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";

export function ClientRoster({ clientId }: { clientId: string }) {
  const [caregiverProfileId, setCaregiverProfileId] = useState("");
  const [assignmentType, setAssignmentType] =
    useState<AssignmentType>("ROTATIONAL");
  const [fillOpenShifts, setFillOpenShifts] = useState(true);
  const qc = useQueryClient();
  const { showToast } = useToast();

  const roster = useQuery({
    queryKey: ["client-roster", clientId],
    queryFn: () => getClientCaregivers(clientId),
  });
  const caregivers = useQuery({
    queryKey: ["caregiver-options"],
    queryFn: getCaregiverOptions,
  });

  function invalidateSchedule() {
    qc.invalidateQueries({ queryKey: ["client-roster", clientId] });
    qc.invalidateQueries({ queryKey: ["schedule-calendar"] });
    qc.invalidateQueries({ queryKey: ["admin-shifts"] });
  }

  const assign = useMutation({
    mutationFn: () =>
      assignClientCaregiver(clientId, {
        caregiverProfileId,
        assignmentType,
        fillOpenShifts,
      }),
    onSuccess: (result) => {
      invalidateSchedule();
      setCaregiverProfileId("");
      const filled = result.openShiftsFilled ?? 0;
      showToast(
        filled > 0
          ? `Added to roster and filled ${filled} open shift${filled === 1 ? "" : "s"}`
          : "Caregiver added to client roster",
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const fillOpens = useMutation({
    mutationFn: (assignmentId: string) =>
      fillClientCaregiverOpenShifts(clientId, assignmentId),
    onSuccess: (result) => {
      invalidateSchedule();
      const filled = result.openShiftsFilled ?? 0;
      showToast(
        filled > 0
          ? `Filled ${filled} open shift${filled === 1 ? "" : "s"} (no new shifts created)`
          : "No open shifts needed staffing",
        filled > 0 ? "success" : "info",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: ({
      assignmentId,
      clearSchedule,
    }: {
      assignmentId: string;
      clearSchedule: boolean;
    }) => unassignClientCaregiver(clientId, assignmentId, clearSchedule),
    onSuccess: (result) => {
      invalidateSchedule();
      const released = result.scheduleClaimsReleased ?? 0;
      showToast(
        released > 0
          ? `Removed from roster and cleared ${released} upcoming schedule assignment${released === 1 ? "" : "s"}`
          : "Caregiver removed from roster",
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const assignedIds = new Set(
    (roster.data ?? []).map((row) => row.caregiverProfileId),
  );
  const available = (caregivers.data ?? []).filter((c) => !assignedIds.has(c.id));

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
        Caregiver roster
      </p>
      <p className="mb-3 text-xs text-ink-muted">
        PRIMARY = dedicated caregiver. ROTATIONAL = shared pool. Add someone to
        fill existing open shifts without creating new ones. Remove detaches
        them from the roster and clears their upcoming schedule for this client.
      </p>

      {roster.isLoading ? (
        <p className="text-xs text-ink-muted">Loading roster…</p>
      ) : null}

      <ul className="space-y-2">
        {(roster.data ?? []).map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-2.5 py-2 text-xs"
          >
            <div>
              <span className="font-semibold">
                {row.caregiverFirstName} {row.caregiverLastName}
              </span>
              <span className="text-ink-muted"> · {row.caregiverEmail}</span>
              <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px]">
                {row.assignmentType}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={fillOpens.isPending || remove.isPending}
                onClick={() => fillOpens.mutate(row.id)}
                title="Assign onto existing open shifts only"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                Fill opens
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={remove.isPending}
                onClick={() => {
                  if (
                    !confirmAction(
                      `Remove ${row.caregiverFirstName} ${row.caregiverLastName} from this client's roster and clear their upcoming schedule assignments?`,
                    )
                  ) {
                    return;
                  }
                  remove.mutate({ assignmentId: row.id, clearSchedule: true });
                }}
              >
                <UserMinus className="h-3.5 w-3.5" aria-hidden />
                Detach
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {!roster.isLoading && (roster.data?.length ?? 0) === 0 ? (
        <p className="text-xs text-ink-muted">No recruited caregivers yet.</p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Add caregiver">
          <Select
            value={caregiverProfileId}
            onChange={(e) => setCaregiverProfileId(e.target.value)}
          >
            <option value="">Choose caregiver…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} ({c.email})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
          >
            <option value="PRIMARY">PRIMARY</option>
            <option value="ROTATIONAL">ROTATIONAL</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button
            size="sm"
            disabled={!caregiverProfileId || assign.isPending}
            onClick={() => assign.mutate()}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            {assign.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
      <label className="mt-2 flex items-start gap-2 text-xs text-ink-muted">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={fillOpenShifts}
          onChange={(e) => setFillOpenShifts(e.target.checked)}
        />
        <span>
          Also assign onto existing open / draft / held shifts that still need
          staff (does not create new shifts).
        </span>
      </label>
    </div>
  );
}
