"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { QUALIFICATIONS, type Qualification } from "@/lib/types";
import { getAdminClients, getAgencySettings } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import {
  DEFAULT_STATE,
  maZipMessage,
  SERVICE_REGION_LABEL,
} from "@/lib/service-region";
import { Field, Input, Select, Textarea } from "./ui/field";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

const schema = z
  .object({
    /** `FAMILY:{id}` or `FACILITY:{id}` */
    clientRef: z.string().min(1, "Client is required"),
    requiredQualification: z.enum(["CNA", "HHA", "PCA", "LPN", "RN"]),
    scheduleType: z.enum(["ONE_OFF", "DAILY_ROUTINE"]),
    /** Required for one-off only; daily routines are ongoing (no date range). */
    date: z.string().optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    addressLine: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.literal(DEFAULT_STATE),
    zip: z.string().refine((v) => maZipMessage(v) === true, {
      message: "OkayNow currently accepts Massachusetts ZIP codes only (010–027)",
    }),
    payRate: z.coerce.number().positive("Pay rate must be positive"),
    billRate: z.coerce.number().positive("Bill rate must be positive"),
    requiredHeadcount: z.coerce
      .number()
      .int()
      .min(1, "At least 1 caregiver")
      .max(50),
    assignFromRoster: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.endTime !== d.startTime, {
    message: "End time must differ from start time",
    path: ["endTime"],
  })
  .refine((d) => d.billRate >= d.payRate, {
    message: "Bill rate must be ≥ pay rate",
    path: ["billRate"],
  })
  .refine(
    (d) => d.scheduleType !== "ONE_OFF" || !!d.date,
    {
      message: "Date is required",
      path: ["date"],
    },
  );

export type ShiftFormValues = z.infer<typeof schema>;

/** Client bill so caregiver receives `pay` after agency take %. */
function billFromPay(pay: number, takePercent: number): number {
  const keep = 1 - takePercent / 100;
  if (!Number.isFinite(pay) || pay <= 0 || keep <= 0) return NaN;
  return Math.round((pay / keep) * 100) / 100;
}

function parseRateInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return NaN;
  return Number(trimmed);
}

export function parseClientRef(ref: string): {
  clientProfileId?: string;
  facilityProfileId?: string;
} {
  const [kind, id] = ref.split(":");
  if (!id) return {};
  if (kind === "FACILITY") return { facilityProfileId: id };
  if (kind === "FAMILY") return { clientProfileId: id };
  return {};
}

function clientOptionValue(client: { clientType: string; id: string }) {
  return `${client.clientType}:${client.id}`;
}

function clientOptionLabel(client: {
  clientType: string;
  facilityName: string | null;
  firstName: string;
  lastName: string;
  addressLine: string;
  city: string;
}) {
  const name =
    client.clientType === "FACILITY" && client.facilityName
      ? client.facilityName
      : `${client.lastName}, ${client.firstName}`;
  const kind = client.clientType === "FACILITY" ? "Facility" : "Family";
  return `[${kind}] ${name} — ${client.addressLine}, ${client.city}`;
}

export function ShiftForm({
  defaultValues,
  submitLabel = "Create shift",
  mode = "create",
  onSubmit,
}: {
  defaultValues?: Partial<ShiftFormValues>;
  submitLabel?: string;
  /** Edit mode always shows the instance date (including daily-routine days). */
  mode?: "create" | "edit";
  onSubmit: (values: ShiftFormValues) => Promise<void>;
}) {
  const editing = mode === "edit";
  const seededRates = useRef(
    defaultValues?.payRate != null || defaultValues?.billRate != null,
  );
  /** When true, bill was typed by hand — don't overwrite on pay edits. */
  const billManual = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ShiftFormValues>({
    // zodResolver generics disagree with optional coerced number fields in this schema.
    resolver: zodResolver(schema) as never,
    defaultValues: {
      requiredQualification: "CNA",
      scheduleType: "ONE_OFF",
      clientRef: "",
      startTime: "09:00",
      endTime: "17:00",
      payRate: undefined,
      billRate: undefined,
      requiredHeadcount: 1,
      assignFromRoster: true,
      date: "",
      addressLine: "",
      city: "",
      zip: "",
      notes: "",
      ...defaultValues,
      state: DEFAULT_STATE,
    },
  });
  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => getAdminClients(),
  });
  const agencySettings = useQuery({
    queryKey: ["agency-settings"],
    queryFn: getAgencySettings,
  });
  const selectedClientRef = watch("clientRef");
  const scheduleType = watch("scheduleType");
  const assignFromRoster = watch("assignFromRoster");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const overnight =
    !!startTime && !!endTime && endTime !== startTime && endTime < startTime;
  const billRate = watch("billRate");
  const payRate = watch("payRate");
  const takePercent = Number(agencySettings.data?.agencyTakePercent ?? 0);

  useEffect(() => {
    if (seededRates.current || !agencySettings.data) return;
    const pay = Number(agencySettings.data.defaultPayRate);
    const take = Number(agencySettings.data.agencyTakePercent);
    if (!Number.isFinite(pay) || pay <= 0) return;
    seededRates.current = true;
    billManual.current = false;
    setValue("payRate", pay, { shouldValidate: true });
    const bill = billFromPay(pay, take);
    if (Number.isFinite(bill)) {
      setValue("billRate", bill, { shouldValidate: true });
    }
  }, [agencySettings.data, setValue]);

  function onPayRateChange(raw: string) {
    const pay = parseRateInput(raw);
    setValue("payRate", pay, { shouldValidate: true });
    if (billManual.current) return;
    const bill = billFromPay(pay, takePercent);
    if (Number.isFinite(bill)) {
      setValue("billRate", bill, { shouldValidate: true });
    }
  }

  function onBillRateChange(raw: string) {
    billManual.current = true;
    setValue("billRate", parseRateInput(raw), { shouldValidate: true });
  }

  /** Re-derive bill from current pay using agency take %. */
  function applyAgencyTake() {
    if (!Number.isFinite(payRate) || payRate <= 0) return;
    billManual.current = false;
    const bill = billFromPay(payRate, takePercent);
    if (Number.isFinite(bill)) {
      setValue("billRate", bill, { shouldValidate: true });
    }
  }

  function selectClient(ref: string) {
    setValue("clientRef", ref, { shouldValidate: true });
    const client = clients.data?.content.find(
      (item) => clientOptionValue(item) === ref,
    );
    if (!client) return;
    setValue("addressLine", client.addressLine, { shouldValidate: true });
    setValue("city", client.city, { shouldValidate: true });
    setValue("state", DEFAULT_STATE, { shouldValidate: true });
    setValue("zip", client.zip, { shouldValidate: true });
  }

  const agencyKeep =
    Number.isFinite(billRate) &&
    Number.isFinite(payRate) &&
    billRate > 0
      ? billRate - payRate
      : NaN;
  const effectiveTakePct =
    Number.isFinite(agencyKeep) && billRate > 0
      ? (agencyKeep / billRate) * 100
      : NaN;

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({ ...values, state: DEFAULT_STATE });
      })}
      className="space-y-4"
    >
      {editing ? (
        <p className="rounded border border-line bg-canvas px-3 py-2 text-sm text-ink-muted">
          Editing this day&apos;s hours, rates, location, and notes. Client and
          schedule type stay the same.
        </p>
      ) : (
        <Field label="Client" error={errors.clientRef?.message}>
          <Select
            value={selectedClientRef}
            disabled={clients.isLoading}
            onChange={(event) => selectClient(event.target.value)}
          >
            <option value="">
              {clients.isLoading ? "Loading clients…" : "Select a client"}
            </option>
            {clients.data?.content.map((client) => (
              <option key={clientOptionValue(client)} value={clientOptionValue(client)}>
                {clientOptionLabel(client)}
              </option>
            ))}
          </Select>
          {clients.isError ? (
            <p className="mt-1 text-xs text-danger">Could not load clients.</p>
          ) : null}
          {!clients.isLoading && clients.data?.content.length === 0 ? (
            <p className="mt-1 text-xs text-warn">
              Register a family client or have a facility sign up before creating a
              shift.
            </p>
          ) : null}
        </Field>
      )}

      {!editing ? (
        <Field label="Schedule" error={errors.scheduleType?.message}>
          <Select {...register("scheduleType")}>
            <option value="ONE_OFF">One-off (single day)</option>
            <option value="DAILY_ROUTINE">Daily routine (ongoing every day)</option>
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Qualification" error={errors.requiredQualification?.message}>
          <Select {...register("requiredQualification")}>
            {QUALIFICATIONS.map((q: Qualification) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        </Field>
        {editing || scheduleType === "ONE_OFF" ? (
          <Field label="Date" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </Field>
        ) : null}
        <Field label="Start" error={errors.startTime?.message}>
          <Input type="time" {...register("startTime")} />
        </Field>
        <Field label="End" error={errors.endTime?.message}>
          <Input type="time" {...register("endTime")} />
        </Field>
      </div>
      {overnight ? (
        <p className="text-xs text-ink-muted">
          Ends the next calendar day (overnight shift).
        </p>
      ) : null}
      {!editing && scheduleType === "DAILY_ROUTINE" ? (
        <p className="text-xs text-ink-muted">
          Ongoing every day at these hours — no end date. Days fill from the
          client roster by default. Call out on a calendar day to open the
          marketplace for that date only.
        </p>
      ) : null}

      <Field label="Street address" error={errors.addressLine?.message}>
        <Input placeholder="123 Main St" {...register("addressLine")} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} />
        </Field>
        <Field label="State" error={errors.state?.message}>
          <Input
            readOnly
            title={`OkayNow currently operates in ${SERVICE_REGION_LABEL} only`}
            {...register("state")}
            value={DEFAULT_STATE}
          />
          <span className="block text-xs text-ink-muted">
            {SERVICE_REGION_LABEL} only — more states later
          </span>
        </Field>
        <Field label="ZIP" error={errors.zip?.message}>
          <Input inputMode="numeric" placeholder="02108" {...register("zip")} />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Pay rate ($/hr, agency → caregiver)"
            error={errors.payRate?.message}
          >
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={Number.isFinite(payRate) ? payRate : ""}
              onChange={(e) => onPayRateChange(e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Starts from Agency settings. Changing pay auto-fills bill rate
              using the agency take %.
            </span>
          </Field>
          <Field
            label="Bill rate ($/hr, client → agency)"
            error={errors.billRate?.message}
          >
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={Number.isFinite(billRate) ? billRate : ""}
              onChange={(e) => onBillRateChange(e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Auto-derived from pay. Override manually anytime — the take %
              below updates from the two rates.
            </span>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={
              !Number.isFinite(takePercent) ||
              !Number.isFinite(payRate) ||
              payRate <= 0
            }
            onClick={applyAgencyTake}
          >
            Apply {takePercent.toFixed(2)}% agency take
          </Button>
          {Number.isFinite(agencyKeep) && Number.isFinite(effectiveTakePct) ? (
            <span>
              Agency keeps {formatMoney(agencyKeep)}/hr (
              {effectiveTakePct.toFixed(1)}% of bill)
            </span>
          ) : agencySettings.isLoading ? (
            <span>Loading agency rates…</span>
          ) : null}
        </div>
      </div>

      <Field
        label="Caregivers needed"
        error={errors.requiredHeadcount?.message}
      >
        <Input
          type="number"
          min={1}
          max={50}
          step={1}
          {...register("requiredHeadcount")}
        />
        <span className="mt-1 block text-xs text-ink-muted">
          How many caregivers this shift needs at the same time.
        </span>
      </Field>

      {!editing && scheduleType === "DAILY_ROUTINE" ? (
        <label className="flex cursor-pointer items-start gap-2 rounded border border-line bg-canvas px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={!!assignFromRoster}
            onChange={(e) =>
              setValue("assignFromRoster", e.target.checked, {
                shouldValidate: true,
              })
            }
          />
          <span>
            <span className="font-medium">Assign from client roster</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              PRIMARY first, then rotational. Call out on a calendar day to open
              the marketplace for that date only.
            </span>
          </span>
        </label>
      ) : null}

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea
          placeholder="Care tasks, access notes, preferences…"
          {...register("notes")}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} size="lg">
        {isSubmitting ? (
          "Saving…"
        ) : (
          <>
            <Plus className="h-4 w-4" aria-hidden />
            {submitLabel}
          </>
        )}
      </Button>
    </form>
  );
}
