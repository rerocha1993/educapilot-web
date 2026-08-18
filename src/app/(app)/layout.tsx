"use client";

import { useRequireSession } from "@/lib/auth/use-session";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const session = useRequireSession();

  if (!session) {
    // Ainda checando localStorage/sessionStorage, ou redirecionando pro login.
    return null;
  }

  return <AppShell session={session}>{children}</AppShell>;
}
