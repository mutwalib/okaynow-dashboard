"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminClients, getShifts } from "@/lib/api";
import { formatDate, formatMoney, formatTime, shiftHours } from "@/lib/format";
import { useListPagination } from "@/lib/pagination";
import { QUALIFICATIONS, SHIFT_STATUSES } from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { ShiftListActions } from "@/components/shift-list-actions";
import { StatusBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { parseClientRef } from "@/components/shift-form";
import { CalendarClock, Plus } from "lucide-react";

export default function ShiftsPage() {
  const [status, setStatus] = useState("");
  const [qualification, setQualification] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [minPay, setMinPay] = useState("");
  const [maxPay, setMaxPay] = useState("");
  const [dayPeriod, setDayPeriod] = useState("");
  const filterKey = [
    status,
    qualification,
    dateFrom,
    dateTo,
    clientRef,
    minPay,
    maxPay,
    dayPeriod,
  ].join("|");
  const { page, setPage, pageSize, setPageSize } = useListPagination(filterKey);
  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => getAdminClients(),
  });
  const ownerFilter = parseClientRef(clientRef);

  const query = useQuery({
    queryKey: [
      "owner-shifts",
      status,
      qualification,
      dateFrom,
      dateTo,
      clientRef,
      minPay,
      maxPay,
      dayPeriod,
      page,
      pageSize,
    ],
    queryFn: () =>
      getShifts({
        status: status || undefined,
        qualification: qualification || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientProfileId: ownerFilter.clientProfileId,
        facilityProfileId: ownerFilter.facilityProfileId,
        minPay: minPay ? Number(minPay) : undefined,
        maxPay: maxPay ? Number(maxPay) : undefined,
        dayPeriod: dayPeriod || undefined,
        page,
        size: pageSize,
      }),
    retry: false,
  });

  const filtered = useMemo(() => {
    const rows = query.data?.content ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.city.toLowerCase().includes(q) ||
        s.addressLine.toLowerCase().includes(q) ||
        s.zip.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.requiredQualification.toLowerCase().includes(q),
    );
  }, [query.data?.content, search]);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <CalendarClock className="h-5 w-5 text-ink-muted" aria-hidden />
            Shifts
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {query.data
              ? `${query.data.totalElements} total`
              : "Search and filter the shift board"}
            . Drafts stay off this list until released. Use{" "}
            <span className="font-medium text-ink">Hold</span> on an open shift
            to hide it from the marketplace (status{" "}
            <span className="font-medium text-ink">HELD</span>).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportReportButtons
            type="SHIFTS"
            filters={{
              status: status || undefined,
              qualification: qualification || undefined,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              clientProfileId: ownerFilter.clientProfileId,
              facilityProfileId: ownerFilter.facilityProfileId,
              minPay: minPay || undefined,
              maxPay: maxPay || undefined,
              dayPeriod: dayPeriod || undefined,
            }}
          />
          <ButtonLink href="/schedule" size="sm" variant="secondary">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Calendar
          </ButtonLink>
          <ButtonLink href="/shifts/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Create shift
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-2 rounded border border-line bg-panel p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search city, address, ZIP, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Active (hide drafts)</option>
          {SHIFT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
        >
          <option value="">All qualifications</option>
          {QUALIFICATIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </Select>
        <Select
          value={clientRef}
          onChange={(e) => setClientRef(e.target.value)}
        >
          <option value="">All clients</option>
          {clients.data?.content.map((client) => {
            const ref = `${client.clientType}:${client.id}`;
            const name =
              client.clientType === "FACILITY" && client.facilityName
                ? client.facilityName
                : `${client.lastName}, ${client.firstName}`;
            const kind = client.clientType === "FACILITY" ? "Facility" : "Family";
            return (
              <option key={ref} value={ref}>
                [{kind}] {name}
              </option>
            );
          })}
        </Select>
        <Select value={dayPeriod} onChange={(e) => setDayPeriod(e.target.value)}>
          <option value="">Any time of day</option>
          <option value="MORNING">Morning · 5 AM–noon</option>
          <option value="AFTERNOON">Afternoon · noon–5 PM</option>
          <option value="EVENING">Evening · 5–9 PM</option>
          <option value="NIGHT">Night · 9 PM–5 AM</option>
          <option value="ALL_DAY">All day · 12+ hours</option>
        </Select>
        <Input
          type="number"
          min="0"
          placeholder="Minimum pay"
          value={minPay}
          onChange={(e) => setMinPay(e.target.value)}
        />
        <Input
          type="number"
          min="0"
          placeholder="Maximum pay"
          value={maxPay}
          onChange={(e) => setMaxPay(e.target.value)}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
        />
      </div>

      {query.isLoading ? (
        <p className="text-sm text-ink-muted">Loading shifts…</p>
      ) : query.isError ? (
        <p className="text-sm text-danger">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load shifts"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-panel">
          <table className="table-dense w-full min-w-[860px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Qual</th>
                <th>Pay</th>
                <th>Bill</th>
                <th>Platform payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-ink-muted">
                    No shifts match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/shifts/${s.id}`}
                        className="font-medium text-accent-deep hover:underline"
                      >
                        {formatDate(s.date)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-ink-muted">
                      {formatTime(s.startTime)}–{formatTime(s.endTime)}
                      <span className="ml-1 font-mono text-[11px]">
                        ({shiftHours(s).toFixed(1)}h)
                      </span>
                    </td>
                    <td>
                      <div className="max-w-[220px] truncate">
                        {s.city}, {s.state} {s.zip}
                      </div>
                    </td>
                    <td className="font-mono text-xs">{s.requiredQualification}</td>
                    <td className="tabular-nums">{formatMoney(Number(s.payRate))}</td>
                    <td className="tabular-nums">{formatMoney(Number(s.billRate))}</td>
                    <td>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          s.platformPaid
                            ? "bg-success/10 text-success"
                            : "bg-warn/10 text-warn"
                        }`}
                      >
                        {s.platformPaid ? "PAID" : "UNPAID"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <ShiftListActions shift={s} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {query.data ? (
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
