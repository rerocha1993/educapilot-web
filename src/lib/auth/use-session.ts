"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { assinarSessao, getSession, lerSessaoBruta } from "./session";
import type { StoredSession } from "./types";

/**
 * A sessão salva, sem redirecionar.
 *
 * Para tela que já roda dentro do layout autenticado e só quer saber QUEM está olhando — o perfil,
 * por exemplo, que decide se um relatório com valor aparece.
 *
 * Lê por useSyncExternalStore em vez de um efeito: o storage é estado de fora do React, e é assim
 * que o React quer que se leia — sem o render extra que um setState dentro de efeito causa. No
 * servidor não existe storage, então o primeiro render é sempre "não sei quem é", e quem usa deve
 * tratar isso como "não é gestão".
 */
export function useSession(): StoredSession | null {
  const bruto = useSyncExternalStore(assinarSessao, lerSessaoBruta, () => null);

  return useMemo(() => {
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as StoredSession;
    } catch {
      return null;
    }
  }, [bruto]);
}

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
