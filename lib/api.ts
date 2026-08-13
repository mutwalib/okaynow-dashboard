import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearAuthSession,
} from "./auth-cookie";
import type {
  AssignmentType,
  AuditLog,
  CareRecipientRelationship,
  CaregiverOption,
  ClaimStatus,
  ClientCaregiverAssignment,
  ClientProfile,
  MedicaidEligibility,
  PagedResponse,
  Qualification,
  Shift,
  ShiftClaim,
  ShiftScheduleType,
  ScheduleDay,
  UserResponse,
  UserRole,
  UserStatus,
  AgencySettings,
  ClientInvoice,
  FinanceSummary,
  InvoiceStatus,
  Settlement,
  PaymentStatus,
  Visit,
  AppNotification,
  CaregiverReview,
  QualificationRulePack,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  requiresOtp: boolean;
  email: string;
  message?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresInSeconds?: number | null;
  userId?: string | null;
  role?: UserRole | null;
}

export interface MessageResponse {
  message: string;
}

export interface CreateShiftPayload {
  clientProfileId?: string;
  facilityProfileId?: string;
  requiredQualification: Qualification;
  date?: string;
  endDate?: string;
  scheduleType?: ShiftScheduleType;
  startTime: string;
  endTime: string;
  addressLine: string;
  city: string;
  state?: string;
  zip: string;
  lat?: number;
  lng?: number;
  payRate: number;
  billRate: number;
  notes?: string;
  /** Caregivers needed for this shift (default 1). */
  requiredHeadcount?: number;
  /** Fill from client roster (PRIMARY first) when creating. */
  assignFromRoster?: boolean;
}

export interface CreateShiftResponse {
  scheduleType: ShiftScheduleType;
  seriesId: string | null;
  createdCount: number;
  skippedOverlapCount?: number;
  shifts: Shift[];
}

export interface UpdateShiftPayload {
  requiredQualification?: Qualification;
  date?: string;
  startTime?: string;
  endTime?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  payRate?: number;
  billRate?: number;
  notes?: string;
}

export interface ShiftFilters {
  qualification?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  clientProfileId?: string;
  facilityProfileId?: string;
  minPay?: number;
  maxPay?: number;
  dayPeriod?: string;
  page?: number;
  size?: number;
}

export interface ClaimFilters {
  status?: ClaimStatus | "";
  page?: number;
  size?: number;
}

let refreshPromise: Promise<string | null> | null = null;

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part || typeof atob !== "function") return null;
    const padded =
      part.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function accessTokenExpiresSoon(token: string, skewSeconds = 90): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now() + skewSeconds * 1000;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearAuthSession();
          return null;
        }
        const data = (await res.json()) as BackendAuthResponse;
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return data.accessToken;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Never returns an expired access JWT (avoids STOMP reconnect storms). */
export async function ensureFreshAccessToken(
  options: { force?: boolean } = {},
): Promise<string | null> {
  const current = getAccessToken();
  if (!options.force && current && !accessTokenExpiresSoon(current)) {
    return current;
  }
  const refreshed = await refreshAccessToken();
  if (refreshed && !accessTokenExpiresSoon(refreshed, 0)) {
    return refreshed;
  }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Could not reach API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (res.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const next = await refreshAccessToken();
    if (next) return request<T>(path, options, false);
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- auth ---

export function loginUser(payload: LoginPayload) {
  return request<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyLoginOtp(email: string, code: string) {
  return request<BackendAuthResponse>("/api/auth/verify-login-otp", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function resendLoginOtp(email: string) {
  return request<MessageResponse>("/api/auth/resend-login-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(email: string) {
  return request<MessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return request<MessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export function getMe() {
  return request<UserResponse>("/api/users/me");
}

// --- shifts ---

export function getShifts(filters: ShiftFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return request<PagedResponse<Shift>>(`/api/shifts${qs ? `?${qs}` : ""}`);
}

export function getShift(id: string) {
  return request<Shift>(`/api/shifts/${id}`);
}

export function createShift(payload: CreateShiftPayload) {
  return request<CreateShiftResponse>("/api/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getScheduleCalendar(
  from: string,
  to: string,
  clientProfileId?: string,
  facilityProfileId?: string,
) {
  const params = new URLSearchParams({ from, to });
  if (clientProfileId) params.set("clientProfileId", clientProfileId);
  if (facilityProfileId) params.set("facilityProfileId", facilityProfileId);
  return request<ScheduleDay[]>(`/api/schedule/calendar?${params}`);
}

export function requestShiftReplacement(
  id: string,
  reason?: string,
  slots?: number,
) {
  return request<Shift>(`/api/shifts/${id}/request-replacement`, {
    method: "POST",
    body: JSON.stringify({
      reason: reason || undefined,
      slots: slots ?? undefined,
    }),
  });
}

export function closeShiftMarketplace(id: string) {
  return request<Shift>(`/api/shifts/${id}/close-marketplace`, {
    method: "POST",
  });
}

export function updateShift(id: string, payload: UpdateShiftPayload) {
  return request<Shift>(`/api/shifts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteShift(id: string) {
  return request<void>(`/api/shifts/${id}`, { method: "DELETE" });
}

/** Expected admin lifecycle endpoints (booking phase). */
export function startShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/start`, { method: "POST" });
}

export function getVisitByShift(shiftId: string) {
  return request<Visit | undefined>(`/api/visits/by-shift/${shiftId}`).then(
    (visit) => visit ?? null,
  );
}

export function cancelShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/cancel`, { method: "POST" });
}

export function completeShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/complete`, { method: "POST" });
}

export function extendShift(id: string, endTime: string) {
  return request<void>(`/api/admin/shifts/${id}/extend`, {
    method: "POST",
    body: JSON.stringify({ endTime }),
  });
}

export function publishShift(id: string) {
  return request<Shift>(`/api/admin/shifts/${id}/publish`, { method: "POST" });
}

export function unpublishShift(id: string) {
  return request<Shift>(`/api/admin/shifts/${id}/unpublish`, { method: "POST" });
}

// --- claims (expected booking-phase admin endpoints) ---

export function getAdminClaims(filters: ClaimFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return request<PagedResponse<ShiftClaim>>(
    `/api/admin/claims${qs ? `?${qs}` : ""}`,
  );
}

export function getShiftClaims(id: string) {
  return request<ShiftClaim[]>(`/api/admin/shifts/${id}/claims`);
}

export function assignCaregiverToShift(shiftId: string, caregiverProfileId: string) {
  return request<ShiftClaim>(`/api/admin/shifts/${shiftId}/assign`, {
    method: "POST",
    body: JSON.stringify({ caregiverProfileId }),
  });
}

export function inviteCaregiverToShift(shiftId: string, caregiverProfileId: string) {
  return request<ShiftClaim>(`/api/admin/shifts/${shiftId}/invite`, {
    method: "POST",
    body: JSON.stringify({ caregiverProfileId }),
  });
}

export function unassignCaregiverFromShift(shiftId: string) {
  return request<ShiftClaim>(`/api/admin/shifts/${shiftId}/unassign`, {
    method: "POST",
  });
}

export function confirmClaim(id: string) {
  return request<ShiftClaim>(`/api/admin/claims/${id}/confirm`, {
    method: "POST",
  });
}

export function cancelClaim(id: string, cancelReason: string) {
  return request<ShiftClaim>(`/api/admin/claims/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancelReason }),
  });
}

export function revertStartShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/revert-start`, { method: "POST" });
}

export function revertCompleteShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/revert-complete`, {
    method: "POST",
  });
}

export function reopenShift(id: string) {
  return request<void>(`/api/admin/shifts/${id}/reopen`, { method: "POST" });
}

// --- platform users ---

export interface UserFilters {
  role?: UserRole | "";
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}

export function getAdminUsers(filters: UserFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  return request<PagedResponse<UserResponse>>(
    `/api/admin/users${params.size ? `?${params}` : ""}`,
  );
}

export type OnboardingFieldType = "TEXT" | "FILE" | "PROFILE_PHOTO";
export type OnboardingRequestStatus =
  | "OPEN"
  | "SUBMITTED"
  | "ACCEPTED"
  | "CANCELLED";

export interface OnboardingRequestItem {
  id: string;
  title: string;
  instructions: string | null;
  fieldType: OnboardingFieldType;
  status: OnboardingRequestStatus;
  responseText: string | null;
  fileUrl: string | null;
  createdAt: string;
  submittedAt: string | null;
}

export interface AdminUserReviewDetail {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  displayName: string;
  pendingReview: boolean;
  openKycRequests: number;
  submittedKycRequests: number;
  caregiver: {
    profileId: string;
    firstName: string;
    lastName: string;
    qualifications: string[];
    hourlyRateMin: number | null;
    hourlyRateMax: number | null;
    serviceRadiusMiles: number | null;
    homeAddressLine: string | null;
    homeCity: string | null;
    homeState: string | null;
    homeZip: string | null;
    homeLat: number | null;
    homeLng: number | null;
    profilePhotoUrl: string | null;
  } | null;
  client: {
    profileId: string;
    firstName: string;
    lastName: string;
    addressLine: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    careNeeds: string | null;
    registeringForSelf: boolean;
    medicaidEligible: string | null;
    relationshipToCareRecipient: string | null;
  } | null;
  credentials: {
    id: string;
    credentialType: string;
    licenseNumber: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    documentUrl: string | null;
    verificationStatus: string;
  }[];
  kycRequests: OnboardingRequestItem[];
}

export function getAdminUserReview(userId: string) {
  return request<AdminUserReviewDetail>(`/api/admin/users/${userId}/review`);
}

export function updateUserStatus(id: string, status: string) {
  return request<UserResponse>(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getUserOnboardingRequests(userId: string) {
  return request<OnboardingRequestItem[]>(
    `/api/admin/users/${userId}/onboarding-requests`,
  );
}

export function createUserOnboardingRequest(
  userId: string,
  payload: {
    title: string;
    instructions?: string;
    fieldType: OnboardingFieldType;
  },
) {
  return request<OnboardingRequestItem>(
    `/api/admin/users/${userId}/onboarding-requests`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function approveUserReview(userId: string) {
  return request<{ message: string }>(
    `/api/admin/users/${userId}/approve-review`,
    { method: "POST" },
  );
}

export function cancelOnboardingRequest(requestId: string) {
  return request<OnboardingRequestItem>(
    `/api/admin/onboarding-requests/${requestId}/cancel`,
    { method: "POST" },
  );
}

export function requestOnboardingResubmit(requestId: string) {
  return request<OnboardingRequestItem>(
    `/api/admin/onboarding-requests/${requestId}/request-resubmit`,
    { method: "POST" },
  );
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createOwner(payload: {
  email: string;
  password: string;
  phone?: string;
}) {
  return request<UserResponse>("/api/admin/users/owners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- clients ---

export interface CreateClientPayload {
  email: string;
  password: string;
  phone?: string;
  firstName: string;
  lastName: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  careNeeds?: string;
  registeringForSelf: boolean;
  medicaidEligible?: MedicaidEligibility;
  relationshipToCareRecipient?: CareRecipientRelationship;
}

export function getAdminClients(
  search = "",
  opts: { page?: number; size?: number } = {},
) {
  const params = new URLSearchParams();
  params.set("page", String(opts.page ?? 0));
  // Dropdowns / pickers keep a large default; list pages pass an explicit size.
  params.set("size", String(opts.size ?? 100));
  if (search.trim()) params.set("search", search.trim());
  return request<PagedResponse<ClientProfile>>(`/api/admin/clients?${params}`);
}

export function createAdminClient(payload: CreateClientPayload) {
  return request<ClientProfile>("/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ClientShiftPermissions {
  canViewShifts: boolean;
  canCreateShifts: boolean;
  canUpdateShifts: boolean;
  canDeleteShifts: boolean;
}

export function updateClientShiftPermissions(
  clientId: string,
  permissions: ClientShiftPermissions,
) {
  return request<ClientProfile>(`/api/admin/clients/${clientId}/shift-permissions`, {
    method: "PATCH",
    body: JSON.stringify(permissions),
  });
}

export function updatePlatformPayment(id: string, platformPaid: boolean) {
  return request<Shift>(`/api/shifts/${id}/platform-payment`, {
    method: "PATCH",
    body: JSON.stringify({ platformPaid }),
  });
}

export function getAuditLogs(page = 0, size = 50) {
  return request<PagedResponse<AuditLog>>(
    `/api/admin/audit-logs?page=${page}&size=${size}`,
  );
}

export function getCaregiverOptions() {
  return request<CaregiverOption[]>("/api/admin/caregiver-options");
}

export function getSuggestedCaregivers(shiftId: string) {
  return request<import("./types").ContinuityCaregiverSuggestion[]>(
    `/api/admin/shifts/${shiftId}/suggested-caregivers`,
  );
}

export function getOpsAttention() {
  return request<import("./types").OpsAttention>("/api/admin/ops/attention");
}

export function getClientCaregivers(clientId: string) {
  return request<ClientCaregiverAssignment[]>(
    `/api/admin/clients/${clientId}/caregivers`,
  );
}

export function assignClientCaregiver(
  clientId: string,
  payload: {
    caregiverProfileId: string;
    assignmentType: AssignmentType;
    notes?: string;
    fillOpenShifts?: boolean;
  },
) {
  return request<{
    assignment: ClientCaregiverAssignment;
    openShiftsFilled: number;
    scheduleClaimsReleased: number;
  }>(`/api/admin/clients/${clientId}/caregivers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fillClientCaregiverOpenShifts(
  clientId: string,
  assignmentId: string,
) {
  return request<{
    assignment: ClientCaregiverAssignment;
    openShiftsFilled: number;
    scheduleClaimsReleased: number;
  }>(`/api/admin/clients/${clientId}/caregivers/${assignmentId}/fill-open-shifts`, {
    method: "POST",
  });
}

export function unassignClientCaregiver(
  clientId: string,
  assignmentId: string,
  clearSchedule = true,
) {
  const qs = clearSchedule ? "" : "?clearSchedule=false";
  return request<{
    assignment: ClientCaregiverAssignment;
    openShiftsFilled: number;
    scheduleClaimsReleased: number;
  }>(`/api/admin/clients/${clientId}/caregivers/${assignmentId}${qs}`, {
    method: "DELETE",
  });
}

export function getAgencySettings() {
  return request<AgencySettings>("/api/admin/settings/agency");
}

export function updateAgencySettings(payload: AgencySettings) {
  return request<AgencySettings>("/api/admin/settings/agency", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listMarketplaceRulePacks() {
  return request<QualificationRulePack[]>("/api/admin/marketplace/rule-packs");
}

export function updateMarketplaceRulePack(
  qualification: Qualification,
  payload: Omit<QualificationRulePack, "id" | "qualification"> &
    Partial<Pick<QualificationRulePack, "id" | "qualification">>,
) {
  return request<QualificationRulePack>(
    `/api/admin/marketplace/rule-packs/${qualification}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export type LegalDocumentType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "PLATFORM_POLICY";

export interface LegalDocument {
  id: string;
  documentType: LegalDocumentType | string;
  version: number;
  title: string;
  body: string;
  published: boolean;
  publishedAt?: string | null;
  createdAt?: string;
}

export function getCurrentLegalDocuments() {
  return request<LegalDocument[]>("/api/legal/current");
}

export function publishLegalDocument(payload: {
  documentType: LegalDocumentType | string;
  title: string;
  body: string;
  publish: boolean;
}) {
  return request<LegalDocument>("/api/legal/admin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getFinanceSummary(periodStart?: string, periodEnd?: string) {
  const params = new URLSearchParams();
  if (periodStart) params.set("periodStart", periodStart);
  if (periodEnd) params.set("periodEnd", periodEnd);
  const qs = params.toString();
  return request<FinanceSummary>(
    `/api/admin/finance/summary${qs ? `?${qs}` : ""}`,
  );
}

export function getFinanceSettlements(filters: {
  periodStart?: string;
  periodEnd?: string;
  clientPaymentStatus?: PaymentStatus;
  caregiverPaymentStatus?: PaymentStatus;
  q?: string;
  page?: number;
  size?: number;
} = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return request<PagedResponse<Settlement>>(
    `/api/admin/finance/settlements${qs ? `?${qs}` : ""}`,
  );
}

export function updateSettlementClientPayment(
  id: string,
  status: PaymentStatus,
) {
  return request<Settlement>(`/api/admin/finance/settlements/${id}/client-payment`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateSettlementCaregiverPayment(
  id: string,
  status: PaymentStatus,
) {
  return request<Settlement>(
    `/api/admin/finance/settlements/${id}/caregiver-payment`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getAdminInvoices(filters: {
  status?: InvoiceStatus | "";
  clientProfileId?: string;
  facilityProfileId?: string;
  q?: string;
  page?: number;
  size?: number;
} = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return request<PagedResponse<ClientInvoice>>(
    `/api/admin/finance/invoices${qs ? `?${qs}` : ""}`,
  );
}

export function getUninvoicedSettlements(opts: {
  clientProfileId?: string;
  facilityProfileId?: string;
}) {
  const params = new URLSearchParams();
  if (opts.clientProfileId) params.set("clientProfileId", opts.clientProfileId);
  if (opts.facilityProfileId) {
    params.set("facilityProfileId", opts.facilityProfileId);
  }
  return request<Settlement[]>(
    `/api/admin/finance/invoices/uninvoiced?${params}`,
  );
}

export function createClientInvoice(payload: {
  clientProfileId?: string;
  facilityProfileId?: string;
  settlementIds: string[];
  dueDate?: string;
  notes?: string;
  sendNow: boolean;
}) {
  return request<ClientInvoice>("/api/admin/finance/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendClientInvoice(id: string) {
  return request<ClientInvoice>(`/api/admin/finance/invoices/${id}/send`, {
    method: "POST",
  });
}

export function markClientInvoicePaid(id: string) {
  return request<ClientInvoice>(`/api/admin/finance/invoices/${id}/mark-paid`, {
    method: "POST",
  });
}

export function voidClientInvoice(id: string) {
  return request<ClientInvoice>(`/api/admin/finance/invoices/${id}/void`, {
    method: "POST",
  });
}

export function generateOutstandingInvoices(sendNow = true) {
  const params = new URLSearchParams({ sendNow: String(sendNow) });
  return request<ClientInvoice[]>(
    `/api/admin/finance/invoices/generate-outstanding?${params}`,
    { method: "POST" },
  );
}

async function downloadPdfBlob(
  path: string,
  fallbackFilename: string,
  retry = true,
): Promise<void> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(
      `Could not reach API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (res.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) {
      return downloadPdfBlob(path, fallbackFilename, false);
    }
  }

  if (!res.ok) {
    let message = `PDF download failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] || fallbackFilename;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAdminInvoicePdf(id: string, invoiceNumber?: string) {
  return downloadPdfBlob(
    `/api/admin/finance/invoices/${id}/pdf`,
    `${invoiceNumber || "invoice"}.pdf`,
  );
}

export type AdminReportType =
  | "FINANCE"
  | "SHIFTS"
  | "CLAIMS"
  | "CLIENTS"
  | "USERS"
  | "AUDIT";

export type AdminReportFormat = "pdf" | "xlsx";

/** Download a branded admin report (PDF or Excel) with current filters applied. */
export async function downloadAdminReport(
  type: AdminReportType,
  format: AdminReportFormat,
  filters: Record<string, string | number | boolean | undefined | null> = {},
  retry = true,
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const path = `/api/admin/reports/${type}?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(
      `Could not reach API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  if (res.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) {
      return downloadAdminReport(type, format, filters, false);
    }
  }

  if (!res.ok) {
    let message = `Report failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename =
    match?.[1] ||
    `okaynow-${type.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getMyNotifications(page = 0, size = 30) {
  return request<PagedResponse<AppNotification>>(
    `/api/notifications/me?page=${page}&size=${size}`,
  );
}

export function getUnreadNotificationCount() {
  return request<{ count: number }>("/api/notifications/me/unread-count");
}

export function markNotificationRead(id: string) {
  return request<AppNotification>(`/api/notifications/${id}/read`, {
    method: "POST",
  });
}

export function markAllNotificationsRead() {
  return request<{ updated: number }>("/api/notifications/me/read-all", {
    method: "POST",
  });
}

export function getAdminReviews(
  status = "",
  opts: { page?: number; size?: number } = {},
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 10));
  return request<PagedResponse<CaregiverReview>>(
    `/api/admin/reviews?${params}`,
  );
}

export function moderateReview(id: string, status: "PUBLISHED" | "HIDDEN") {
  return request<CaregiverReview>(`/api/admin/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

