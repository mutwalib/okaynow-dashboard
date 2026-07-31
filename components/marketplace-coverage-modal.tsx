"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type MarketplaceCoverageDraft = {
  shiftId: string;
  maxSlots: number;
  defaultSlots: number;
  mode: "remaining" | "replace";
  required: number;
  filled: number;
  remaining: number;
  marketOpen: number;
  timeLabel?: string;
};

export function MarketplaceCoverageModal({
  draft,
  busy = false,
  onClose,
  onConfirm,
}: {
  draft: MarketplaceCoverageDraft | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (slots: number) => void;
}) {
  const [slots, setSlots] = useState(1);

  useEffect(() => {
    if (!draft) return;
    setSlots(
      Math.min(draft.maxSlots, Math.max(1, draft.defaultSlots || draft.maxSlots)),
    );
  }, [draft]);

  if (!draft) return null;

  const open = draft.maxSlots >= 1;
  const title =
    draft.mode === "replace"
      ? "Call out — open marketplace"
      : "Open marketplace coverage";

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onConfirm(slots)}
          >
            <Megaphone className="h-4 w-4" aria-hidden />
            {busy
              ? "Opening…"
              : slots === 1
                ? "Open 1 slot"
                : `Open ${slots} slots`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {draft.timeLabel ? (
          <p className="font-medium tabular-nums">{draft.timeLabel}</p>
        ) : null}
        <p className="text-ink-muted">
          {draft.mode === "remaining" ? (
            <>
              {draft.remaining} of {draft.required} caregiver slot
              {draft.required === 1 ? "" : "s"} still unfilled
              {draft.marketOpen > 0
                ? ` (${draft.marketOpen} already on the marketplace)`
                : ""}
              . Choose how many remaining seats caregivers can claim for this
              date. Unopened seats stay private.
            </>
          ) : (
            <>
              All {draft.filled} slot{draft.filled === 1 ? "" : "s"} are filled.
              Choose how many caregivers to release so the marketplace can fill
              those seats for this date only.
            </>
          )}
        </p>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Marketplace slots
          </p>
          {draft.maxSlots === 1 ? (
            <p className="mt-2 text-sm">1 slot will open</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: draft.maxSlots }, (_, i) => i + 1).map(
                (n) => {
                  const selected = slots === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={busy}
                      onClick={() => setSlots(n)}
                      className={`min-w-[2.75rem] rounded border px-3 py-2 text-sm font-medium tabular-nums transition ${
                        selected
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-canvas hover:border-accent"
                      }`}
                    >
                      {n}
                    </button>
                  );
                },
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            {slots} of {draft.maxSlots} available to open
            {draft.mode === "replace"
              ? " — that many assignments will be released"
              : ""}
          </p>
        </div>
      </div>
    </Modal>
  );
}
