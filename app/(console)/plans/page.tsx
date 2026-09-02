"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Save } from "lucide-react";
import { listSuperSubscriptionPlans, updateSuperSubscriptionPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/lib/toast-context";
import type { SubscriptionPlan } from "@/lib/types";

const PLAN_ORDER: SubscriptionPlan[] = ["STARTER", "PROFESSIONAL", "FEATURED"];

export default function SubscriptionPlansPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SubscriptionPlan>("STARTER");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [enabled, setEnabled] = useState(true);

  const plans = useQuery({
    queryKey: ["super-subscription-plans"],
    queryFn: listSuperSubscriptionPlans,
  });

  const current = plans.data?.find((p) => p.plan === selected);

  useEffect(() => {
    if (!current) return;
    setDisplayName(current.displayName);
    setTagline(current.tagline ?? "");
    setFeaturesText(current.features.join("\n"));
    setPriceLabel(current.priceLabel ?? "");
    setEnabled(current.enabled);
  }, [current]);

  const save = useMutation({
    mutationFn: () =>
      updateSuperSubscriptionPlan(selected, {
        displayName: displayName.trim(),
        tagline: tagline.trim() || null,
        features: featuresText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        priceLabel: priceLabel.trim() || null,
        enabled,
      }),
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

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <CreditCard className="h-5 w-5 text-ink-muted" aria-hidden />
          Subscription plans
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Configure what each agency tier includes. Agencies see this catalog on
          their billing page; new tenants start on <strong>Starter</strong>.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded border border-line bg-panel p-5">
          <h2 className="font-display text-lg font-semibold">Edit plan</h2>
          {plans.isLoading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="font-medium text-ink">Display name</span>
                <Input
                  className="mt-1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Short description</span>
                <Input
                  className="mt-1"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="One line shown under the plan name"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Price label (optional)</span>
                <Input
                  className="mt-1"
                  value={priceLabel}
                  onChange={(e) => setPriceLabel(e.target.value)}
                  placeholder="e.g. $299/mo — display only"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Included capabilities</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  One feature per line — shown as a bullet list to agencies.
                </span>
                <Textarea
                  className="mt-2 min-h-[180px] font-mono text-xs"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Offer this plan to agencies (visible on billing page)
              </label>
              <Button type="submit" disabled={save.isPending}>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {save.isPending ? "Saving…" : "Save plan"}
              </Button>
            </>
          )}
        </form>

        <section className="rounded border border-line bg-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Preview — agency billing
          </p>
          <article className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm">
            <CreditCard className="h-6 w-6 text-brand" aria-hidden />
            <h3 className="mt-3 font-display text-lg">
              {displayName || "Plan name"}
            </h3>
            {priceLabel ? (
              <p className="mt-1 text-sm font-medium text-ink">{priceLabel}</p>
            ) : null}
            {tagline ? (
              <p className="mt-2 text-sm text-ink-muted">{tagline}</p>
            ) : null}
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              {featuresText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-brand" aria-hidden>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
            </ul>
            <Button className="mt-5" variant="secondary" type="button" disabled>
              {selected === "STARTER" ? "Current plan" : "Subscribe"}
            </Button>
          </article>
        </section>
      </div>
    </div>
  );
}
