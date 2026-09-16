import type { StoredSession } from "./types";

const STORAGE_KEY = "educapilot_token";
const SESSION_KEY = "educapilot_session";

// Marca de "tem sessão" que o servidor consegue ler. O token fica no storage, invisível para o
// proxy; sem esta marca, no domínio próprio a raiz não saberia se mostra o site ou a Chamada
// (ver src/proxy.ts). Não autentica nada: é só para escolher a página.
export const COOKIE_LOGADO = "educapilot_logado";

function marcarLogado(persistente: boolean) {
  const validade = persistente ? "; max-age=2592000" : "";
  document.cookie = `${COOKIE_LOGADO}=1; path=/; SameSite=Lax${validade}`;
}

// "Manter conectado" (L1): marcado guarda em localStorage (sobrevive fechar o
// navegador); desmarcado usa sessionStorage (some ao fechar a aba).
export function saveSession(session: StoredSession, rememberMe: boolean) {
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(STORAGE_KEY, session.token);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  marcarLogado(rememberMe);
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const persistente = window.localStorage.getItem(SESSION_KEY);
  const raw = persistente ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  // Sessões salvas antes da marca existir ganham a marca na primeira leitura.
  if (!document.cookie.includes(`${COOKIE_LOGADO}=`)) marcarLogado(persistente !== null);
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  document.cookie = `${COOKIE_LOGADO}=; path=/; max-age=0`;
}
