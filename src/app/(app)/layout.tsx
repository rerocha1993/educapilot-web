"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireSession } from "@/lib/auth/use-session";
import { AppShell } from "@/components/shell/app-shell";
import { ModuleGate } from "@/components/shell/module-gate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const session = useRequireSession();
  const ehResponsavel = session?.role === "Responsavel";

  // Responsável tem o site dele. O shell da equipe chamaria APIs que esse papel não pode usar (403)
  // e mostraria um menu que não serve para ele.
  useEffect(() => {
    if (ehResponsavel) router.replace("/responsavel");
  }, [ehResponsavel, router]);

  if (!session || ehResponsavel) {
    // Ainda checando localStorage/sessionStorage, ou redirecionando.
    return null;
  }

  return (
    <AppShell session={session}>
      <ModuleGate>{children}</ModuleGate>
    </AppShell>
  );
}
