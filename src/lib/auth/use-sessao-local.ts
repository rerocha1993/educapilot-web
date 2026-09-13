"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSession, getToken } from "./session";
import type { StoredSession } from "./types";

const semAssinatura = () => () => {};

/**
 * Sessão salva no navegador, lida sem setState em efeito.
 *
 * Devolve undefined enquanto não dá para saber (prerender e hidratação), null sem sessão. O token
 * serve de snapshot porque é string estável; getSession() cria objeto novo a cada leitura.
 */
export function useSessaoLocal(): StoredSession | null | undefined {
  const token = useSyncExternalStore(semAssinatura, getToken, () => undefined);
  return useMemo(() => (token === undefined ? undefined : token ? getSession() : null), [token]);
}

/** Query string atual, pelo mesmo caminho: não exige Suspense e não gera diferença na hidratação. */
export function useQueryStringLocal(): URLSearchParams {
  const busca = useSyncExternalStore(semAssinatura, () => window.location.search, () => "");
  return useMemo(() => new URLSearchParams(busca), [busca]);
}
