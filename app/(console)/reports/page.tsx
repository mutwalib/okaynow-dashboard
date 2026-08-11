"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { Field, Input, Select } from "@/components/ui/field";
import { getAdminClients, type AdminReportType } from "@/lib/api";
import { defaultStatsDateRange, toIsoDate } from "@/lib/format";
import { FileBarChart2 } from "lucide-react";
import {
  CLAIM_STATUSES,
  QUALIFICATIONS,
  SHIFT_STATUSES,
  type ClaimStatus,
  type PaymentStatus,
  type Qualification,
  type ShiftStatus,
  type UserRole,
  type UserStatus,
} from "@/lib/types";

const REPORTS: {
  type: AdminReportType;
  title: string;
  blurb: string;
}[] = [
  {
    type: "FINANCE",
    title: "Finance & settlements",
    blurb: "Completed-shift settlements, client/caregiver payment status, and agency margin.",
  },
  {
    type: "SHIFTS",
    title: "Shifts",
    blurb: "Shift board export with status, qualification, client, date, and pay filters.",
  },
  {
    type: "CLAIMS",
    title: "Claims",
    blurb: "Caregiver claims with claim status filter.",
  },
  {
    type: "CLIENTS",
    title: "Clients",
    blurb: "Client roster matching the search box.",
  },
  {
    type: "USERS",
    title: "Users",
    blurb: "Platform accounts by role, status, and search.",
  },
  {
    type: "AUDIT",
    title: "Audit log",
    blurb: "Recent audited admin and client activity.",
  },
];

const ROLES: UserRole[] = ["CAREGIVER", "CLIENT", "FACILITY", "ADMIN"];
const USER_STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_VERIFICATION",
  "SUSPENDED",
  "DEACTIVATED",
];

export default function ReportsPage() {
  const defaults = defaultStatsDateRange();
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [clientPaymentStatus, setClientPaymentStatus] = useState<
    "" | PaymentStatus
  >("");
  const [caregiverPaymentStatus, setCaregiverPaymentStatus] = useState<
    "" | PaymentStatus
  >("");

  const [shiftStatus, setShiftStatus] = useState<"" | ShiftStatus>("");
  const [qualification, setQualification] = useState<"" | Qualification>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [minPay, setMinPay] = useState("");
  const [maxPay, setMaxPay] = useState("");
  const [dayPeriod, setDayPeriod] = useState("");

  const [claimStatus, setClaimStatus] = useState<"" | ClaimStatus>("");
  const [clientSearch, setClientSearch] = useState("");
  const [userRole, setUserRole] = useState<"" | UserRole>("");
  const [userStatus, setUserStatus] = useState<"" | UserStatus>("");
  const [userSearch, setUserSearch] = useState("");

  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => getAdminClients(),
  });

  const ownerFilter = useMemo(() => {
    const [kind, id] = clientRef.split(":");
    if (!id) return {} as { clientProfileId?: string; facilityProfileId?: string };
    if (kind === "FACILITY") return { facilityProfileId: id };
    if (kind === "FAMILY") return { clientProfileId: id };
    return {} as { clientProfileId?: string; facilityProfileId?: string };
  }, [clientRef]);

  const filterMap = useMemo(
    (): Record<AdminReportType, Record<string, string | undefined>> => ({
      FINANCE: {
        periodStart,
        periodEnd,
        clientPaymentStatus: clientPaymentStatus || undefined,
        caregiverPaymentStatus: caregiverPaymentStatus || undefined,
      },
      SHIFTS: {
        status: shiftStatus || undefined,
        qualification: qualification || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientProfileId: ownerFilter.clientProfileId,
        facilityProfileId: ownerFilter.facilityProfileId,
        minPay: minPay || undefined,
        maxPay: maxPay || undefined,
        dayPeriod: dayPeriod || undefined,
      },
      CLAIMS: {
        status: claimStatus || undefined,
      },
      CLIENTS: {
        search: clientSearch || undefined,
      },
      USERS: {
        role: userRole || undefined,
        status: userStatus || undefined,
        search: userSearch || undefined,
      },
      AUDIT: {},
    }),
    [
      periodStart,
      periodEnd,
      clientPaymentStatus,
      caregiverPaymentStatus,
      shiftStatus,
      qualification,
      dateFrom,
      dateTo,
      ownerFilter.clientProfileId,
      ownerFilter.facilityProfileId,
      minPay,
      maxPay,
      dayPeriod,
      claimStatus,
      clientSearch,
      userRole,
      userStatus,
      userSearch,
    ],
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-start gap-4">
        <img
          src="/branding/okaynow_primary_logo.png"
          alt="OkayNow"
          width={200}
          height={60}
          className="h-12 w-auto"
        />
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <FileBarChart2 className="h-5 w-5 text-ink-muted" aria-hidden />
            Reports
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Generate branded OkayNow PDF or Excel exports. Each file includes the
            logo header, generation timestamp, your account, and the filters you
            set below (or on list pages).
          </p>
        </div>
      </div>

      {REPORTS.map((report) => (
        <section
          key={report.type}
          className="space-y-3 rounded border border-line bg-panel p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">{report.title}</h2>
              <p className="mt-0.5 text-sm text-ink-muted">{report.blurb}</p>
            </div>
            <ExportReportButtons
              type={report.type}
              filters={filterMap[report.type]}
            />
          </div>

          {report.type === "FINANCE" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Period from">
                <Input
                  type="date"
                  value={periodStart}
                  max={periodEnd || toIsoDate(new Date())}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </Field>
              <Field label="Period to">
                <Input
                  type="date"
                  value={periodEnd}
                  min={periodStart || undefined}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </Field>
              <Field label="Client payment">
                <Select
                  value={clientPaymentStatus}
                  onChange={(e) =>
                    setClientPaymentStatus(e.target.value as "" | PaymentStatus)
                  }
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="PAID">Paid</option>
                </Select>
              </Field>
              <Field label="Caregiver payment">
                <Select
                  value={caregiverPaymentStatus}
                  onChange={(e) =>
                    setCaregiverPaymentStatus(
                      e.target.value as "" | PaymentStatus,
                    )
                  }
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="PAID">Paid</option>
                </Select>
              </Field>
            </div>
          ) : null}

          {report.type === "SHIFTS" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={shiftStatus}
                onChange={(e) =>
                  setShiftStatus(e.target.value as "" | ShiftStatus)
                }
              >
                <option value="">All statuses</option>
                {SHIFT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                value={qualification}
                onChange={(e) =>
                  setQualification(e.target.value as "" | Qualification)
                }
              >
                <option value="">All qualifications</option>
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </Select>
              <Select
                value={clientRef}
                onChange={(e) => setClientRef(e.target.value)}
              >
                <option value="">All clients</option>
                {clients.data?.content.map((client) => {
                  const ref = `${client.clientType}:${client.id}`;
                  const name =
                    client.clientType === "FACILITY" && client.facilityName
                      ? client.facilityName
                      : `${client.lastName}, ${client.firstName}`;
                  const kind =
                    client.clientType === "FACILITY" ? "Facility" : "Family";
                  return (
                    <option key={ref} value={ref}>
                      [{kind}] {name}
                    </option>
                  );
                })}
              </Select>
              <Select
                value={dayPeriod}
                onChange={(e) => setDayPeriod(e.target.value)}
              >
                <option value="">Any time of day</option>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
                <option value="NIGHT">Night</option>
                <option value="ALL_DAY">All day</option>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="To date"
              />
              <Input
                type="number"
                min="0"
                placeholder="Min pay"
                value={minPay}
                onChange={(e) => setMinPay(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                placeholder="Max pay"
                value={maxPay}
                onChange={(e) => setMaxPay(e.target.value)}
              />
            </div>
          ) : null}

          {report.type === "CLAIMS" ? (
            <div className="max-w-xs">
              <Select
                value={claimStatus}
                onChange={(e) =>
                  setClaimStatus(e.target.value as "" | ClaimStatus)
                }
              >
                <option value="">All statuses</option>
                {CLAIM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {report.type === "CLIENTS" ? (
            <div className="max-w-md">
              <Input
                placeholder="Search clients…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
          ) : null}

          {report.type === "USERS" ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <Select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as "" | UserRole)}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <Select
                value={userStatus}
                onChange={(e) =>
                  setUserStatus(e.target.value as "" | UserStatus)
                }
              >
                <option value="">All statuses</option>
                {USER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Search email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
