"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, RotateCcw, Save } from "lucide-react";
import {
  listPlanCapabilities,
  listSuperSubscriptionPlans,
  updateSuperSubscriptionPlan,
} from "@/lib/api";
import {
  PLAN_DEFAULT_TAGLINE,
  capabilityCodesFromFeatures,
  capabilitiesForPlan,
  featuresFromCapabilityCodes,
  groupByCategory,
  inheritedCapabilities,
  recommendedCapabilityCodes,
} from "@/lib/plan-capabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";
import type { SubscriptionPlan, SubscriptionPlanCatalogEntry } from "@/lib/types";

const PLAN_ORDER: SubscriptionPlan[] = ["STARTER", "PROFESSIONAL", "FEATURED"];

function centsToDollars(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0.5) return null;
  return Math.round(parsed * 100);
}

function formatPricePreview(cents: number): string {
  if (cents < 50) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100) + "/mo";
}

type PlanDraft = {
  displayName: string;
  tagline: string;
  monthlyPriceUsd: string;
  capabilityCodes: string[];
  enabled: boolean;
};

function emptyDraft(): PlanDraft {
  return {
    displayName: "",
    tagline: "",
    monthlyPriceUsd: "",
    capabilityCodes: [],
    enabled: true,
  };
}

export default function SubscriptionPlansPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SubscriptionPlan>("STARTER");
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);

  const plans = useQuery({
    queryKey: ["super-subscription-plans"],
    queryFn: listSuperSubscriptionPlans,
  });

  const capabilities = useQuery({
    queryKey: ["plan-capabilities"],
    queryFn: listPlanCapabilities,
  });

  const current = plans.data?.find((p) => p.plan === selected);
  const allCaps = capabilities.data ?? [];

  useEffect(() => {
    if (!current || allCaps.length === 0) return;
    setDraft({
      displayName: current.displayName,
      tagline: current.tagline ?? PLAN_DEFAULT_TAGLINE[current.plan],
      monthlyPriceUsd: centsToDollars(current.monthlyPriceCents),
      capabilityCodes: capabilityCodesFromFeatures(
        allCaps,
        current.plan,
        current.features,
      ),
      enabled: current.enabled,
    });
  }, [current, allCaps]);

  const tierCapabilities = useMemo(
    () => capabilitiesForPlan(allCaps, selected),
    [allCaps, selected],
  );

  const inherited = useMemo(
    () => inheritedCapabilities(allCaps, selected),
    [allCaps, selected],
  );

  const draftFeatures = useMemo(
    () => featuresFromCapabilityCodes(allCaps, selected, draft.capabilityCodes),
    [allCaps, selected, draft.capabilityCodes],
  );

  const previewPlans = useMemo((): SubscriptionPlanCatalogEntry[] => {
    return PLAN_ORDER.map((plan) => {
      const saved = plans.data?.find((p) => p.plan === plan);
      if (!saved) return null;
      if (plan !== selected) return saved;
      const cents = dollarsToCents(draft.monthlyPriceUsd) ?? saved.monthlyPriceCents;
      return {
        ...saved,
        displayName: draft.displayName || saved.displayName,
        tagline: draft.tagline.trim() || null,
        features: draftFeatures,
        monthlyPriceCents: cents,
        priceDisplay: formatPricePreview(cents),
        enabled: draft.enabled,
      };
    }).filter(Boolean) as SubscriptionPlanCatalogEntry[];
  }, [plans.data, selected, draft, draftFeatures]);

  function toggleCapability(code: string, inheritSummary: boolean) {
    if (inheritSummary) return;
    setDraft((prev) => {
      const next = new Set(prev.capabilityCodes);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...prev, capabilityCodes: [...next] };
    });
  }

  function applyRecommended() {
    if (allCaps.length === 0) return;
    setDraft((prev) => ({
      ...prev,
      tagline: PLAN_DEFAULT_TAGLINE[selected],
      capabilityCodes: recommendedCapabilityCodes(allCaps, selected),
    }));
    showToast("Applied recommended capabilities", "success");
  }

  const save = useMutation({
    mutationFn: () => {
      const monthlyPriceCents = dollarsToCents(draft.monthlyPriceUsd);
      if (monthlyPriceCents == null) {
        throw new Error("Enter a monthly price of at least $0.50");
      }
      const features = featuresFromCapabilityCodes(
        allCaps,
        selected,
        draft.capabilityCodes,
      );
      if (features.length === 0) {
        throw new Error("Select at least one capability for this plan");
      }
      return updateSuperSubscriptionPlan(selected, {
        displayName: draft.displayName.trim(),
        tagline: draft.tagline.trim() || null,
        features,
        monthlyPriceCents,
        enabled: draft.enabled,
      });
    },
    onSuccess: () => {
      showToast("Plan saved", "success");
      queryClient.invalidateQueries({ queryKey: ["super-subscription-plans"] });
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const loading = plans.isLoading || capabilities.isLoading;

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <CreditCard className="h-5 w-5 text-ink-muted" aria-hidden />
          Subscription plans
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Choose what each tier includes using realistic platform capabilities.
          Agencies see the preview below on their billing page. New tenants start
          on <strong>Starter</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLAN_ORDER.map((plan) => {
          const entry = plans.data?.find((p) => p.plan === plan);
          return (
            <button
              key={plan}
              type="button"
              onClick={() => setSelected(plan)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                selected === plan
                  ? "border-brand bg-brand-soft/50 text-brand-deep"
                  : "border-line bg-panel text-ink-muted hover:border-brand/40"
              }`}
            >
              {entry?.displayName ?? plan}
              {plan === "STARTER" ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-brand">
                  Default
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      >
        <div className="space-y-5 rounded border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Edit plan</h2>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={applyRecommended}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset to recommended
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="font-medium text-ink">Display name</span>
                <Input
                  className="mt-1"
                  value={draft.displayName}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-ink">Short description</span>
                <Input
                  className="mt-1"
                  value={draft.tagline}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  placeholder={PLAN_DEFAULT_TAGLINE[selected]}
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-ink">Monthly price (USD)</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Charged each month when an agency subscribes via Stripe.
                </span>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    $
                  </span>
                  <Input
                    className="pl-7"
                    type="number"
                    min="0.50"
                    step="0.01"
                    value={draft.monthlyPriceUsd}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        monthlyPriceUsd: e.target.value,
                      }))
                    }
                    placeholder={selected === "STARTER" ? "299" : selected === "PROFESSIONAL" ? "799" : "999"}
                    required
                  />
                </div>
              </label>

              {inherited.length > 0 ? (
                <section className="rounded-lg border border-line/80 bg-white/60 p-4">
                  <h3 className="text-sm font-semibold text-ink">
                    Included from lower tiers
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    Agencies on {draft.displayName || selected} also get everything
                    below — shown for reference.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {inherited.map((cap) => (
                      <li
                        key={cap.code}
                        className="flex items-start gap-2 text-sm text-ink-muted"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                        <span>{cap.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h3 className="text-sm font-semibold text-ink">
                  What this plan includes
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Check the capabilities agencies get when they subscribe to this
                  tier.
                </p>
                <div className="mt-4 space-y-5">
                  {groupByCategory(tierCapabilities).map(([category, caps]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {category}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {caps.map((cap) => {
                          const checked = draft.capabilityCodes.includes(cap.code);
                          const locked = cap.inheritSummary;
                          return (
                            <li key={cap.code}>
                              <label
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                                  checked
                                    ? "border-brand/40 bg-brand-soft/30"
                                    : "border-line bg-white hover:border-brand/25"
                                } ${locked ? "cursor-default opacity-90" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() =>
                                    toggleCapability(cap.code, cap.inheritSummary)
                                  }
                                />
                                <span>
                                  <span className="font-medium text-ink">
                                    {cap.label}
                                  </span>
                                  {locked ? (
                                    <span className="mt-0.5 block text-xs text-ink-muted">
                                      Always included for this tier
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                />
                Offer this plan to agencies (visible on billing page)
              </label>

              <Button type="submit" disabled={save.isPending}>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {save.isPending ? "Saving…" : "Save plan"}
              </Button>
            </>
          )}
        </div>

        <section className="rounded border border-line bg-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Preview — selected plan
          </p>
          <PlanBillingCard
            plan={selected}
            entry={
              previewPlans.find((p) => p.plan === selected) ?? {
                plan: selected,
                displayName: draft.displayName || "Plan name",
                tagline: draft.tagline || null,
                features: draftFeatures,
                monthlyPriceCents: dollarsToCents(draft.monthlyPriceUsd) ?? 0,
                priceDisplay:
                  formatPricePreview(dollarsToCents(draft.monthlyPriceUsd) ?? 0) ||
                  "—",
                sortOrder: 0,
                enabled: draft.enabled,
              }
            }
            highlight
          />
        </section>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            All plans — agency billing view
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Compare what each tier offers before you save.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {previewPlans.map((entry) => (
            <PlanBillingCard
              key={entry.plan}
              plan={entry.plan}
              entry={entry}
              highlight={entry.plan === selected}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanBillingCard({
  plan,
  entry,
  highlight = false,
}: {
  plan: SubscriptionPlan;
  entry: SubscriptionPlanCatalogEntry;
  highlight?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
        highlight ? "border-brand ring-1 ring-brand/20" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <CreditCard className="h-6 w-6 shrink-0 text-brand" aria-hidden />
        {plan === "STARTER" ? (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
            Default
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-lg">{entry.displayName}</h3>
      {entry.priceDisplay ? (
        <p className="mt-1 text-sm font-medium text-ink">{entry.priceDisplay}</p>
      ) : null}
      {entry.tagline ? (
        <p className="mt-2 text-sm text-ink-muted">{entry.tagline}</p>
      ) : null}
      <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-muted">
        {entry.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-5"
        variant={plan === "STARTER" ? "secondary" : "primary"}
        type="button"
        disabled
      >
        {plan === "STARTER" ? "Current plan" : "Subscribe"}
      </Button>
    </article>
  );
}
