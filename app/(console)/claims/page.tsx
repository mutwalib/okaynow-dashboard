"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  cancelClaim,
  confirmClaim,
  getAdminClaims,
} from "@/lib/api";
import { confirmAction, promptDeclineReason } from "@/lib/confirm";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { ClaimBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import { Check, Handshake, X } from "lucide-react";

export default function ClaimsPage() {
  const [status, setStatus] = useState<ClaimStatus | "">("");
  const { page, setPage, pageSize, setPageSize } = useListPagination(status);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["owner-claims", status, page, pageSize],
    queryFn: () =>
      getAdminClaims({
        status: status || undefined,
        page,
        size: pageSize,
      }),
    retry: false,
  });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmClaim(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-claims"] });
      qc.invalidateQueries({ queryKey: ["owner-shifts"] });
      showToast("Claim confirmed", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const decline = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelClaim(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-claims"] });
      qc.invalidateQueries({ queryKey: ["owner-shifts"] });
      showToast("Claim declined", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const endpointMissing =
    query.isError &&
    query.error instanceof ApiError &&
    (query.error.status === 404 || query.error.status === 501);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <Handshake className="h-5 w-5 text-ink-muted" aria-hidden />
            Claims
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Confirm pending caregiver claims, or decline them with a reason.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-44"
            value={status}
            onChange={(e) => setStatus(e.target.value as ClaimStatus | "")}
          >
            <option value="">All statuses</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <ExportReportButtons
            type="CLAIMS"
            filters={{ status: status || undefined }}
          />
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-ink-muted">Loading claims…</p>
      ) : endpointMissing ? (
        <div className="rounded border border-dashed border-line bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-warn">
            Pending backend
          </p>
          <h2 className="mt-2 font-display text-lg font-semibold">
            Claims API not available yet
          </h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            This page expects{" "}
            <code className="font-mono text-xs">GET /api/admin/claims</code> and
            actions{" "}
            <code className="font-mono text-xs">
              POST /api/admin/claims/&#123;id&#125;/confirm|cancel
            </code>
            .
          </p>
        </div>
      ) : query.isError ? (
        <p className="text-sm text-danger">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load claims"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-panel">
          <table className="table-dense w-full min-w-[800px]">
            <thead>
              <tr>
                <th>Claimed</th>
                <th>Caregiver</th>
                <th>Shift</th>
                <th>Slots</th>
                <th>Rates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.content ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-muted">
                    No claims found.
                  </td>
                </tr>
              ) : (
                (query.data?.content ?? [])
                  .filter((c) => !status || c.status === status)
                  .map((c) => {
                    const caregiverName = `${c.caregiverFirstName} ${c.caregiverLastName}`;
                    const shiftLabel = `${formatDate(c.shift.date)} · ${formatTime(c.shift.startTime)}–${formatTime(c.shift.endTime)}`;
                    const needed = c.shift.requiredHeadcount ?? 1;
                    const filled = c.shift.filledSlots ?? 0;
                    return (
                      <tr key={c.id}>
                        <td className="whitespace-nowrap text-ink-muted">
                          {new Date(c.claimedAt).toLocaleString()}
                        </td>
                        <td>
                          <div className="font-medium">{caregiverName}</div>
                          <div className="font-mono text-[11px] text-ink-muted">
                            {c.caregiverEmail}
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/shifts/${c.shift.id}`}
                            className="text-accent-deep hover:underline"
                          >
                            {shiftLabel}
                          </Link>
                          <div className="text-[11px] text-ink-muted">
                            {c.shift.city}, {c.shift.state} ·{" "}
                            {c.shift.requiredQualification}
                          </div>
                          {c.cancelReason ? (
                            <div className="mt-1 text-[11px] text-danger">
                              Reason: {c.cancelReason}
                            </div>
                          ) : null}
                        </td>
                        <td className="font-mono text-xs tabular-nums">
                          {filled}/{needed}
                        </td>
                        <td className="tabular-nums text-ink-muted">
                          {`${formatMoney(Number(c.shift.payRate))} / ${formatMoney(Number(c.shift.billRate))}`}
                        </td>
                        <td>
                          <ClaimBadge status={c.status} />
                        </td>
                        <td>
                          {c.status === "PENDING" ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                disabled={confirm.isPending || decline.isPending}
                                onClick={() => {
                                  if (
                                    confirmAction(
                                      `Confirm claim by ${caregiverName}?`,
                                    )
                                  ) {
                                    confirm.mutate(c.id);
                                  }
                                }}
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={confirm.isPending || decline.isPending}
                                onClick={() => {
                                  const reason = promptDeclineReason();
                                  if (!reason) return;
                                  if (
                                    confirmAction(
                                      `Decline claim by ${caregiverName}?\n\nReason: ${reason}`,
                                    )
                                  ) {
                                    decline.mutate({ id: c.id, reason });
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}
      {query.data && !endpointMissing ? (
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalElements={query.data.totalElements}
          totalPages={query.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={query.isFetching}
        />
      ) : null}
    </div>
  );
}
