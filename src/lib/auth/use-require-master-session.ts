"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMasterSession, type MasterSession } from "./master-session";

/** Redireciona pra /master/login se não houver sessão master salva. */
export function useRequireMasterSession(): MasterSession | null {
  const router = useRouter();
  const [session, setSession] = useState<MasterSession | null | undefined>(undefined);

  useEffect(() => {
    const current = getMasterSession();
    if (!current) {
      router.replace("/master/login");
    } else {
      setSession(current);
    }
  }, [router]);

  return session ?? null;
}
