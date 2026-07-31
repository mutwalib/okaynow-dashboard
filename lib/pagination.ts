"use client";

import { useEffect, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

/** Resets to page 0 when `filterKey` or page size changes. */
export function useListPagination(filterKey: string | number = "") {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [filterKey]);

  function setPageSize(next: PageSize) {
    setPageSizeState(next);
    setPage(0);
  }

  return { page, setPage, pageSize, setPageSize };
}
