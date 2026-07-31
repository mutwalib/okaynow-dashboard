/** Domain types aligned with backend API + expected booking/admin endpoints. */

export type UserRole = "CAREGIVER" | "CLIENT" | "FACILITY" | "ADMIN";

export type Qualification = "CNA" | "HHA" | "PCA" | "LPN" | "RN";

export type ShiftStatus =
  | "DRAFT"
  | "HELD"
  | "OPEN"
  | "CLAIMED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ShiftScheduleType = "ONE_OFF" | "DAILY_ROUTINE";

export const SHIFT_SCHEDULE_TYPE_LABEL: Record<ShiftScheduleType, string> = {
  ONE_OFF: "One-off",
  DAILY_ROUTINE: "Daily routine",
};

export type ClaimStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export type MedicaidEligibility =
  | "YES"
  | "NO"
  | "UNSURE"
  | "PREFER_NOT_TO_SAY";

export type CareRecipientRelationship =
  | "SPOUSE_OR_PARTNER"
  | "ADULT_CHILD"
  | "PARENT"
  | "SIBLING"
  | "OTHER_FAMILY"
  | "LEGAL_GUARDIAN_OR_POA"
  | "FRIEND_OR_NEIGHBOR"
  | "PROFESSIONAL_OR_CASE_MANAGER"
  | "OTHER";

export const MEDICAID_ELIGIBILITY_LABEL: Record<MedicaidEligibility, string> = {
  YES: "Yes",
  NO: "No",
  UNSURE: "Unsure",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const CARE_RECIPIENT_RELATIONSHIP_LABEL: Record<
  CareRecipientRelationship,
  string
> = {
  SPOUSE_OR_PARTNER: "Spouse / partner",
  ADULT_CHILD: "Adult child",
  PARENT: "Parent",
  SIBLING: "Sibling",
  OTHER_FAMILY: "Other family member",
  LEGAL_GUARDIAN_OR_POA: "Legal guardian / power of attorney",
  FRIEND_OR_NEIGHBOR: "Friend / neighbor",
  PROFESSIONAL_OR_CASE_MANAGER: "Professional caregiver / case manager",
  OTHER: "Other",
};

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface UserResponse {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type ClientType = "FAMILY" | "FACILITY";

export interface ClientProfile {
  id: string;
  clientType: ClientType;
  facilityName: string | null;
  userId: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  firstName: string;
  lastName: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  careNeeds: string | null;
  registeringForSelf: boolean;
  medicaidEligible: MedicaidEligibility | null;
  relationshipToCareRecipient: CareRecipientRelationship | null;
  canViewShifts: boolean;
  canCreateShifts: boolean;
  canUpdateShifts: boolean;
  canDeleteShifts: boolean;
}

export interface Shift {
  id: string;
  clientProfileId: string | null;
  facilityProfileId?: string | null;
  requiredQualification: Qualification;
  date: string;
  startTime: string;
  endTime: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  payRate: number;
  billRate: number;
  status: ShiftStatus;
  scheduleType: ShiftScheduleType;
  seriesId: string | null;
  notes: string | null;
  platformPaid: boolean;
  marketplacePosted?: boolean;
  /** Open marketplace claim seats (partial remaining headcount). */
  marketplaceSlots?: number;
  /** Caregivers needed (default 1). */
  requiredHeadcount?: number;
  /** Active PENDING + CONFIRMED claims filling slots. */
  filledSlots?: number;
  createdBy: string;
  createdAt: string;
}

export interface ScheduleRosterSlot {
  claimId: string;
  caregiverProfileId: string;
  firstName: string;
  lastName: string;
  status: ClaimStatus;
  source: "MARKETPLACE" | "ASSIGNED";
}

export interface ScheduleShiftCard {
  id: string;
  clientProfileId: string | null;
  clientLabel: string | null;
  requiredQualification: Qualification;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  scheduleType: ShiftScheduleType;
  seriesId: string | null;
  requiredHeadcount: number;
  filledSlots: number;
  openSlots: number;
  marketplacePosted: boolean;
  marketplaceSlots: number;
  needsCoverage: boolean;
  notes: string | null;
  roster: ScheduleRosterSlot[];
}

export interface ScheduleDay {
  date: string;
  shifts: ScheduleShiftCard[];
}

/** Exact ShiftClaimResponse returned by the booking API. */
export interface ShiftClaim {
  id: string;
  caregiverProfileId: string;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverEmail: string;
  status: ClaimStatus;
  source?: "MARKETPLACE" | "ASSIGNED";
  claimedAt: string;
  releasedAt: string | null;
  cancelReason: string | null;
  shift: Shift;
}

export type AssignmentType = "PRIMARY" | "ROTATIONAL";

export interface CaregiverOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  qualifications: Qualification[];
  serviceRadiusMiles: number | null;
  homeLat: number | null;
  homeLng: number | null;
}

export interface ClientCaregiverAssignment {
  id: string;
  clientProfileId: string;
  caregiverProfileId: string;
  caregiverFirstName: string;
  caregiverLastName: string;
  caregiverEmail: string;
  qualifications: Qualification[];
  serviceRadiusMiles: number | null;
  assignmentType: AssignmentType;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const QUALIFICATIONS: Qualification[] = ["CNA", "HHA", "PCA", "LPN", "RN"];

export const SHIFT_STATUSES: ShiftStatus[] = [
  "DRAFT",
  "HELD",
  "OPEN",
  "CLAIMED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export const CLAIM_STATUSES: ClaimStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

export type AuditAction =
  | "CLIENT_PERMISSIONS_UPDATED"
  | "CLIENT_SHIFT_CREATED"
  | "CLIENT_SHIFT_UPDATED"
  | "CLIENT_SHIFT_DELETED"
  | "PLATFORM_PAYMENT_CHANGED"
  | "SHIFT_TIME_EXTENDED"
  | "SHIFT_PUBLISHED"
  | "SHIFT_UNPUBLISHED"
  | "SHIFT_REOPENED"
  | "SHIFT_START_REVERTED"
  | "SHIFT_COMPLETE_REVERTED"
  | "CAREGIVER_ASSIGNED_TO_SHIFT"
  | "CLIENT_CAREGIVER_ASSIGNED"
  | "CLIENT_CAREGIVER_UNASSIGNED"
  | "AGENCY_SETTINGS_UPDATED"
  | "CLIENT_PAYMENT_UPDATED"
  | "CAREGIVER_PAYMENT_UPDATED"
  | "SETTLEMENT_PAYMENT_SYNCED";

export type PaymentStatus = "PENDING" | "PAID";
export type PayPeriodType = "WEEKLY" | "BIWEEKLY";

export interface AgencySettings {
  agencyTakePercent: number;
  defaultPayRate: number;
  payPeriodType: PayPeriodType;
  periodStartDay:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  autoInvoiceOnComplete: boolean;
  autoInvoiceSendImmediately: boolean;
  clientCaregiverRejectionFee: number;
  platformConversionFee: number;
}

export interface FinanceSummary {
  periodStart: string;
  periodEnd: string;
  completedShifts: number;
  totalHours: number;
  clientBilled: number;
  clientCollected: number;
  clientPending: number;
  caregiverOwed: number;
  caregiverPaid: number;
  caregiverPending: number;
  agencyMarginAccrued: number;
  agencyMarginCollected: number;
}

export interface Settlement {
  id: string;
  shiftId: string;
  claimId: string | null;
  caregiverProfileId: string;
  caregiverFirstName: string | null;
  caregiverLastName: string | null;
  clientProfileId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  facilityProfileId: string | null;
  facilityName: string | null;
  shiftDate: string;
  durationMinutes: number;
  hours: number;
  billRate: number;
  payRate: number;
  clientAmount: number;
  caregiverAmount: number;
  agencyAmount: number;
  clientPaymentStatus: PaymentStatus;
  caregiverPaymentStatus: PaymentStatus;
  payPeriodStart: string;
  payPeriodEnd: string;
  clientPaidAt: string | null;
  caregiverPaidAt: string | null;
  clientInvoiceId?: string | null;
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "VOID";

export interface ClientInvoiceLine {
  id: string;
  settlementId: string | null;
  shiftId: string;
  shiftDate: string;
  description: string;
  hours: number;
  billRate: number;
  amount: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  clientProfileId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  facilityProfileId: string | null;
  facilityName: string | null;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  totalAmount: number;
  notes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  lines: ClientInvoiceLine[];
}

export type ClockMethod = "GPS" | "MANUAL";

export type NotificationType =
  | "SHIFT_DRAFT_CREATED"
  | "SHIFT_POSTED"
  | "SHIFT_CLAIMED"
  | "SHIFT_ASSIGNED"
  | "SHIFT_CONFIRMED"
  | "SHIFT_RELEASED"
  | "SHIFT_HELD"
  | "SHIFT_CANCELLED"
  | "SHIFT_STARTED"
  | "SHIFT_COMPLETED"
  | "SHIFT_EXTENDED"
  | "SHIFT_REPLACEMENT_REQUESTED"
  | "CAREGIVER_REJECTED_BY_CLIENT"
  | "VISIT_CLOCK_IN"
  | "VISIT_CLOCK_OUT"
  | "VISIT_ARRIVAL_CONFIRMED"
  | "INVOICE_SENT"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ShiftBoardUpdate {
  action: string;
  shiftId: string;
  status: ShiftStatus;
  clientProfileId: string | null;
  city?: string | null;
  date?: string | null;
  requiredQualification?: Qualification | null;
  payRate?: number | null;
  marketplaceSlots?: number | null;
  at: string;
}

export interface Visit {
  id: string;
  shiftId: string;
  claimId: string;
  caregiverProfileId: string;
  caregiverFirstName: string | null;
  caregiverLastName: string | null;
  clockInAt: string;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutAt: string | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  method: ClockMethod;
  clientArrivalConfirmed: boolean;
  clientArrivalConfirmedAt: string | null;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  clientProfileId: string | null;
  details: string | null;
  createdAt: string;
}

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

export interface CaregiverReview {
  id: string;
  shiftId: string;
  shiftClaimId: string;
  caregiverProfileId: string;
  caregiverFirstName: string | null;
  caregiverLastName: string | null;
  reviewerUserId: string;
  reviewerLabel: string;
  clientProfileId: string | null;
  facilityProfileId: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt: string | null;
}
