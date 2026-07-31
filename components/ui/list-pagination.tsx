"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/lib/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ListPagination({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  disabled?: boolean;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <p className="text-xs text-ink-muted">
        {totalElements === 0
          ? "No results"
          : `Showing ${from}–${to} of ${totalElements}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="whitespace-nowrap">Rows</span>
          <Select
            className="w-[4.5rem] py-1 text-xs"
            value={pageSize}
            disabled={disabled}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as PageSize)
            }
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Prev
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-ink-muted">
          {page + 1} / {safeTotalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || page + 1 >= safeTotalPages || totalElements === 0}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
