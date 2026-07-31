"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgencySettings, updateAgencySettings } from "@/lib/api";
import type { AgencySettings, PayPeriodType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { LegalDocumentsPanel } from "@/components/legal-documents-panel";
import { Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function billFromPay(pay: number, takePercent: number): number {
  const keep = 1 - takePercent / 100;
  if (keep <= 0) return NaN;
  return Math.round((pay / keep) * 100) / 100;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["agency-settings"],
    queryFn: getAgencySettings,
  });

  const [form, setForm] = useState<AgencySettings | null>(null);

  useEffect(() => {
    if (settings.data) {
      setForm({
        ...settings.data,
        autoInvoiceOnComplete: settings.data.autoInvoiceOnComplete ?? true,
        autoInvoiceSendImmediately:
          settings.data.autoInvoiceSendImmediately ?? true,
        clientCaregiverRejectionFee:
          settings.data.clientCaregiverRejectionFee ?? 25,
        platformConversionFee: settings.data.platformConversionFee ?? 500,
      });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: updateAgencySettings,
    onSuccess: (data) => {
      qc.setQueryData(["agency-settings"], data);
      setForm(data);
    },
  });

  const take = Number(form?.agencyTakePercent ?? 0);
  const pay = Number(form?.defaultPayRate ?? 0);
  const bill = billFromPay(pay, take);
  const agencyCut = Number.isFinite(bill) ? (bill * take) / 100 : NaN;

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-in">
      <div>
        <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Settings className="h-5 w-5 text-ink-muted" aria-hidden />
          Agency settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Set caregiver pay and take %. Client bill = pay ÷ (1 − take%) and is
          applied automatically when families or facilities post shifts.
        </p>
      </div>

      {settings.isLoading || !form ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <form
          className="space-y-4 rounded border border-line bg-panel p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <Field label="Default caregiver pay ($/hr)">
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={form.defaultPayRate}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultPayRate: Number(e.target.value),
                })
              }
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Used for all client-posted shifts. Clients see the derived bill
              rate and cannot change pay or bill.
            </span>
          </Field>

          <Field label="Agency take (% of client bill rate)">
            <Input
              type="number"
              step="0.01"
              min={0}
              max={99.99}
              value={form.agencyTakePercent}
              onChange={(e) =>
                setForm({
                  ...form,
                  agencyTakePercent: Number(e.target.value),
                })
              }
            />
          </Field>

          <div className="rounded border border-line bg-canvas px-3 py-2 text-sm text-ink-muted">
            {Number.isFinite(bill) ? (
              <>
                At ${pay.toFixed(2)}/hr caregiver pay and {take.toFixed(2)}%
                take: client bill{" "}
                <span className="font-semibold text-ink">
                  ${bill.toFixed(2)}/hr
                </span>
                , agency keeps{" "}
                <span className="font-semibold text-ink">
                  ${agencyCut.toFixed(2)}/hr
                </span>
                . Admin shift forms can still set pay and bill independently.
              </>
            ) : (
              <>Take % must be under 100 to derive a bill rate.</>
            )}
          </div>

          <Field label="Pay period">
            <Select
              value={form.payPeriodType}
              onChange={(e) =>
                setForm({
                  ...form,
                  payPeriodType: e.target.value as PayPeriodType,
                })
              }
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Biweekly</option>
            </Select>
          </Field>

          <Field label="Period starts on">
            <Select
              value={form.periodStartDay}
              onChange={(e) =>
                setForm({
                  ...form,
                  periodStartDay: e.target
                    .value as AgencySettings["periodStartDay"],
                })
              }
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Auto-invoice on shift complete">
            <Select
              value={form.autoInvoiceOnComplete ? "true" : "false"}
              onChange={(e) =>
                setForm({
                  ...form,
                  autoInvoiceOnComplete: e.target.value === "true",
                })
              }
            >
              <option value="true">On — create invoice when a shift is completed</option>
              <option value="false">Off — create invoices manually in Finance</option>
            </Select>
          </Field>

          <Field label="Auto-send invoice">
            <Select
              value={form.autoInvoiceSendImmediately ? "true" : "false"}
              onChange={(e) =>
                setForm({
                  ...form,
                  autoInvoiceSendImmediately: e.target.value === "true",
                })
              }
            >
              <option value="true">Send to client immediately</option>
              <option value="false">Leave as draft for admin review</option>
            </Select>
            <span className="mt-1 block text-xs text-ink-muted">
              Only applies when auto-invoice is on. Drafts can still be sent from
              Finance.
            </span>
          </Field>

          <Field label="Client caregiver rejection fee ($)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.clientCaregiverRejectionFee ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  clientCaregiverRejectionFee: Number(e.target.value),
                })
              }
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Charged when a family rejects a caregiver who claimed or was
              assigned to their shift. Set to 0 to allow free rejection.
            </span>
          </Field>

          <Field label="Platform conversion fee ($)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.platformConversionFee ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  platformConversionFee: Number(e.target.value),
                })
              }
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Charged when a family or facility hires a caregiver they met on
              OkayNow and continues care off-platform. Covered in Terms /
              Platform Policy. Set to 0 to disable.
            </span>
          </Field>

          {save.isError ? (
            <p className="text-sm text-danger">Could not save settings.</p>
          ) : null}
          {save.isSuccess ? (
            <p className="text-sm text-success">Saved.</p>
          ) : null}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? (
              "Saving…"
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                Save settings
              </>
            )}
          </Button>
        </form>
      )}

      <LegalDocumentsPanel />
    </div>
  );
}
