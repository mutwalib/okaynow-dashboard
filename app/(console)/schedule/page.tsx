"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { ButtonLink } from "@/components/ui/button";
import { getAdminClients } from "@/lib/api";

export default function AdminSchedulePage() {
  const clients = useQuery({
    queryKey: ["admin-clients-schedule"],
    queryFn: () => getAdminClients(""),
  });

  const clientOptions = (clients.data?.content ?? []).map((c) => {
    const name =
      c.clientType === "FACILITY" && c.facilityName
        ? c.facilityName
        : `${c.lastName}, ${c.firstName}`;
    const kind = c.clientType === "FACILITY" ? "Facility" : "Family";
    return {
      value: `${c.clientType}:${c.id}`,
      label: `[${kind}] ${name}`,
    };
  });

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <CalendarDays className="h-5 w-5 text-ink-muted" aria-hidden />
            Schedule
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Daily coverage calendar with rosters. Filter by family or facility
            client.
          </p>
        </div>
        <ButtonLink href="/shifts/new?routine=1" size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create routine
        </ButtonLink>
      </div>
      <ScheduleCalendar clients={clientOptions} />
    </div>
  );
}
