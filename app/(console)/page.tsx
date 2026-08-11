"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { getAdminClaims, getFinanceSummary, getOpsAttention, getShifts } from "@/lib/api";
import { formatMoney, defaultStatsDateRange } from "@/lib/format";
import {
  AlertTriangle,
  CircleDollarSign,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const statsRange = defaultStatsDateRange();
  const results = useQueries({
    queries: [
      {
        queryKey: ["dash-open"],
        queryFn: () => getShifts({ status: "OPEN", size: 1 }),
        retry: false,
      },
      {
        queryKey: ["dash-claimed"],
        queryFn: () => getShifts({ status: "CLAIMED", size: 1 }),
        retry: false,
      },
      {
        queryKey: ["dash-confirmed"],
        queryFn: () => getShifts({ status: "CONFIRMED", size: 1 }),
        retry: false,
      },
      {
        queryKey: ["dash-completed"],
        queryFn: () => getShifts({ status: "COMPLETED", size: 1 }),
        retry: false,
      },
      {
        queryKey: ["dash-claims"],
        queryFn: () => getAdminClaims({ size: 1 }),
        retry: false,
      },
    ],
  });

  const finance = useQuery({
    queryKey: ["dash-finance", statsRange.periodStart, statsRange.periodEnd],
    queryFn: () =>
      getFinanceSummary(statsRange.periodStart, statsRange.periodEnd),
    retry: false,
  });

  const attention = useQuery({
    queryKey: ["ops-attention"],
    queryFn: getOpsAttention,
    retry: false,
    refetchInterval: 60_000,
  });

  const [openQ, claimedQ, confirmedQ, completedQ, claimsQ] = results;
  const loading = results.some((r) => r.isLoading) || finance.isLoading;
  const claimsUnavailable = claimsQ.isError;
  const f = finance.data;
  const items = attention.data?.items ?? [];

  const kpis = [
    { label: "Open", value: openQ.data?.totalElements ?? "—" },
    { label: "Claimed", value: claimedQ.data?.totalElements ?? "—" },
    { label: "Confirmed", value: confirmedQ.data?.totalElements ?? "—" },
    { label: "Completed", value: completedQ.data?.totalElements ?? "—" },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <LayoutDashboard className="h-5 w-5 text-ink-muted" aria-hidden />
            Operations dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            What needs a decision today — continuity gaps, seats, credentials,
            money, and visit exceptions.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/finance" size="sm" variant="secondary">
            <CircleDollarSign className="h-3.5 w-3.5" aria-hidden />
            Finance
          </ButtonLink>
          <ButtonLink href="/shifts/new" size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New shift
          </ButtonLink>
        </div>
      </div>

      {attention.isLoading ? (
        <p className="text-sm text-ink-muted">Checking what needs attention…</p>
      ) : items.length > 0 ? (
        <section className="space-y-2">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Needs attention
          </p>
          <ul className="divide-y divide-line rounded border border-line bg-panel">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase ${
                      item.severity === "high"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-line/60 text-ink-muted"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : attention.isSuccess ? (
        <section className="rounded border border-line bg-panel px-4 py-3 text-sm text-ink-muted">
          Nothing urgent — open seats, credentials, invoices, and EVV look clear.
        </section>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading KPIs…</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded border border-line bg-panel px-4 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {k.label}
                </p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                  {k.value}
                </p>
              </div>
            ))}
          </section>

          {f ? (
            <section className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Last 7 days {f.periodStart} → {f.periodEnd}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Client pending",
                    value: formatMoney(Number(f.clientPending)),
                  },
                  {
                    label: "Caregiver due",
                    value: formatMoney(Number(f.caregiverPending)),
                  },
                  {
                    label: "Agency margin",
                    value: formatMoney(Number(f.agencyMarginAccrued)),
                  },
                  {
                    label: "Margin collected",
                    value: formatMoney(Number(f.agencyMarginCollected)),
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded border border-line bg-panel px-4 py-3"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {k.label}
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-accent-deep">
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded border border-line bg-panel px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Claims
            </p>
            {claimsUnavailable ? (
              <p className="mt-2 text-sm text-ink-muted">
                Claims endpoint not available yet.
              </p>
            ) : (
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {claimsQ.data?.totalElements ?? 0}
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  total claims
                </span>
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
