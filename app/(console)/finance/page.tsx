"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFinanceSettlements,
  getFinanceSummary,
  updateSettlementCaregiverPayment,
  updateSettlementClientPayment,
} from "@/lib/api";
import { formatMoney, defaultStatsDateRange, toIsoDate } from "@/lib/format";
import { confirmAction } from "@/lib/confirm";
import type { PaymentStatus } from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { ClientInvoicesPanel } from "@/components/client-invoices-panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  Banknote,
  CalendarRange,
  CheckCircle2,
  ListChecks,
  Receipt,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useListPagination } from "@/lib/pagination";

type FinanceTab = "settlements" | "invoices";

export default function FinancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<FinanceTab>("settlements");
  const defaults = defaultStatsDateRange();
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [clientFilter, setClientFilter] = useState<"" | PaymentStatus>("");
  const [caregiverFilter, setCaregiverFilter] = useState<"" | PaymentStatus>("");
  const [settlementQuery, setSettlementQuery] = useState("");
  const [debouncedSettlementQuery, setDebouncedSettlementQuery] = useState("");
  const settlementFilterKey = [
    periodStart,
    periodEnd,
    clientFilter,
    caregiverFilter,
    debouncedSettlementQuery,
  ].join("|");
  const { page, setPage, pageSize, setPageSize } =
    useListPagination(settlementFilterKey);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSettlementQuery(settlementQuery.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [settlementQuery]);

  const filters = useMemo(
    () => ({
      periodStart,
      periodEnd,
      clientPaymentStatus: clientFilter || undefined,
      caregiverPaymentStatus: caregiverFilter || undefined,
      q: debouncedSettlementQuery || undefined,
      page,
      size: pageSize,
    }),
    [
      periodStart,
      periodEnd,
      clientFilter,
      caregiverFilter,
      debouncedSettlementQuery,
      page,
      pageSize,
    ],
  );

  const summary = useQuery({
    queryKey: ["finance-summary", filters.periodStart, filters.periodEnd],
    queryFn: () => getFinanceSummary(filters.periodStart, filters.periodEnd),
    enabled: tab === "settlements",
  });

  const settlements = useQuery({
    queryKey: ["finance-settlements", filters],
    queryFn: () => getFinanceSettlements(filters),
    enabled: tab === "settlements",
  });

  const markClient = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      updateSettlementClientPayment(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
    },
  });

  const markCaregiver = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      updateSettlementCaregiverPayment(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
    },
  });

  const s = summary.data;

  const kpis = s
    ? [
        { label: "Shifts", value: String(s.completedShifts) },
        { label: "Hours", value: Number(s.totalHours).toFixed(1) },
        { label: "Client billed", value: formatMoney(Number(s.clientBilled)) },
        {
          label: "Client pending",
          value: formatMoney(Number(s.clientPending)),
        },
        {
          label: "Caregiver due",
          value: formatMoney(Number(s.caregiverPending)),
        },
        {
          label: "Caregiver paid",
          value: formatMoney(Number(s.caregiverPaid)),
        },
        {
          label: "Agency margin",
          value: formatMoney(Number(s.agencyMarginAccrued)),
        },
        {
          label: "Margin collected",
          value: formatMoney(Number(s.agencyMarginCollected)),
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in">
      <p className="text-sm text-ink-muted">
        Shift settlements track per-shift collections and payouts. Invoicing
        bills families and facilities (including fee invoices).
      </p>

      <div
        role="tablist"
        aria-label="Finance sections"
        className="sticky top-[calc(3.25rem+2.75rem)] z-[65] -mx-4 flex gap-1 border-b border-line bg-canvas/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-canvas/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:top-[3.25rem]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settlements"}
          id="tab-settlements"
          aria-controls="panel-settlements"
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            tab === "settlements"
              ? "border-accent text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
          onClick={() => setTab("settlements")}
        >
          <ListChecks className="h-4 w-4" aria-hidden />
          Shift settlements
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invoices"}
          id="tab-invoices"
          aria-controls="panel-invoices"
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            tab === "invoices"
              ? "border-accent text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
          onClick={() => setTab("invoices")}
        >
          <Receipt className="h-4 w-4" aria-hidden />
          Invoicing
        </button>
      </div>

      {tab === "settlements" ? (
        <section
          role="tabpanel"
          id="panel-settlements"
          aria-labelledby="tab-settlements"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-ink-muted">
              Filters apply to the KPIs and settlement table only. Fee invoices
              (conversion, rejection) live under Invoicing.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const range = defaultStatsDateRange();
                  setPeriodStart(range.periodStart);
                  setPeriodEnd(range.periodEnd);
                  setClientFilter("");
                  setCaregiverFilter("");
                  setSettlementQuery("");
                }}
              >
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                Last 7 days
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCaregiverFilter("PENDING");
                  setClientFilter("");
                }}
              >
                <Banknote className="h-3.5 w-3.5" aria-hidden />
                CG to pay
              </Button>
              <ExportReportButtons
                type="FINANCE"
                filters={{
                  periodStart,
                  periodEnd,
                  clientPaymentStatus: clientFilter || undefined,
                  caregiverPaymentStatus: caregiverFilter || undefined,
                }}
              />
            </div>
          </div>

          <div className="rounded border border-line bg-panel p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
              Settlement filters
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Shift date from">
                <Input
                  type="date"
                  value={periodStart}
                  max={periodEnd || toIsoDate(new Date())}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </Field>
              <Field label="Shift date to">
                <Input
                  type="date"
                  value={periodEnd}
                  min={periodStart || undefined}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </Field>
              <Field label="Search people">
                <Input
                  value={settlementQuery}
                  onChange={(e) => setSettlementQuery(e.target.value)}
                  placeholder="Caregiver or client name…"
                />
              </Field>
              <Field label="Client payment">
                <Select
                  value={clientFilter}
                  onChange={(e) =>
                    setClientFilter(e.target.value as "" | PaymentStatus)
                  }
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </Select>
              </Field>
              <Field label="Caregiver payment">
                <Select
                  value={caregiverFilter}
                  onChange={(e) =>
                    setCaregiverFilter(e.target.value as "" | PaymentStatus)
                  }
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending (to pay)</option>
                  <option value="PAID">Paid</option>
                </Select>
              </Field>
            </div>
          </div>

          {summary.isLoading ? (
            <p className="text-sm text-ink-muted">Loading summary…</p>
          ) : summary.isError ? (
            <p className="text-sm text-danger">Could not load finance summary.</p>
          ) : s ? (
            <>
              <p className="font-mono text-xs text-ink-muted">
                Settlement period {s.periodStart} → {s.periodEnd}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((k) => (
                  <div
                    key={k.label}
                    className="rounded border border-line bg-panel px-4 py-3"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {k.label}
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="overflow-x-auto rounded border border-line bg-panel">
            <table className="table-dense w-full min-w-[1080px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Caregiver</th>
                  <th>Hours</th>
                  <th>Client $</th>
                  <th>Caregiver $</th>
                  <th>Agency $</th>
                  <th>Client pay</th>
                  <th>CG pay</th>
                  <th>Period</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settlements.data?.content.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/shifts/${row.shiftId}`}
                        className="font-medium text-accent-deep hover:underline"
                      >
                        {row.shiftDate}
                      </Link>
                    </td>
                    <td>
                      {row.facilityName
                        ? row.facilityName
                        : row.clientFirstName || row.clientLastName
                          ? `${row.clientFirstName ?? ""} ${row.clientLastName ?? ""}`.trim()
                          : "—"}
                    </td>
                    <td>
                      {row.caregiverFirstName} {row.caregiverLastName}
                    </td>
                    <td className="tabular-nums">
                      {Number(row.hours).toFixed(2)}
                    </td>
                    <td className="tabular-nums">
                      {formatMoney(Number(row.clientAmount))}
                    </td>
                    <td className="tabular-nums">
                      {formatMoney(Number(row.caregiverAmount))}
                    </td>
                    <td className="tabular-nums text-accent-deep">
                      {formatMoney(Number(row.agencyAmount))}
                    </td>
                    <td>
                      <span
                        className={
                          row.clientPaymentStatus === "PAID"
                            ? "text-success"
                            : "text-warn"
                        }
                      >
                        {row.clientPaymentStatus}
                        {row.clientInvoiceId ? " · INV" : ""}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          row.caregiverPaymentStatus === "PAID"
                            ? "text-success"
                            : "text-warn"
                        }
                      >
                        {row.caregiverPaymentStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[11px] text-ink-muted">
                      {row.payPeriodStart} → {row.payPeriodEnd}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={markClient.isPending}
                          onClick={() => {
                            const next =
                              row.clientPaymentStatus === "PAID"
                                ? "PENDING"
                                : "PAID";
                            if (
                              !confirmAction(
                                next === "PAID"
                                  ? `Mark client payment PAID for the ${row.shiftDate} shift (${formatMoney(Number(row.clientAmount))})?`
                                  : `Mark client payment unpaid again for the ${row.shiftDate} shift?`,
                              )
                            ) {
                              return;
                            }
                            markClient.mutate({ id: row.id, status: next });
                          }}
                        >
                          {row.clientPaymentStatus === "PAID" ? (
                            <>
                              <Undo2 className="h-3.5 w-3.5" aria-hidden />
                              Unpay client
                            </>
                          ) : (
                            <>
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden
                              />
                              Client paid
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          disabled={markCaregiver.isPending}
                          onClick={() => {
                            const next =
                              row.caregiverPaymentStatus === "PAID"
                                ? "PENDING"
                                : "PAID";
                            if (
                              !confirmAction(
                                next === "PAID"
                                  ? `Mark caregiver paid for the ${row.shiftDate} shift (${formatMoney(Number(row.caregiverAmount))})?`
                                  : `Mark caregiver payment unpaid again for the ${row.shiftDate} shift?`,
                              )
                            ) {
                              return;
                            }
                            markCaregiver.mutate({ id: row.id, status: next });
                          }}
                        >
                          {row.caregiverPaymentStatus === "PAID" ? (
                            <>
                              <Undo2 className="h-3.5 w-3.5" aria-hidden />
                              Unpay CG
                            </>
                          ) : (
                            <>
                              <Banknote className="h-3.5 w-3.5" aria-hidden />
                              Pay CG
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!settlements.isLoading &&
                (settlements.data?.content.length ?? 0) === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-8 text-center text-ink-muted"
                    >
                      No settlements match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {settlements.data ? (
            <ListPagination
              page={page}
              pageSize={pageSize}
              totalElements={settlements.data.totalElements}
              totalPages={settlements.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={settlements.isFetching}
            />
          ) : null}
        </section>
      ) : (
        <section
          role="tabpanel"
          id="panel-invoices"
          aria-labelledby="tab-invoices"
        >
          <ClientInvoicesPanel />
        </section>
      )}
    </div>
  );
}
