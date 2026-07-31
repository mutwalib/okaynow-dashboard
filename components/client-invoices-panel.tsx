"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClientInvoice,
  downloadAdminInvoicePdf,
  generateOutstandingInvoices,
  getAdminClients,
  getAdminInvoices,
  getUninvoicedSettlements,
  markClientInvoicePaid,
  sendClientInvoice,
  voidClientInvoice,
} from "@/lib/api";
import { formatMoney, toIsoDate } from "@/lib/format";
import { confirmAction } from "@/lib/confirm";
import type { InvoiceStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ConfirmModal } from "@/components/ui/modal";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import {
  FileText,
  Send,
  CheckCircle2,
  Ban,
  Receipt,
  Printer,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function ClientInvoicesPanel() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState<"" | InvoiceStatus>("");
  const [invoiceBillToFilter, setInvoiceBillToFilter] = useState("");
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [debouncedInvoiceQuery, setDebouncedInvoiceQuery] = useState("");
  const [billToRef, setBillToRef] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toIsoDate(d);
  });
  const [notes, setNotes] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const invoiceFilterKey = [
    status,
    invoiceBillToFilter,
    debouncedInvoiceQuery,
  ].join("|");
  const { page, setPage, pageSize, setPageSize } =
    useListPagination(invoiceFilterKey);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedInvoiceQuery(invoiceQuery.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [invoiceQuery]);

  const clients = useQuery({
    queryKey: ["admin-clients-invoice"],
    queryFn: () => getAdminClients(""),
  });

  const billTo = useMemo(() => {
    if (!billToRef) return { clientProfileId: undefined, facilityProfileId: undefined };
    const [kind, id] = billToRef.split(":");
    if (!id) return { clientProfileId: undefined, facilityProfileId: undefined };
    if (kind === "FACILITY") return { clientProfileId: undefined, facilityProfileId: id };
    return { clientProfileId: id, facilityProfileId: undefined };
  }, [billToRef]);

  const invoiceFilter = useMemo(() => {
    if (!invoiceBillToFilter) {
      return { clientProfileId: undefined, facilityProfileId: undefined };
    }
    const [kind, id] = invoiceBillToFilter.split(":");
    if (!id) return { clientProfileId: undefined, facilityProfileId: undefined };
    if (kind === "FACILITY") return { clientProfileId: undefined, facilityProfileId: id };
    return { clientProfileId: id, facilityProfileId: undefined };
  }, [invoiceBillToFilter]);

  const invoices = useQuery({
    queryKey: [
      "admin-invoices",
      status,
      invoiceBillToFilter,
      debouncedInvoiceQuery,
      page,
      pageSize,
    ],
    queryFn: () =>
      getAdminInvoices({
        status,
        clientProfileId: invoiceFilter.clientProfileId,
        facilityProfileId: invoiceFilter.facilityProfileId,
        q: debouncedInvoiceQuery || undefined,
        page,
        size: pageSize,
      }),
  });

  const uninvoiced = useQuery({
    queryKey: ["uninvoiced-settlements", billToRef],
    queryFn: () => getUninvoicedSettlements(billTo),
    enabled: !!billToRef,
  });

  const generateOutstanding = useMutation({
    mutationFn: (sendNow: boolean) => generateOutstandingInvoices(sendNow),
    onSuccess: (created, sendNow) => {
      setGenerateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["uninvoiced-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      showToast(
        created.length === 0
          ? "No uninvoiced completed shifts to bill"
          : `Generated ${created.length} invoice${created.length === 1 ? "" : "s"}${sendNow ? " and sent" : " as draft"}`,
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const create = useMutation({
    mutationFn: (sendNow: boolean) =>
      createClientInvoice({
        clientProfileId: billTo.clientProfileId,
        facilityProfileId: billTo.facilityProfileId,
        settlementIds: selected,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        sendNow,
      }),
    onSuccess: (inv, sendNow) => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["uninvoiced-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      setSelected([]);
      setNotes("");
      showToast(
        sendNow
          ? `Invoice ${inv.invoiceNumber} sent — payment demanded`
          : `Invoice ${inv.invoiceNumber} saved as draft`,
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const send = useMutation({
    mutationFn: (id: string) => sendClientInvoice(id),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      showToast(`Invoice ${inv.invoiceNumber} sent to client`, "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => markClientInvoicePaid(id),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      showToast(
        `Invoice ${inv.invoiceNumber} marked paid — related shifts set to client paid`,
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const voidInv = useMutation({
    mutationFn: (id: string) => voidClientInvoice(id),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["uninvoiced-settlements"] });
      qc.invalidateQueries({ queryKey: ["finance-settlements"] });
      showToast(`Invoice ${inv.invoiceNumber} voided`, "success");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const selectedTotal = useMemo(() => {
    const rows = uninvoiced.data ?? [];
    return rows
      .filter((r) => selected.includes(r.id))
      .reduce((sum, r) => sum + Number(r.clientAmount), 0);
  }, [uninvoiced.data, selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAll() {
    setSelected((uninvoiced.data ?? []).map((r) => r.id));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold">
            <Receipt className="h-5 w-5 text-ink-muted" aria-hidden />
            Client & facility invoices
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Create an invoice from unpaid completed shifts and send it to demand
            payment from a family or facility. Completed shifts also auto-invoice
            when enabled in Settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={generateOutstanding.isPending}
            onClick={() => setGenerateOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate outstanding
          </Button>
        </div>
      </div>

      <div className="rounded border border-line bg-panel p-4 space-y-4">
        <div>
          <h3 className="font-medium">Create invoice</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Pick a bill-to and unpaid shifts to bill.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Bill to">
            <Select
              value={billToRef}
              onChange={(e) => {
                setBillToRef(e.target.value);
                setSelected([]);
              }}
            >
              <option value="">Select family or facility…</option>
              {(clients.data?.content ?? []).map((c) => {
                const ref = `${c.clientType}:${c.id}`;
                const name =
                  c.clientType === "FACILITY" && c.facilityName
                    ? c.facilityName
                    : `${c.lastName}, ${c.firstName}`;
                const kind =
                  c.clientType === "FACILITY" ? "Facility" : "Family";
                return (
                  <option key={ref} value={ref}>
                    [{kind}] {name}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="Notes (optional)">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions…"
            />
          </Field>
        </div>

        {!billToRef ? (
          <p className="text-sm text-ink-muted">
            Choose a family or facility to see unpaid, uninvoiced shifts.
          </p>
        ) : uninvoiced.isLoading ? (
          <p className="text-sm text-ink-muted">Loading settlements…</p>
        ) : (uninvoiced.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-muted">
            No unpaid settlements available to invoice for this bill-to.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-muted">
                {(uninvoiced.data ?? []).length} shift
                {(uninvoiced.data ?? []).length === 1 ? "" : "s"} ready · Selected{" "}
                {formatMoney(selectedTotal)}
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={selectAll}>
                Select all
              </Button>
            </div>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded border border-line">
              {(uninvoiced.data ?? []).map((row) => (
                <li key={row.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-panel-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{row.shiftDate}</span>
                      <span className="text-ink-muted">
                        {" "}
                        · {Number(row.hours).toFixed(1)} hrs ·{" "}
                        {row.caregiverFirstName} {row.caregiverLastName}
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatMoney(Number(row.clientAmount))}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={selected.length === 0 || create.isPending}
                onClick={() => {
                  if (
                    !confirmAction(
                      `Save draft invoice for ${selected.length} shift${selected.length === 1 ? "" : "s"} totaling ${formatMoney(selectedTotal)}?`,
                    )
                  ) {
                    return;
                  }
                  create.mutate(false);
                }}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Save draft
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selected.length === 0 || create.isPending}
                onClick={() => {
                  if (
                    !confirmAction(
                      `Create and send invoice for ${selected.length} shift${selected.length === 1 ? "" : "s"} totaling ${formatMoney(selectedTotal)}?\n\nThe client will be notified that payment is due.`,
                    )
                  ) {
                    return;
                  }
                  create.mutate(true);
                }}
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Create &amp; send invoice
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded border border-line bg-panel p-4 space-y-3">
        <div>
          <h3 className="font-medium">Invoice list</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            These filters apply only to the invoice list below.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search invoices">
            <Input
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Invoice # or client name…"
            />
          </Field>
          <Field label="Bill to">
            <Select
              value={invoiceBillToFilter}
              onChange={(e) => setInvoiceBillToFilter(e.target.value)}
            >
              <option value="">All families & facilities</option>
              {(clients.data?.content ?? []).map((c) => {
                const ref = `${c.clientType}:${c.id}`;
                const name =
                  c.clientType === "FACILITY" && c.facilityName
                    ? c.facilityName
                    : `${c.lastName}, ${c.firstName}`;
                const kind =
                  c.clientType === "FACILITY" ? "Facility" : "Family";
                return (
                  <option key={ref} value={ref}>
                    [{kind}] {name}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | InvoiceStatus)}
            >
              <option value="">All invoices</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent (to collect)</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setInvoiceQuery("");
                setInvoiceBillToFilter("");
                setStatus("SENT");
              }}
            >
              Sent to mark paid
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(invoices.data?.content ?? []).map((inv) => (
          <article
            key={inv.id}
            className="rounded border border-line bg-panel p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {inv.invoiceNumber}{" "}
                  <span className="font-mono text-[10px] uppercase text-ink-muted">
                    {inv.status}
                  </span>
                </p>
                <p className="text-sm text-ink-muted">
                  {inv.facilityName
                    ? `[Facility] ${inv.facilityName}`
                    : `[Family] ${inv.clientFirstName ?? ""} ${inv.clientLastName ?? ""}`.trim()}{" "}
                  · Issued {inv.issuedDate} · Due {inv.dueDate}
                </p>
                <p className="mt-1 font-display text-xl tabular-nums">
                  {formatMoney(Number(inv.totalAmount))}
                </p>
                {inv.notes ? (
                  <p className="mt-1 text-sm text-ink-muted">{inv.notes}</p>
                ) : null}
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {inv.lines.map((line) => (
                    <li key={line.id}>
                      <Link
                        href={`/shifts/${line.shiftId}`}
                        className="text-accent-deep hover:underline"
                      >
                        {line.shiftDate}
                      </Link>
                      {" · "}
                      {line.description} · {formatMoney(Number(line.amount))}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await downloadAdminInvoicePdf(inv.id, inv.invoiceNumber);
                      showToast("Invoice PDF downloaded", "success");
                    } catch (err) {
                      showToast(
                        err instanceof Error ? err.message : "PDF failed",
                        "error",
                      );
                    }
                  }}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </Button>
                {inv.status === "DRAFT" ? (
                  <Button
                    size="sm"
                    disabled={send.isPending}
                    onClick={() => {
                      if (
                        !confirmAction(
                          `Send invoice ${inv.invoiceNumber} (${formatMoney(Number(inv.totalAmount))}) to the client and demand payment?`,
                        )
                      ) {
                        return;
                      }
                      send.mutate(inv.id);
                    }}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    Send
                  </Button>
                ) : null}
                {inv.status === "SENT" ? (
                  <Button
                    size="sm"
                    disabled={markPaid.isPending}
                    onClick={() => {
                      if (
                        !confirmAction(
                          `Mark invoice ${inv.invoiceNumber} as paid?\n\nThis also marks client payment PAID on ${inv.lines.length} related shift${inv.lines.length === 1 ? "" : "s"}.`,
                        )
                      ) {
                        return;
                      }
                      markPaid.mutate(inv.id);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Mark paid
                  </Button>
                ) : null}
                {inv.status === "DRAFT" || inv.status === "SENT" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={voidInv.isPending}
                    onClick={() => {
                      if (
                        !confirmAction(
                          `Void invoice ${inv.invoiceNumber}?\n\nSettlements can be reinvoiced afterward.`,
                        )
                      ) {
                        return;
                      }
                      voidInv.mutate(inv.id);
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    Void
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!invoices.isLoading && (invoices.data?.content.length ?? 0) === 0 ? (
          <p className="rounded border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            No invoices match these filters.
          </p>
        ) : null}
      </div>

      {invoices.data ? (
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalElements={invoices.data.totalElements}
          totalPages={invoices.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={invoices.isFetching}
        />
      ) : null}

      <ConfirmModal
        open={generateOpen}
        title="Generate outstanding invoices"
        confirmLabel="Generate & send"
        cancelLabel="Not now"
        busy={generateOutstanding.isPending}
        onClose={() => {
          if (!generateOutstanding.isPending) setGenerateOpen(false);
        }}
        onConfirm={() => generateOutstanding.mutate(true)}
        body={
          <div className="space-y-3">
            <p className="text-ink-muted">
              Create one invoice per family or facility for every completed
              shift that has not been invoiced yet, then send them to demand
              payment.
            </p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-ink-muted">
              <li>Only unpaid, uninvoiced completed shifts are included</li>
              <li>Each bill-to gets a single combined invoice</li>
              <li>Invoices are sent immediately (clients are notified)</li>
            </ul>
          </div>
        }
      />
    </section>
  );
}
