"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveUserReview,
  cancelOnboardingRequest,
  createOwner,
  createUserOnboardingRequest,
  getAdminUserReview,
  getAdminUsers,
  mediaUrl,
  requestOnboardingResubmit,
  updateUserStatus,
  type OnboardingFieldType,
} from "@/lib/api";
import type { UserRole, UserStatus } from "@/lib/types";
import {
  CARE_RECIPIENT_RELATIONSHIP_LABEL,
  MEDICAID_ELIGIBILITY_LABEL,
  type CareRecipientRelationship,
  type MedicaidEligibility,
} from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import {
  CheckCircle2,
  FileWarning,
  IdCard,
  ShieldAlert,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";

const ROLES: UserRole[] = ["CAREGIVER", "CLIENT", "FACILITY", "ADMIN"];
const STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_REVIEW",
  "PENDING_VERIFICATION",
  "SUSPENDED",
  "DEACTIVATED",
];

type KycPreset = {
  label: string;
  title: string;
  instructions: string;
  fieldType: OnboardingFieldType;
  roles: UserRole[];
};

const KYC_PRESETS: KycPreset[] = [
  {
    label: "Profile photo",
    title: "Profile photo",
    instructions: "Upload a clear, recent photo of your face for your caregiver profile.",
    fieldType: "PROFILE_PHOTO",
    roles: ["CAREGIVER"],
  },
  {
    label: "CORI clearance",
    title: "CORI clearance document",
    instructions: "Upload your current Massachusetts CORI clearance PDF or image.",
    fieldType: "FILE",
    roles: ["CAREGIVER"],
  },
  {
    label: "SORI clearance",
    title: "SORI clearance document",
    instructions: "Upload your current Massachusetts SORI clearance PDF or image.",
    fieldType: "FILE",
    roles: ["CAREGIVER"],
  },
  {
    label: "License / cert",
    title: "Professional license or certification",
    instructions: "Upload your CNA/HHA/PCA/LPN/RN license or certification showing number and expiry.",
    fieldType: "FILE",
    roles: ["CAREGIVER"],
  },
  {
    label: "CPR / First aid",
    title: "CPR or First Aid certificate",
    instructions: "Upload a valid CPR and/or First Aid certificate.",
    fieldType: "FILE",
    roles: ["CAREGIVER"],
  },
  {
    label: "Government ID",
    title: "Government-issued photo ID",
    instructions: "Upload a clear photo or scan of a government-issued photo ID.",
    fieldType: "FILE",
    roles: ["CAREGIVER", "CLIENT"],
  },
  {
    label: "Proof of address",
    title: "Proof of address",
    instructions: "Upload a utility bill or official document showing your current Massachusetts address.",
    fieldType: "FILE",
    roles: ["CAREGIVER", "CLIENT"],
  },
  {
    label: "Other (custom)",
    title: "",
    instructions: "",
    fieldType: "FILE",
    roles: ["CAREGIVER", "CLIENT"],
  },
];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink break-words">{value}</dd>
    </div>
  );
}

export default function UsersPage() {
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState("CORI clearance");
  const [reqTitle, setReqTitle] = useState("CORI clearance document");
  const [reqInstructions, setReqInstructions] = useState(
    "Upload your current Massachusetts CORI clearance PDF or image.",
  );
  const [reqType, setReqType] = useState<OnboardingFieldType>("FILE");
  const { page, setPage, pageSize, setPageSize } = useListPagination(
    `${role}|${status}|${search}`,
  );
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["owner-users", role, status, search, page, pageSize],
    queryFn: () =>
      getAdminUsers({
        role,
        status,
        search: search || undefined,
        page,
        size: pageSize,
      }),
  });

  const review = useQuery({
    queryKey: ["owner-user-review", selectedUserId],
    queryFn: () => getAdminUserReview(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const availablePresets = useMemo(() => {
    const r = review.data?.role;
    if (!r) return KYC_PRESETS;
    return KYC_PRESETS.filter((p) => p.roles.includes(r));
  }, [review.data?.role]);

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: UserStatus }) =>
      updateUserStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      queryClient.invalidateQueries({ queryKey: ["owner-user-review"] });
      showToast("User status updated", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveUserReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      queryClient.invalidateQueries({ queryKey: ["owner-user-review"] });
      showToast("Account verified and activated", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const createRequest = useMutation({
    mutationFn: () =>
      createUserOnboardingRequest(selectedUserId!, {
        title: reqTitle,
        instructions: reqInstructions || undefined,
        fieldType: reqType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-user-review"] });
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      showToast("KYC request sent to the applicant", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const cancelReq = useMutation({
    mutationFn: (id: string) => cancelOnboardingRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-user-review"] });
      showToast("KYC request cancelled", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const resubmitReq = useMutation({
    mutationFn: (id: string) => requestOnboardingResubmit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-user-review"] });
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      showToast("Applicant asked to resubmit this item", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const addOwner = useMutation({
    mutationFn: () =>
      createOwner({ email: ownerEmail, password: ownerPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      setOwnerEmail("");
      setOwnerPassword("");
      setShowOwnerForm(false);
      showToast("Platform owner created", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  function applyPreset(label: string) {
    setPresetKey(label);
    const preset = KYC_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    if (preset.title) setReqTitle(preset.title);
    if (preset.instructions) setReqInstructions(preset.instructions);
    setReqType(preset.fieldType);
  }

  function selectUser(id: string, userRole: UserRole) {
    setSelectedUserId(id);
    const first =
      KYC_PRESETS.find((p) => p.roles.includes(userRole) && p.label !== "Other (custom)") ??
      KYC_PRESETS[0];
    applyPreset(first.label);
  }

  function submitOwner(event: FormEvent) {
    event.preventDefault();
    addOwner.mutate();
  }

  const detail = review.data;
  const canApprove =
    detail &&
    detail.pendingReview &&
    (detail.role === "CAREGIVER" || detail.role === "CLIENT") &&
    detail.openKycRequests === 0;

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <UserCog className="h-5 w-5 text-ink-muted" aria-hidden />
            Users & KYC review
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Open an applicant to see their full profile, review submitted documents,
            request more KYC, and approve verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportReportButtons
            type="USERS"
            filters={{
              role: role || undefined,
              status: status || undefined,
              search: search || undefined,
            }}
          />
          <Button onClick={() => setShowOwnerForm((value) => !value)}>
            {showOwnerForm ? (
              <>
                <X className="h-3.5 w-3.5" aria-hidden />
                Close
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Add platform owner
              </>
            )}
          </Button>
        </div>
      </div>

      {showOwnerForm ? (
        <form
          onSubmit={submitOwner}
          className="grid gap-3 rounded border border-line bg-panel p-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            type="email"
            required
            placeholder="owner@example.com"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
          />
          <Input
            type="password"
            required
            minLength={12}
            placeholder="Temporary password (12+ characters)"
            value={ownerPassword}
            onChange={(event) => setOwnerPassword(event.target.value)}
          />
          <Button type="submit" disabled={addOwner.isPending}>
            {addOwner.isPending ? "Creating…" : "Create owner"}
          </Button>
        </form>
      ) : null}

      <div className="grid gap-3 rounded border border-line bg-panel p-4 md:grid-cols-3">
        <Input
          placeholder="Search email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole | "")}
        >
          <option value="">All roles</option>
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as UserStatus | "")
          }
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div>
          {users.isLoading ? (
            <p className="text-sm text-ink-muted">Loading users…</p>
          ) : users.isError ? (
            <p className="text-sm text-danger">
              {users.error instanceof Error
                ? users.error.message
                : "Could not load users"}
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-line bg-panel">
              <table className="table-dense w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.data?.content ?? []).map((user) => (
                    <tr
                      key={user.id}
                      className={
                        selectedUserId === user.id ? "bg-brand-soft/40" : undefined
                      }
                    >
                      <td>
                        <button
                          type="button"
                          className="text-left font-medium text-brand-deep hover:underline"
                          onClick={() => selectUser(user.id, user.role)}
                        >
                          {user.displayName || user.email}
                        </button>
                        <div className="text-[11px] text-ink-muted">{user.email}</div>
                        {user.phone ? (
                          <div className="text-[11px] text-ink-muted">
                            {user.phone}
                          </div>
                        ) : null}
                      </td>
                      <td className="font-mono text-xs">{user.role}</td>
                      <td>
                        <span className="rounded bg-surface px-2 py-1 font-mono text-[10px] font-semibold">
                          {user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Select
                          value={user.status}
                          disabled={changeStatus.isPending}
                          onChange={(event) =>
                            changeStatus.mutate({
                              id: user.id,
                              next: event.target.value as UserStatus,
                            })
                          }
                        >
                          {STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {(users.data?.content.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-muted">
                        No users match these filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
          {users.data ? (
            <ListPagination
              page={page}
              pageSize={pageSize}
              totalElements={users.data.totalElements}
              totalPages={users.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={users.isFetching}
            />
          ) : null}
        </div>

        <div className="rounded border border-line bg-panel p-4">
          {!selectedUserId ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
              <IdCard className="h-8 w-8 text-ink-muted" aria-hidden />
              <p className="text-sm font-medium text-ink">Select an applicant</p>
              <p className="max-w-sm text-sm text-ink-muted">
                Click a caregiver or client in the list to open their verification dossier,
                review KYC submissions, and request more documents.
              </p>
            </div>
          ) : review.isLoading ? (
            <p className="text-sm text-ink-muted">Loading applicant details…</p>
          ) : review.isError ? (
            <p className="text-sm text-danger">
              {review.error instanceof Error
                ? review.error.message
                : "Could not load review details"}
            </p>
          ) : detail ? (
            <div className="space-y-5">
              <div className="space-y-2 border-b border-line pb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Account verification / KYC
                    </p>
                    <h2 className="font-display text-xl font-semibold">
                      {detail.displayName}
                    </h2>
                    <p className="text-sm text-ink-muted">{detail.email}</p>
                  </div>
                  <span className="rounded bg-surface px-2 py-1 font-mono text-[10px] font-semibold">
                    {detail.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded border border-line px-2 py-1">
                    Role: {detail.role}
                  </span>
                  <span className="rounded border border-line px-2 py-1">
                    Email: {detail.emailVerified ? "Verified" : "Not verified"}
                  </span>
                  <span className="rounded border border-line px-2 py-1">
                    Open KYC: {detail.openKycRequests}
                  </span>
                  <span className="rounded border border-line px-2 py-1">
                    Submitted KYC: {detail.submittedKycRequests}
                  </span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Applicant details</h3>
                <dl className="space-y-1.5 rounded border border-line bg-surface p-3">
                  <DetailRow label="Phone" value={detail.phone} />
                  <DetailRow
                    label="Registered"
                    value={new Date(detail.createdAt).toLocaleString()}
                  />
                  {detail.emailVerifiedAt ? (
                    <DetailRow
                      label="Email verified"
                      value={new Date(detail.emailVerifiedAt).toLocaleString()}
                    />
                  ) : null}

                  {detail.caregiver ? (
                    <>
                      <DetailRow
                        label="Name"
                        value={`${detail.caregiver.firstName} ${detail.caregiver.lastName}`}
                      />
                      <DetailRow
                        label="Qualifications"
                        value={
                          detail.caregiver.qualifications?.length
                            ? detail.caregiver.qualifications.join(", ")
                            : "None set"
                        }
                      />
                      <DetailRow
                        label="Pay range"
                        value={
                          detail.caregiver.hourlyRateMin != null ||
                          detail.caregiver.hourlyRateMax != null
                            ? `$${detail.caregiver.hourlyRateMin ?? "—"} – $${detail.caregiver.hourlyRateMax ?? "—"} /hr`
                            : "Not set"
                        }
                      />
                      <DetailRow
                        label="Service radius"
                        value={
                          detail.caregiver.serviceRadiusMiles != null
                            ? `${detail.caregiver.serviceRadiusMiles} mi`
                            : "Not set"
                        }
                      />
                      <DetailRow
                        label="Home address"
                        value={
                          detail.caregiver.homeAddressLine
                            ? [
                                detail.caregiver.homeAddressLine,
                                [detail.caregiver.homeCity, detail.caregiver.homeState]
                                  .filter(Boolean)
                                  .join(", "),
                                detail.caregiver.homeZip,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : detail.caregiver.homeLat != null &&
                                detail.caregiver.homeLng != null
                              ? `${detail.caregiver.homeLat.toFixed(5)}, ${detail.caregiver.homeLng.toFixed(5)}`
                              : "Not set"
                        }
                      />
                      {detail.caregiver.profilePhotoUrl ? (
                        <div className="pt-2">
                          <p className="mb-2 text-xs text-ink-muted">Profile photo</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              mediaUrl(detail.caregiver.profilePhotoUrl) ??
                              detail.caregiver.profilePhotoUrl
                            }
                            alt="Applicant profile"
                            className="h-24 w-24 rounded-full border border-line object-cover"
                          />
                        </div>
                      ) : (
                        <DetailRow label="Profile photo" value="Not uploaded yet" />
                      )}
                    </>
                  ) : null}

                  {detail.client ? (
                    <>
                      <DetailRow
                        label="Name"
                        value={`${detail.client.firstName} ${detail.client.lastName}`}
                      />
                      <DetailRow
                        label="Address"
                        value={[
                          detail.client.addressLine,
                          detail.client.city,
                          detail.client.state,
                          detail.client.zip,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Not set"}
                      />
                      <DetailRow
                        label="Registering for"
                        value={
                          detail.client.registeringForSelf
                            ? "Self"
                            : "Someone else"
                        }
                      />
                      {detail.client.medicaidEligible ? (
                        <DetailRow
                          label="Medicaid"
                          value={
                            MEDICAID_ELIGIBILITY_LABEL[
                              detail.client.medicaidEligible as MedicaidEligibility
                            ] ?? detail.client.medicaidEligible
                          }
                        />
                      ) : null}
                      {detail.client.relationshipToCareRecipient ? (
                        <DetailRow
                          label="Relationship"
                          value={
                            CARE_RECIPIENT_RELATIONSHIP_LABEL[
                              detail.client
                                .relationshipToCareRecipient as CareRecipientRelationship
                            ] ?? detail.client.relationshipToCareRecipient
                          }
                        />
                      ) : null}
                      <DetailRow
                        label="Care needs"
                        value={detail.client.careNeeds || "Not provided"}
                      />
                    </>
                  ) : null}
                </dl>
              </section>

              {detail.credentials.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Credential vault</h3>
                  <div className="space-y-2">
                    {detail.credentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="rounded border border-line bg-surface p-3 text-sm"
                      >
                        <p className="font-medium">
                          {cred.credentialType} · {cred.verificationStatus}
                        </p>
                        {cred.licenseNumber ? (
                          <p className="text-xs text-ink-muted">
                            License #: {cred.licenseNumber}
                          </p>
                        ) : null}
                        {cred.expiryDate ? (
                          <p className="text-xs text-ink-muted">
                            Expires: {cred.expiryDate}
                          </p>
                        ) : null}
                        {cred.documentUrl ? (
                          <a
                            href={mediaUrl(cred.documentUrl) ?? cred.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs font-medium text-brand-deep underline"
                          >
                            View document
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                  <FileWarning className="h-4 w-4 text-ink-muted" aria-hidden />
                  KYC requests & submissions
                </h3>
                {detail.kycRequests.length === 0 ? (
                  <p className="rounded border border-dashed border-line bg-surface p-3 text-sm text-ink-muted">
                    No KYC items yet. Use “Request more KYC” below if you need documents
                    before approving.
                  </p>
                ) : (
                  detail.kycRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded border border-line bg-surface p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{req.title}</p>
                          <p className="text-xs text-ink-muted">
                            {req.fieldType} · {req.status}
                            {req.submittedAt
                              ? ` · submitted ${new Date(req.submittedAt).toLocaleString()}`
                              : ""}
                          </p>
                          {req.instructions ? (
                            <p className="mt-1 text-xs text-ink-muted">
                              {req.instructions}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(req.status === "SUBMITTED" ||
                            req.status === "ACCEPTED") && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => resubmitReq.mutate(req.id)}
                              disabled={resubmitReq.isPending}
                            >
                              Ask to resubmit
                            </Button>
                          )}
                          {(req.status === "OPEN" ||
                            req.status === "SUBMITTED") && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelReq.mutate(req.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      {req.status === "OPEN" ? (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Waiting on applicant
                        </p>
                      ) : null}
                      {req.responseText ? (
                        <p className="mt-2 whitespace-pre-wrap rounded bg-panel p-2 text-ink">
                          {req.responseText}
                        </p>
                      ) : null}
                      {req.fileUrl ? (
                        <a
                          href={mediaUrl(req.fileUrl) ?? req.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-brand-deep underline"
                        >
                          View uploaded KYC file
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </section>

              {(detail.role === "CAREGIVER" || detail.role === "CLIENT") && (
                <section className="space-y-3 rounded border border-accent/40 bg-surface p-3">
                  <div>
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                      <ShieldAlert className="h-4 w-4 text-accent" aria-hidden />
                      Request more KYC
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      This sends a required item to the applicant’s pending-review screen.
                      They cannot use the platform until you approve them.
                    </p>
                  </div>
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      createRequest.mutate();
                    }}
                  >
                    <Select
                      value={presetKey}
                      onChange={(e) => applyPreset(e.target.value)}
                    >
                      {availablePresets.map((preset) => (
                        <option key={preset.label} value={preset.label}>
                          {preset.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      required
                      placeholder="KYC request title"
                      value={reqTitle}
                      onChange={(e) => setReqTitle(e.target.value)}
                    />
                    <Textarea
                      rows={3}
                      placeholder="Instructions the applicant will see"
                      value={reqInstructions}
                      onChange={(e) => setReqInstructions(e.target.value)}
                    />
                    <Select
                      value={reqType}
                      onChange={(e) =>
                        setReqType(e.target.value as OnboardingFieldType)
                      }
                    >
                      <option value="FILE">File upload (PDF/image)</option>
                      <option value="TEXT">Text response</option>
                      {detail.role === "CAREGIVER" ? (
                        <option value="PROFILE_PHOTO">Profile photo</option>
                      ) : null}
                    </Select>
                    <Button type="submit" disabled={createRequest.isPending}>
                      {createRequest.isPending
                        ? "Sending KYC request…"
                        : "Send KYC request to applicant"}
                    </Button>
                  </form>
                </section>
              )}

              {detail.pendingReview ? (
                <section className="space-y-2 rounded border border-line p-3">
                  <h3 className="text-sm font-semibold">Approve verification</h3>
                  {detail.openKycRequests > 0 ? (
                    <p className="text-sm text-amber-700">
                      {detail.openKycRequests} KYC request
                      {detail.openKycRequests === 1 ? " is" : "s are"} still open.
                      Wait for the applicant to submit, or cancel open requests before
                      approving.
                    </p>
                  ) : (
                    <p className="text-sm text-ink-muted">
                      All open KYC items are cleared. Approving activates this account
                      and unlocks the full platform for the applicant.
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={!canApprove || approve.isPending}
                    onClick={() => approve.mutate(detail.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {approve.isPending
                      ? "Approving…"
                      : "Approve & activate account"}
                  </Button>
                </section>
              ) : (
                <p className="text-sm text-ink-muted">
                  This account is not in pending review. You can still request KYC,
                  which will move them back to PENDING_REVIEW.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
