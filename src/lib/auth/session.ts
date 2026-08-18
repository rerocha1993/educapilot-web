import type { StoredSession } from "./types";

const STORAGE_KEY = "educapilot_token";
const SESSION_KEY = "educapilot_session";

// "Manter conectado" (L1): marcado guarda em localStorage (sobrevive fechar o
// navegador); desmarcado usa sessionStorage (some ao fechar a aba).
export function saveSession(session: StoredSession, rememberMe: boolean) {
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(STORAGE_KEY, session.token);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
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
}
