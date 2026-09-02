import type { PlanCapabilityEntry, SubscriptionPlan } from "@/lib/types";

/** Default one-line descriptions shown on agency billing cards. */
export const PLAN_DEFAULT_TAGLINE: Record<SubscriptionPlan, string> = {
  STARTER: "Get listed and connect with homes.",
  PROFESSIONAL: "Run scheduling, roster, and payroll export.",
  FEATURED: "Stand out in the home directory.",
};

export function capabilitiesForPlan(
  all: PlanCapabilityEntry[],
  plan: SubscriptionPlan,
): PlanCapabilityEntry[] {
  return all.filter((cap) => cap.introducedIn === plan);
}

export function inheritedCapabilities(
  all: PlanCapabilityEntry[],
  plan: SubscriptionPlan,
): PlanCapabilityEntry[] {
  const tier = planOrder(plan);
  return all.filter(
    (cap) => !cap.inheritSummary && planOrder(cap.introducedIn) < tier,
  );
}

export function recommendedCapabilityCodes(
  all: PlanCapabilityEntry[],
  plan: SubscriptionPlan,
): string[] {
  return capabilitiesForPlan(all, plan)
    .filter((cap) => cap.recommended)
    .map((cap) => cap.code);
}

export function featuresFromCapabilityCodes(
  all: PlanCapabilityEntry[],
  plan: SubscriptionPlan,
  selectedCodes: Iterable<string>,
): string[] {
  const selected = new Set(selectedCodes);
  return capabilitiesForPlan(all, plan)
    .filter((cap) => selected.has(cap.code))
    .map((cap) => cap.label);
}

export function capabilityCodesFromFeatures(
  all: PlanCapabilityEntry[],
  plan: SubscriptionPlan,
  features: string[],
): string[] {
  const normalized = new Set(
    features.map((f) => f.trim().toLowerCase()).filter(Boolean),
  );
  const matched = capabilitiesForPlan(all, plan)
    .filter((cap) => normalized.has(cap.label.toLowerCase()))
    .map((cap) => cap.code);

  if (matched.length === 0) {
    return recommendedCapabilityCodes(all, plan);
  }

  const codes = new Set(matched);
  if (plan !== "STARTER") {
    const inherit = capabilitiesForPlan(all, plan).find((c) => c.inheritSummary);
    if (inherit) codes.add(inherit.code);
  }
  return [...codes];
}

export function groupByCategory(
  caps: PlanCapabilityEntry[],
): [string, PlanCapabilityEntry[]][] {
  const groups = new Map<string, PlanCapabilityEntry[]>();
  for (const cap of caps) {
    const list = groups.get(cap.category) ?? [];
    list.push(cap);
    groups.set(cap.category, list);
  }
  return [...groups.entries()];
}

function planOrder(plan: SubscriptionPlan): number {
  switch (plan) {
    case "STARTER":
      return 0;
    case "PROFESSIONAL":
      return 1;
    case "FEATURED":
      return 2;
  }
}
