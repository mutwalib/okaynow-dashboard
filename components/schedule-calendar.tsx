"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  UserRound,
  UserRoundX,
  Megaphone,
  Store,
} from "lucide-react";
import {
  closeShiftMarketplace,
  getScheduleCalendar,
  requestShiftReplacement,
} from "@/lib/api";
import { formatTime, isShiftBeforeScheduledEnd, toIsoDate } from "@/lib/format";
import type { ScheduleShiftCard } from "@/lib/types";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { Field, Select } from "@/components/ui/field";
import { ConfirmModal } from "@/components/ui/modal";
import {
  MarketplaceCoverageModal,
  type MarketplaceCoverageDraft,
} from "@/components/marketplace-coverage-modal";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(12, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function isPastDate(iso: string): boolean {
  return iso < todayIso();
}

export function ScheduleCalendar({
  clients,
}: {
  clients?: { value: string; label: string }[];
}) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [clientFilter, setClientFilter] = useState("");
  const [coverageDraft, setCoverageDraft] =
    useState<MarketplaceCoverageDraft | null>(null);
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);

  const from = toIsoDate(weekStart);
  const to = toIsoDate(addDays(weekStart, 6));

  const filterIds = (() => {
    if (!clientFilter) return {};
    const [kind, id] = clientFilter.split(":");
    if (!id) return {};
    if (kind === "FACILITY") return { facilityProfileId: id };
    if (kind === "FAMILY") return { clientProfileId: id };
    return { clientProfileId: clientFilter };
  })();

  const calendar = useQuery({
    queryKey: ["schedule-calendar", from, to, clientFilter],
    queryFn: () =>
      getScheduleCalendar(
        from,
        to,
        filterIds.clientProfileId,
        filterIds.facilityProfileId,
      ),
  });

  const replace = useMutation({
    mutationFn: ({
      id,
      reason,
      slots,
    }: {
      id: string;
      reason?: string;
      slots?: number;
    }) => requestShiftReplacement(id, reason, slots),
    onSuccess: () => {
      setCoverageDraft(null);
      qc.invalidateQueries({ queryKey: ["schedule-calendar"] });
      qc.invalidateQueries({ queryKey: ["admin-shifts"] });
      showToast("Opened for marketplace coverage", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const closeMarket = useMutation({
    mutationFn: (id: string) => closeShiftMarketplace(id),
    onSuccess: () => {
      setCloseShiftId(null);
      qc.invalidateQueries({ queryKey: ["schedule-calendar"] });
      qc.invalidateQueries({ queryKey: ["admin-shifts"] });
      showToast("Marketplace openings closed", "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const days = useMemo(() => {
    const map = new Map(
      (calendar.data ?? []).map((d) => [d.date, d.shifts] as const),
    );
    return Array.from({ length: 7 }, (_, i) => {
      const date = toIsoDate(addDays(weekStart, i));
      return { date, shifts: map.get(date) ?? [] };
    });
  }, [calendar.data, weekStart]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">
            {formatDayLabel(from)} – {formatDayLabel(to)}
          </p>
          <p className="text-sm text-ink-muted">
            Past days are history only. Coverage stays private until someone
            opens a date to the marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {clients && clients.length > 0 ? (
            <Field label="Client">
              <Select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {calendar.isLoading ? (
        <p className="text-sm text-ink-muted">Loading schedule…</p>
      ) : calendar.isError ? (
        <p className="text-sm text-danger">Could not load schedule.</p>
      ) : (
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {days.map((day) => {
            const past = isPastDate(day.date);
            const isToday = day.date === todayIso();
            return (
              <section
                key={day.date}
                className={`flex min-h-[11rem] flex-col rounded border p-2 ${
                  past
                    ? "border-line/50 bg-canvas/60 opacity-75"
                    : isToday
                      ? "border-accent bg-accent/5"
                      : "border-line bg-panel"
                }`}
              >
                <header className="mb-2 border-b border-line pb-1">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                      "en-US",
                      { weekday: "short" },
                    )}
                    {past ? " · past" : ""}
                  </p>
                  <p
                    className={`text-sm font-medium tabular-nums ${
                      past ? "text-ink-muted" : ""
                    }`}
                  >
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </p>
                </header>
                {day.shifts.length === 0 ? (
                  <p className="text-xs text-ink-muted">No shift</p>
                ) : (
                  <ul className="space-y-2">
                    {day.shifts.map((shift) => (
                      <li key={shift.id}>
                        <AdminShiftCard
                          shift={shift}
                          past={
                            past ||
                            !isShiftBeforeScheduledEnd({
                              date: day.date,
                              startTime: shift.startTime,
                              endTime: shift.endTime,
                            })
                          }
                          busy={replace.isPending || closeMarket.isPending}
                          onRequestReplacement={() => {
                            if (
                              !isShiftBeforeScheduledEnd({
                                date: day.date,
                                startTime: shift.startTime,
                                endTime: shift.endTime,
                              })
                            ) {
                              return;
                            }
                            const required = Math.max(1, shift.requiredHeadcount);
                            const filled = shift.filledSlots;
                            const remaining = Math.max(0, required - filled);
                            const marketOpen = shift.marketplaceSlots ?? 0;
                            const maxSlots =
                              remaining > 0
                                ? Math.max(0, remaining - marketOpen)
                                : filled;
                            if (maxSlots < 1) return;
                            setCoverageDraft({
                              shiftId: shift.id,
                              maxSlots,
                              defaultSlots: remaining > 0 ? maxSlots : 1,
                              mode: remaining > 0 ? "remaining" : "replace",
                              required,
                              filled,
                              remaining,
                              marketOpen,
                              timeLabel: `${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`,
                            });
                          }}
                          onCloseMarketplace={() => {
                            setCloseShiftId(shift.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <MarketplaceCoverageModal
        draft={coverageDraft}
        busy={replace.isPending}
        onClose={() => setCoverageDraft(null)}
        onConfirm={(slots) => {
          if (!coverageDraft) return;
          replace.mutate({
            id: coverageDraft.shiftId,
            slots,
            reason:
              coverageDraft.mode === "remaining"
                ? "Coverage requested"
                : "Caregiver call-out — replacement requested",
          });
        }}
      />
      <ConfirmModal
        open={!!closeShiftId}
        title="Close marketplace"
        body="Withdraw unclaimed marketplace openings for this date? This only works before a caregiver claims a slot."
        confirmLabel="Close marketplace"
        busy={closeMarket.isPending}
        onClose={() => setCloseShiftId(null)}
        onConfirm={() => {
          if (closeShiftId) closeMarket.mutate(closeShiftId);
        }}
      />
    </div>
  );
}

function AdminShiftCard({
  shift,
  past,
  busy,
  onRequestReplacement,
  onCloseMarketplace,
}: {
  shift: ScheduleShiftCard;
  past: boolean;
  busy: boolean;
  onRequestReplacement: () => void;
  onCloseMarketplace: () => void;
}) {
  const required = Math.max(1, shift.requiredHeadcount);
  const filled = shift.filledSlots;
  const missing = Math.max(0, required - filled);
  const marketOpen = shift.marketplaceSlots ?? 0;
  const maxOpen = missing > 0 ? Math.max(0, missing - marketOpen) : filled;
  const showRequest =
    !past &&
    maxOpen > 0 &&
    !["COMPLETED", "CANCELLED", "NO_SHOW", "IN_PROGRESS"].includes(
      shift.status,
    );
  const showClose =
    !past &&
    !!shift.marketplacePosted &&
    marketOpen > 0 &&
    !["COMPLETED", "CANCELLED", "NO_SHOW", "IN_PROGRESS"].includes(
      shift.status,
    );

  return (
    <div
      className={`rounded border p-2 text-xs ${
        past ? "border-line/50 bg-canvas/40" : "border-line bg-canvas"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/shifts/${shift.id}`}
          className="font-medium text-accent-deep hover:underline"
        >
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
        </Link>
        <StatusBadge status={shift.status} />
      </div>
      {shift.scheduleType === "DAILY_ROUTINE" ? (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
          Daily routine
        </p>
      ) : null}
      {shift.clientLabel ? (
        <p className="mt-0.5 truncate text-ink-muted">{shift.clientLabel}</p>
      ) : null}
      <p
        className={`mt-0.5 tabular-nums ${
          missing > 0 && shift.marketplacePosted ? "text-warn" : "text-ink"
        }`}
      >
        {filled}/{required} CG
        {missing > 0 ? ` · ${missing} missing` : " · filled"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {shift.roster.map((slot) => (
          <li key={slot.claimId} className="flex items-center gap-1">
            <UserRound className="h-3 w-3 text-ink-muted" aria-hidden />
            <span className="truncate">
              {slot.firstName} {slot.lastName}
            </span>
          </li>
        ))}
        {Array.from({ length: missing }).map((_, i) => (
          <li
            key={`open-${i}`}
            className={`flex items-center gap-1 ${
              shift.marketplacePosted ? "text-warn" : "text-ink-muted"
            }`}
          >
            <UserRoundX className="h-3 w-3" aria-hidden />
            {shift.marketplacePosted ? "Open slot" : "Unfilled (private)"}
          </li>
        ))}
      </ul>
      {showRequest ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 w-full"
          disabled={busy}
          onClick={onRequestReplacement}
        >
          <Megaphone className="h-3 w-3" aria-hidden />
          {filled === 0 ? "Need coverage" : "Call out → market"}
        </Button>
      ) : null}
      {showClose ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 w-full"
          disabled={busy}
          onClick={onCloseMarketplace}
        >
          <Store className="h-3 w-3" aria-hidden />
          Close marketplace
        </Button>
      ) : null}
      {shift.marketplacePosted && !past ? (
        <p className="mt-1 text-[11px] text-warn">Marketplace open</p>
      ) : null}
    </div>
  );
}
