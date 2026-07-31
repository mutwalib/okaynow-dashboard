"use client";

import { useQuery } from "@tanstack/react-query";
import { ExportReportButtons } from "@/components/export-report-buttons";
import { ListPagination } from "@/components/ui/list-pagination";
import { getAuditLogs } from "@/lib/api";
import { useListPagination } from "@/lib/pagination";
import { ScrollText } from "lucide-react";

function formatAction(action: string) {
  return action.toLowerCase().replaceAll("_", " ");
}

export default function AuditPage() {
  const { page, setPage, pageSize, setPageSize } = useListPagination();
  const logs = useQuery({
    queryKey: ["audit-logs", page, pageSize],
    queryFn: () => getAuditLogs(page, pageSize),
  });

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <ScrollText className="h-5 w-5 text-ink-muted" aria-hidden />
            Audit log
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Client permission changes, client shift activity, and platform payment changes.
          </p>
        </div>
        <ExportReportButtons type="AUDIT" />
      </div>

      {logs.isLoading ? <p className="text-sm text-ink-muted">Loading logs…</p> : null}
      {logs.isError ? <p className="text-sm text-danger">Could not load audit logs.</p> : null}

      <div className="overflow-x-auto rounded border border-line bg-panel">
        <table className="table-dense w-full min-w-[760px]">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.content.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-ink-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="font-medium capitalize">{formatAction(log.action)}</td>
                <td>{log.actorEmail}</td>
                <td className="font-mono text-xs">
                  {log.entityType} · {log.entityId}
                </td>
                <td className="text-ink-muted">{log.details || "—"}</td>
              </tr>
            ))}
            {!logs.isLoading && logs.data?.content.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-muted">
                  No audited activity yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {logs.data ? (
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalElements={logs.data.totalElements}
          totalPages={logs.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={logs.isFetching}
        />
      ) : null}
    </div>
  );
}
