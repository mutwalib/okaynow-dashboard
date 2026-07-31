"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminClient,
  getAdminClients,
  updateClientShiftPermissions,
} from "@/lib/api";
import type {
  CareRecipientRelationship,
  ClientProfile,
  MedicaidEligibility,
} from "@/lib/types";
import {
  CARE_RECIPIENT_RELATIONSHIP_LABEL,
  MEDICAID_ELIGIBILITY_LABEL,
} from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { Button } from "@/components/ui/button";
import { AddressLink } from "@/components/address-link";
import { ClientRoster } from "@/components/client-roster";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import {
  DEFAULT_STATE,
  SERVICE_REGION_LABEL,
  maZipMessage,
} from "@/lib/service-region";
import { HeartHandshake, UserPlus, X } from "lucide-react";

const emptyForm = {
  email: "",
  password: "",
  phone: "",
  firstName: "",
  lastName: "",
  addressLine: "",
  city: "",
  state: DEFAULT_STATE,
  zip: "",
  careNeeds: "",
  registeringForSelf: "true",
  medicaidEligible: "" as "" | MedicaidEligibility,
  relationshipToCareRecipient: "" as "" | CareRecipientRelationship,
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const { page, setPage, pageSize, setPageSize } = useListPagination(search);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const registeringForSelf = form.registeringForSelf === "true";

  const clients = useQuery({
    queryKey: ["admin-clients", search, page, pageSize],
    queryFn: () => getAdminClients(search, { page, size: pageSize }),
  });

  const create = useMutation({
    mutationFn: () => {
      const zipCheck = maZipMessage(form.zip);
      if (zipCheck !== true) throw new Error(zipCheck);
      return createAdminClient({
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        addressLine: form.addressLine,
        city: form.city,
        state: DEFAULT_STATE,
        zip: form.zip,
        careNeeds: form.careNeeds || undefined,
        registeringForSelf,
        medicaidEligible: registeringForSelf
          ? undefined
          : (form.medicaidEligible as MedicaidEligibility),
        relationshipToCareRecipient: registeringForSelf
          ? undefined
          : (form.relationshipToCareRecipient as CareRecipientRelationship),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      setForm(emptyForm);
      setShowForm(false);
      showToast("Client registered", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const permissions = useMutation({
    mutationFn: ({
      client,
      key,
      value,
    }: {
      client: ClientProfile;
      key:
        | "canViewShifts"
        | "canCreateShifts"
        | "canUpdateShifts"
        | "canDeleteShifts";
      value: boolean;
    }) =>
      updateClientShiftPermissions(client.id, {
        canViewShifts: client.canViewShifts,
        canCreateShifts: client.canCreateShifts,
        canUpdateShifts: client.canUpdateShifts,
        canDeleteShifts: client.canDeleteShifts,
        [key]: value,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      showToast("Client permissions updated", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!registeringForSelf) {
      if (!form.medicaidEligible || !form.relationshipToCareRecipient) {
        showToast(
          "Select Medicaid eligibility and relationship when registering for another person",
          "error",
        );
        return;
      }
    }
    create.mutate();
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <HeartHandshake className="h-5 w-5 text-ink-muted" aria-hidden />
            Clients
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Families and facilities — both are clients. Register family accounts
            here; facilities appear after they sign up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportReportButtons
            type="CLIENTS"
            filters={{ search: search || undefined }}
          />
          <Button onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? (
              <>
                <X className="h-3.5 w-3.5" aria-hidden />
                Close form
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Register client
              </>
            )}
          </Button>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="space-y-4 rounded border border-line bg-panel p-4"
        >
          <h2 className="font-display text-lg font-semibold">New client</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <Input
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Temporary password">
              <Input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Who is this account for?">
            <Select
              required
              value={form.registeringForSelf}
              onChange={(e) => {
                update("registeringForSelf", e.target.value);
                if (e.target.value === "true") {
                  setForm((current) => ({
                    ...current,
                    registeringForSelf: "true",
                    medicaidEligible: "",
                    relationshipToCareRecipient: "",
                  }));
                }
              }}
            >
              <option value="true">Themselves (the person receiving care)</option>
              <option value="false">Someone else (family / representative)</option>
            </Select>
          </Field>

          {!registeringForSelf ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Is the person receiving care eligible for Medicaid?">
                <Select
                  required
                  value={form.medicaidEligible}
                  onChange={(e) => update("medicaidEligible", e.target.value)}
                >
                  <option value="">Choose one…</option>
                  {(Object.keys(MEDICAID_ELIGIBILITY_LABEL) as MedicaidEligibility[]).map(
                    (value) => (
                      <option key={value} value={value}>
                        {MEDICAID_ELIGIBILITY_LABEL[value]}
                      </option>
                    ),
                  )}
                </Select>
              </Field>
              <Field label="What is your relationship to the person receiving care? I am the:">
                <Select
                  required
                  value={form.relationshipToCareRecipient}
                  onChange={(e) =>
                    update("relationshipToCareRecipient", e.target.value)
                  }
                >
                  <option value="">Choose one…</option>
                  {(
                    Object.keys(
                      CARE_RECIPIENT_RELATIONSHIP_LABEL,
                    ) as CareRecipientRelationship[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {CARE_RECIPIENT_RELATIONSHIP_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}

          <Field label="Service address">
            <Input
              required
              placeholder="123 Main St"
              value={form.addressLine}
              onChange={(e) => update("addressLine", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City">
              <Input
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </Field>
            <Field label="State">
              <Input
                readOnly
                required
                value={DEFAULT_STATE}
                title={`OkayNow currently operates in ${SERVICE_REGION_LABEL} only`}
              />
              <span className="block text-xs text-ink-muted">
                {SERVICE_REGION_LABEL} only — more states later
              </span>
            </Field>
            <Field label="ZIP">
              <Input
                required
                inputMode="numeric"
                placeholder="02108"
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Care needs">
            <Textarea
              placeholder="Mobility, ADLs, allergies, preferences…"
              value={form.careNeeds}
              onChange={(e) => update("careNeeds", e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Registering…" : "Register client"}
          </Button>
        </form>
      ) : null}

      <div className="flex max-w-md gap-2">
        <Input
          type="search"
          placeholder="Search name, email, address, or city"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {clients.isLoading ? <p className="text-sm text-ink-muted">Loading clients…</p> : null}
      {clients.isError ? <p className="text-sm text-danger">Could not load clients.</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {clients.data?.content.map((client) => {
          const isFacility = client.clientType === "FACILITY";
          const title = isFacility
            ? (client.facilityName ?? "Facility")
            : `${client.firstName} ${client.lastName}`;
          return (
          <article key={`${client.clientType}-${client.id}`} className="rounded border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isFacility
                        ? "rounded bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep"
                        : "rounded bg-panel-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
                    }
                  >
                    {isFacility ? "Facility" : "Family"}
                  </span>
                  <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    {client.status}
                  </span>
                </div>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <p className="text-sm text-ink-muted">{client.email}</p>
                {isFacility ? (
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Contact: {client.firstName} {client.lastName}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 text-sm">
              <AddressLink address={client} />
            </div>
            {client.phone ? (
              <p className="mt-2 text-sm text-ink-muted">{client.phone}</p>
            ) : null}
            {!isFacility ? (
              <p className="mt-2 text-xs text-ink-muted">
                {client.registeringForSelf
                  ? "Account for care recipient"
                  : "Registered by representative"}
                {!client.registeringForSelf && client.medicaidEligible
                  ? ` · Medicaid: ${MEDICAID_ELIGIBILITY_LABEL[client.medicaidEligible]}`
                  : null}
                {!client.registeringForSelf && client.relationshipToCareRecipient
                  ? ` · ${CARE_RECIPIENT_RELATIONSHIP_LABEL[client.relationshipToCareRecipient]}`
                  : null}
              </p>
            ) : null}
            {client.careNeeds ? (
              <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
                {client.careNeeds}
              </p>
            ) : null}
            {!isFacility ? (
              <>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                    Shift permissions
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["canViewShifts", "View"],
                        ["canCreateShifts", "Create"],
                        ["canUpdateShifts", "Edit"],
                        ["canDeleteShifts", "Delete"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 rounded border border-line px-2.5 py-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={client[key]}
                          disabled={permissions.isPending}
                          onChange={(event) =>
                            permissions.mutate({
                              client,
                              key,
                              value: event.target.checked,
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <ClientRoster clientId={client.id} />
              </>
            ) : (
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
                Facility clients manage their own shifts from the facility
                workspace.
              </p>
            )}
          </article>
          );
        })}
      </div>

      {!clients.isLoading && clients.data?.content.length === 0 ? (
        <p className="rounded border border-dashed border-line p-8 text-center text-sm text-ink-muted">
          No clients found. Register a family client or wait for a facility to
          sign up.
        </p>
      ) : null}
      {clients.data ? (
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalElements={clients.data.totalElements}
          totalPages={clients.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={clients.isFetching}
        />
      ) : null}
    </div>
  );
}
