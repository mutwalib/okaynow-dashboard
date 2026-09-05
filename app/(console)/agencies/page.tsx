"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ExternalLink, Users } from "lucide-react";
import {
  getSuperAgency,
  listSuperAgencies,
  updateSuperAgencySubscription,
  updateUserStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";
import {
  SUBSCRIPTION_PLAN_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UserStatus,
} from "@/lib/types";

const STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "PAST_DUE",
  "EXPIRED",
  "CANCELLED",
  "TRIAL",
];

const PLANS: SubscriptionPlan[] = ["STARTER", "PROFESSIONAL", "FEATURED"];

const USER_STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_REVIEW",
  "PENDING_VERIFICATION",
  "RESTRICTED",
  "SUSPENDED",
  "DEACTIVATED",
];

export default function AgenciesPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [subPlan, setSubPlan] = useState<SubscriptionPlan>("STARTER");
  const [directoryListed, setDirectoryListed] = useState(true);
  const [periodEnd, setPeriodEnd] = useState("");

  const agencies = useQuery({
    queryKey: ["super-agencies"],
    queryFn: listSuperAgencies,
  });

  const detail = useQuery({
    queryKey: ["super-agency", selectedId],
    queryFn: () => getSuperAgency(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    const fromUrl = searchParams.get("agencyId");
    if (fromUrl) setSelectedId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!detail.data) return;
    setSubStatus(detail.data.subscriptionStatus);
    setSubPlan(detail.data.subscriptionPlan);
    setDirectoryListed(detail.data.directoryListed);
    setPeriodEnd(
      detail.data.subscriptionPeriodEnd
        ? detail.data.subscriptionPeriodEnd.slice(0, 10)
        : "",
    );
  }, [detail.data]);

  const filtered = useMemo(() => {
    const items = agencies.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.city?.toLowerCase().includes(q) ?? false),
    );
  }, [agencies.data, search]);

  const saveSubscription = useMutation({
    mutationFn: () =>
      updateSuperAgencySubscription(selectedId!, {
        subscriptionStatus: subStatus,
        subscriptionPlan: subPlan,
        directoryListed,
        subscriptionPeriodEnd: periodEnd
          ? new Date(periodEnd).toISOString()
          : null,
      }),
    onSuccess: () => {
      showToast("Agency subscription updated", "success");
      queryClient.invalidateQueries({ queryKey: ["super-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["super-agency", selectedId] });
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const changeUserStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      showToast("Staff status updated", "success");
      queryClient.invalidateQueries({ queryKey: ["super-agency", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  function selectAgency(id: string) {
    setSelectedId(id);
    const row = agencies.data?.find((a) => a.id === id);
    if (row) {
      setSubStatus(row.subscriptionStatus);
      setSubPlan(row.subscriptionPlan);
      setDirectoryListed(row.directoryListed);
      setPeriodEnd(
        row.subscriptionPeriodEnd
          ? row.subscriptionPeriodEnd.slice(0, 10)
          : "",
      );
    }
  }

  const agency = detail.data;

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Building2 className="h-5 w-5 text-ink-muted" aria-hidden />
          Agencies & tenants
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          View all subscribed agencies, manage subscription access, and review
          agency staff accounts.
        </p>
      </div>

      <Input
        placeholder="Search by name, slug, or city…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="overflow-x-auto rounded border border-line bg-panel">
          <table className="table-dense w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Agency</th>
                <th>Subscription</th>
                <th>Staff</th>
                <th>Directory</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className={selectedId === a.id ? "bg-brand-soft/40" : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="text-left font-medium text-brand-deep hover:underline"
                      onClick={() => selectAgency(a.id)}
                    >
                      {a.displayName}
                    </button>
                    <div className="text-[11px] text-ink-muted">{a.slug}</div>
                    {(a.city || a.state) && (
                      <div className="text-[11px] text-ink-muted">
                        {[a.city, a.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-mono text-[10px]">
                      {SUBSCRIPTION_STATUS_LABEL[a.subscriptionStatus]}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {SUBSCRIPTION_PLAN_LABEL[a.subscriptionPlan]}
                    </div>
                  </td>
                  <td>{a.staffCount}</td>
                  <td>
                    {a.directoryListed ? "Listed" : "Hidden"}
                    {a.hiringOpen ? " · Hiring" : ""}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-muted">
                    {agencies.isLoading ? "Loading…" : "No agencies found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="rounded border border-line bg-panel p-4">
          {!selectedId ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <Building2 className="h-8 w-8 text-ink-muted" aria-hidden />
              <p className="text-sm font-medium">Select an agency</p>
              <p className="max-w-sm text-sm text-ink-muted">
                Choose a tenant to manage subscription settings and staff access.
              </p>
            </div>
          ) : detail.isLoading ? (
            <p className="text-sm text-ink-muted">Loading agency…</p>
          ) : agency ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {agency.displayName}
                </h2>
                <p className="text-sm text-ink-muted">{agency.legalName}</p>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  {agency.slug}
                </p>
                {agency.addressLine || agency.city ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    {[agency.addressLine, agency.city, agency.state, agency.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {agency.publicDescription ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    {agency.publicDescription}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/users?role=AGENCY_ADMIN&agencyId=${agency.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-deep hover:underline"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    View staff in Users
                  </Link>
                  <a
                    href={`${process.env.NEXT_PUBLIC_MARKETPLACE_APP_URL || "http://localhost:3000"}/agencies/${agency.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-deep hover:underline"
                  >
                    Public profile
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </div>

              <section className="space-y-3 rounded border border-line bg-surface p-3">
                <h3 className="text-sm font-semibold">Subscription controls</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-ink-muted">
                    Status
                    <Select
                      className="mt-1"
                      value={subStatus}
                      onChange={(e) =>
                        setSubStatus(e.target.value as SubscriptionStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {SUBSCRIPTION_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="text-xs text-ink-muted">
                    Plan
                    <Select
                      className="mt-1"
                      value={subPlan}
                      onChange={(e) =>
                        setSubPlan(e.target.value as SubscriptionPlan)
                      }
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {SUBSCRIPTION_PLAN_LABEL[p]}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={directoryListed}
                    onChange={(e) => setDirectoryListed(e.target.checked)}
                  />
                  Listed in public directory
                </label>
                <label className="block text-xs text-ink-muted">
                  Period end (optional)
                  <Input
                    type="date"
                    className="mt-1"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  disabled={saveSubscription.isPending}
                  onClick={() => saveSubscription.mutate()}
                >
                  {saveSubscription.isPending ? "Saving…" : "Save subscription"}
                </Button>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Agency staff</h3>
                {agency.staff.length === 0 ? (
                  <p className="text-sm text-ink-muted">No staff linked yet.</p>
                ) : (
                  agency.staff.map((member) => (
                    <div
                      key={member.staffId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{member.email}</p>
                        <p className="text-xs text-ink-muted">
                          {member.staffRole} · joined{" "}
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Select
                        value={member.status}
                        disabled={changeUserStatus.isPending}
                        onChange={(e) =>
                          changeUserStatus.mutate({
                            userId: member.userId,
                            status: e.target.value as UserStatus,
                          })
                        }
                      >
                        {USER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
