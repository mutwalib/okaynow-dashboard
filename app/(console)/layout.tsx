"use client";

import { OwnerGuard } from "@/components/owner-guard";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerGuard>{children}</OwnerGuard>;
}
