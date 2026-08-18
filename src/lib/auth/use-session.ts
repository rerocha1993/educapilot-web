"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "./session";
import type { StoredSession } from "./types";

/** Redireciona pra /login se não houver sessão salva. Usar no layout autenticado. */
export function useRequireSession(): StoredSession | null {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
    } else {
      setSession(current);
    }
  }, [router]);

  return session ?? null;
}
