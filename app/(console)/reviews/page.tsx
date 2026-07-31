"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminReviews, moderateReview } from "@/lib/api";
import type { ReviewStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/lib/toast-context";
import { useListPagination } from "@/lib/pagination";
import { Check, EyeOff, Star, MessageSquareQuote } from "lucide-react";

export default function ReviewsPage() {
  const [status, setStatus] = useState<"" | ReviewStatus>("PENDING");
  const { page, setPage, pageSize, setPageSize } = useListPagination(status);
  const qc = useQueryClient();
  const { showToast } = useToast();

  const reviews = useQuery({
    queryKey: ["admin-reviews", status, page, pageSize],
    queryFn: () => getAdminReviews(status, { page, size: pageSize }),
  });

  const moderate = useMutation({
    mutationFn: ({
      id,
      next,
    }: {
      id: string;
      next: "PUBLISHED" | "HIDDEN";
    }) => moderateReview(id, next),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      showToast(
        vars.next === "PUBLISHED"
          ? "Review published on caregiver profile"
          : "Review hidden",
        "success",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <MessageSquareQuote className="h-5 w-5 text-ink-muted" aria-hidden />
            Caregiver reviews
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Family and facility clients submit ratings after completed shifts.
            Publish a review to show it on the caregiver profile.
          </p>
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ReviewStatus)}
        >
          <option value="PENDING">Pending</option>
          <option value="PUBLISHED">Published</option>
          <option value="HIDDEN">Hidden</option>
          <option value="">All</option>
        </Select>
      </div>

      {reviews.isLoading ? (
        <p className="text-sm text-ink-muted">Loading reviews…</p>
      ) : null}
      {reviews.isError ? (
        <p className="text-sm text-danger">Could not load reviews.</p>
      ) : null}

      <div className="space-y-3">
        {(reviews.data?.content ?? []).map((review) => (
          <article
            key={review.id}
            className="rounded border border-line bg-panel p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {review.caregiverFirstName} {review.caregiverLastName}
                </p>
                <p className="text-xs text-ink-muted">
                  From {review.reviewerLabel}
                  {review.facilityProfileId ? " · Facility" : " · Family"}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => {
                    const filled = i < Number(review.rating);
                    return (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          filled ? "text-accent" : "text-ink-muted"
                        }`}
                        fill={filled ? "currentColor" : "none"}
                        aria-hidden
                      />
                    );
                  })}
                  <span className="ml-2 font-mono text-[10px] uppercase text-ink-muted">
                    {review.status}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-2 text-sm text-ink-muted">{review.comment}</p>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">No written comment</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {review.status !== "PUBLISHED" ? (
                  <Button
                    size="sm"
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ id: review.id, next: "PUBLISHED" })
                    }
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Publish
                  </Button>
                ) : null}
                {review.status !== "HIDDEN" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ id: review.id, next: "HIDDEN" })
                    }
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                    Hide
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!reviews.isLoading && (reviews.data?.content.length ?? 0) === 0 ? (
        <p className="rounded border border-dashed border-line p-8 text-center text-sm text-ink-muted">
          No reviews in this filter.
        </p>
      ) : null}
      {reviews.data ? (
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalElements={reviews.data.totalElements}
          totalPages={reviews.data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={reviews.isFetching}
        />
      ) : null}
    </div>
  );
}
