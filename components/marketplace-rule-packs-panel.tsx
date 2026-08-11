"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMarketplaceRulePacks,
  updateMarketplaceRulePack,
} from "@/lib/api";
import type {
  MatchingMode,
  QualificationRulePack,
  ShiftChannel,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

const CHANNELS: ShiftChannel[] = ["FACILITY", "HOME", "BOTH"];
const MODES: MatchingMode[] = ["RADIUS", "DRIVE_TIME"];

export function MarketplaceRulePacksPanel() {
  const qc = useQueryClient();
  const packs = useQuery({
    queryKey: ["marketplace-rule-packs"],
    queryFn: listMarketplaceRulePacks,
  });
  const [selected, setSelected] = useState<QualificationRulePack | null>(null);
  const [form, setForm] = useState<QualificationRulePack | null>(null);

  useEffect(() => {
    if (packs.data?.length && !selected) {
      setSelected(packs.data[0]);
      setForm(packs.data[0]);
    }
  }, [packs.data, selected]);

  useEffect(() => {
    if (selected) setForm({ ...selected });
  }, [selected]);

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("No pack selected");
      const { id: _id, qualification, ...body } = form;
      return updateMarketplaceRulePack(qualification, body);
    },
    onSuccess: (data) => {
      qc.setQueryData<QualificationRulePack[]>(
        ["marketplace-rule-packs"],
        (prev) =>
          (prev ?? []).map((p) =>
            p.qualification === data.qualification ? data : p,
          ),
      );
      setSelected(data);
      setForm(data);
    },
  });

  if (packs.isLoading || !form) {
    return (
      <p className="text-sm text-ink-muted">Loading marketplace rules…</p>
    );
  }

  return (
    <section className="space-y-4 rounded border border-line bg-panel p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">
          Marketplace rule packs
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Per-qualification matching, credentials, surge, and travel policy.
          Credential enforcement is off by default until the vault is populated.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(packs.data ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            className={`rounded border px-3 py-1.5 text-sm ${
              form.qualification === p.qualification
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink"
            }`}
          >
            {p.qualification}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Preferred channel">
          <Select
            value={form.preferredChannel}
            onChange={(e) =>
              setForm({
                ...form,
                preferredChannel: e.target.value as ShiftChannel,
              })
            }
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Matching mode">
          <Select
            value={form.matchingMode}
            onChange={(e) =>
              setForm({
                ...form,
                matchingMode: e.target.value as MatchingMode,
              })
            }
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cancel notice (hours)">
          <Input
            type="number"
            min={0}
            value={form.cancelNoticeHours}
            onChange={(e) =>
              setForm({
                ...form,
                cancelNoticeHours: Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Max drive minutes">
          <Input
            type="number"
            min={1}
            value={form.maxDriveMinutes ?? ""}
            placeholder="n/a"
            onChange={(e) =>
              setForm({
                ...form,
                maxDriveMinutes: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </Field>
        <Field label="Travel pay $/min">
          <Input
            type="number"
            step="0.01"
            min={0}
            value={form.travelPayPerMinute ?? 0}
            onChange={(e) =>
              setForm({
                ...form,
                travelPayPerMinute: Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Credential expiry block (days)">
          <Input
            type="number"
            min={0}
            value={form.credentialExpiryBlockDays}
            onChange={(e) =>
              setForm({
                ...form,
                credentialExpiryBlockDays: Number(e.target.value),
              })
            }
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.surgeEligible}
            onChange={(e) =>
              setForm({ ...form, surgeEligible: e.target.checked })
            }
          />
          Surge eligible
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.evvRequired}
            onChange={(e) =>
              setForm({ ...form, evvRequired: e.target.checked })
            }
          />
          EVV required
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.travelPayEnabled}
            onChange={(e) =>
              setForm({ ...form, travelPayEnabled: e.target.checked })
            }
          />
          Travel pay
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.enforceCredentials}
            onChange={(e) =>
              setForm({ ...form, enforceCredentials: e.target.checked })
            }
          />
          Enforce credentials
        </label>
      </div>

      <p className="text-xs text-ink-muted">
        Required credentials:{" "}
        {form.requiredCredentials?.length
          ? form.requiredCredentials.join(", ")
          : "none"}
        . Escalation: T−{form.escalationTier1Hours}h +$
        {form.escalationTier1SurgeBonus} → T−{form.escalationTier2Hours}h +$
        {form.escalationTier2SurgeBonus} → T−{form.escalationTier3Hours}h +$
        {form.escalationTier3SurgeBonus}.
      </p>

      {save.isError ? (
        <p className="text-sm text-danger">Could not save rule pack.</p>
      ) : null}
      {save.isSuccess ? (
        <p className="text-sm text-success">Rule pack saved.</p>
      ) : null}

      <Button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          "Saving…"
        ) : (
          <>
            <Save className="h-3.5 w-3.5" aria-hidden />
            Save {form.qualification} pack
          </>
        )}
      </Button>
    </section>
  );
}
