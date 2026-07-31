"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentLegalDocuments,
  publishLegalDocument,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

const DOC_TYPES = [
  { value: "TERMS_OF_SERVICE", label: "Terms of Service" },
  { value: "PRIVACY_POLICY", label: "Privacy Policy" },
  { value: "PLATFORM_POLICY", label: "Platform Policy" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

/** Admin CMS: publish a new version of Terms / Privacy / Platform Policy. */
export function LegalDocumentsPanel() {
  const qc = useQueryClient();
  const current = useQuery({
    queryKey: ["legal-current"],
    queryFn: getCurrentLegalDocuments,
  });
  const [documentType, setDocumentType] = useState<DocType>("TERMS_OF_SERVICE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const doc = (current.data ?? []).find((d) => d.documentType === documentType);
    if (doc) {
      setTitle(doc.title);
      setBody(doc.body);
    } else {
      setTitle(DOC_TYPES.find((t) => t.value === documentType)?.label ?? "");
      setBody("");
    }
  }, [current.data, documentType]);

  const publish = useMutation({
    mutationFn: () =>
      publishLegalDocument({
        documentType,
        title: title.trim(),
        body: body.trim(),
        publish: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["legal-current"] });
    },
  });

  const selected = (current.data ?? []).find((d) => d.documentType === documentType);

  return (
    <section className="space-y-4 rounded border border-line bg-panel p-4">
      <div>
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
          <FileText className="h-4 w-4 text-ink-muted" aria-hidden />
          Terms &amp; policies
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Publishing a new version requires all users to re-accept before using
          the app. Registration also requires accepting the current published
          set.
        </p>
      </div>

      <Field label="Document">
        <Select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocType)}
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
              {selected && selected.documentType === t.value
                ? ` (v${selected.version})`
                : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="Body">
        <Textarea
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-xs"
        />
      </Field>

      {publish.isError ? (
        <p className="text-sm text-danger">
          {(publish.error as Error)?.message || "Could not publish."}
        </p>
      ) : null}
      {publish.isSuccess ? (
        <p className="text-sm text-success">
          Published v{publish.data.version}. Users must re-accept.
        </p>
      ) : null}

      <Button
        type="button"
        disabled={
          publish.isPending || !title.trim() || !body.trim() || current.isLoading
        }
        onClick={() => {
          if (
            !window.confirm(
              "Publish a new version? All users will need to accept it again.",
            )
          ) {
            return;
          }
          publish.mutate();
        }}
      >
        {publish.isPending ? "Publishing…" : "Publish new version"}
      </Button>
    </section>
  );
}
