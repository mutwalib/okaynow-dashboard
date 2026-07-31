"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOwner,
  getAdminUsers,
  updateUserStatus,
} from "@/lib/api";
import type { UserRole, UserStatus } from "@/lib/types";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import { UserCog, UserPlus, X } from "lucide-react";

const ROLES: UserRole[] = ["CAREGIVER", "CLIENT", "FACILITY", "ADMIN"];
const STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_VERIFICATION",
  "SUSPENDED",
  "DEACTIVATED",
];

export default function UsersPage() {
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [search, setSearch] = useState("");
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
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

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: UserStatus }) =>
      updateUserStatus(id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      showToast("User status updated", "success");
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
            Platform-wide accounts, access state, and owner management.
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
                <tr key={user.id}>
                  <td>
                    <div className="font-medium">{user.email}</div>
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
  );
}
