"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveUserReview,
  cancelOnboardingRequest,
  createOwner,
  createUserOnboardingRequest,
  getAdminUsers,
  getUserOnboardingRequests,
  mediaUrl,
  updateUserStatus,
  type OnboardingFieldType,
} from "@/lib/api";
import type { UserRole, UserStatus } from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import { CheckCircle2, ClipboardList, UserCog, UserPlus, X } from "lucide-react";

const ROLES: UserRole[] = ["CAREGIVER", "CLIENT", "FACILITY", "ADMIN"];
const STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_REVIEW",
  "PENDING_VERIFICATION",
  "SUSPENDED",
  "DEACTIVATED",
];

export default function UsersPage() {
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reqTitle, setReqTitle] = useState("");
  const [reqInstructions, setReqInstructions] = useState("");
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

  const selectedUser =
    users.data?.content.find((u) => u.id === selectedUserId) ?? null;

  const onboarding = useQuery({
    queryKey: ["owner-onboarding", selectedUserId],
    queryFn: () => getUserOnboardingRequests(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: UserStatus }) =>
      updateUserStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      showToast("User status updated", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveUserReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      queryClient.invalidateQueries({ queryKey: ["owner-onboarding"] });
      showToast("Account approved", "success");
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
      setReqTitle("");
      setReqInstructions("");
      queryClient.invalidateQueries({ queryKey: ["owner-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      showToast("Information requested", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const cancelReq = useMutation({
    mutationFn: (id: string) => cancelOnboardingRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-onboarding"] });
      showToast("Request cancelled", "success");
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

  function submitOwner(event: FormEvent) {
    event.preventDefault();
    addOwner.mutate();
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <UserCog className="h-5 w-5 text-ink-muted" aria-hidden />
            Users
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Review pending caregivers/clients, request documents, and manage access.
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

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
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
                    <th>Email</th>
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
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          {user.email}
                        </button>
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
          {!selectedUser ? (
            <p className="text-sm text-ink-muted">
              Select a caregiver or client to request documents or approve review.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                  <ClipboardList className="h-4 w-4 text-ink-muted" aria-hidden />
                  Review workspace
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{selectedUser.email}</p>
                <p className="font-mono text-xs text-ink-muted">
                  {selectedUser.role} · {selectedUser.status}
                </p>
              </div>

              {(selectedUser.role === "CAREGIVER" ||
                selectedUser.role === "CLIENT") &&
              selectedUser.status === "PENDING_REVIEW" ? (
                <Button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(selectedUser.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {approve.isPending ? "Approving…" : "Approve account"}
                </Button>
              ) : null}

              {(selectedUser.role === "CAREGIVER" ||
                selectedUser.role === "CLIENT") && (
                <form
                  className="space-y-2 rounded border border-line bg-surface p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createRequest.mutate();
                  }}
                >
                  <p className="text-sm font-medium">Request information</p>
                  <Input
                    required
                    placeholder="Title (e.g. CORI clearance PDF)"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                  />
                  <Textarea
                    rows={3}
                    placeholder="Instructions for the user"
                    value={reqInstructions}
                    onChange={(e) => setReqInstructions(e.target.value)}
                  />
                  <Select
                    value={reqType}
                    onChange={(e) =>
                      setReqType(e.target.value as OnboardingFieldType)
                    }
                  >
                    <option value="FILE">File upload</option>
                    <option value="TEXT">Text response</option>
                    {selectedUser.role === "CAREGIVER" ? (
                      <option value="PROFILE_PHOTO">Profile photo</option>
                    ) : null}
                  </Select>
                  <Button type="submit" disabled={createRequest.isPending}>
                    {createRequest.isPending ? "Sending…" : "Send request"}
                  </Button>
                </form>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Requests</p>
                {onboarding.isLoading ? (
                  <p className="text-xs text-ink-muted">Loading…</p>
                ) : null}
                {(onboarding.data ?? []).length === 0 ? (
                  <p className="text-xs text-ink-muted">No onboarding requests yet.</p>
                ) : (
                  (onboarding.data ?? []).map((req) => (
                    <div
                      key={req.id}
                      className="rounded border border-line bg-surface p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{req.title}</p>
                          <p className="text-xs text-ink-muted">
                            {req.fieldType} · {req.status}
                          </p>
                        </div>
                        {(req.status === "OPEN" || req.status === "SUBMITTED") && (
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
                      {req.responseText ? (
                        <p className="mt-2 whitespace-pre-wrap text-ink-muted">
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
                          View uploaded file
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
