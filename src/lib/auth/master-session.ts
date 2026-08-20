// Sessão do painel Master (A1-A4/A8) — mecanismo de auth genuinamente separado do
// login de tenant (chave de assinatura JWT diferente, sem claim de TenantId, ver
// UserService.GenerateToken(MasterUser) no backend). Guardado numa chave própria pra
// não colidir com a sessão de tenant.
const MASTER_TOKEN_KEY = "educapilot_master_token";
const MASTER_SESSION_KEY = "educapilot_master_session";

export interface MasterSession {
  token: string;
  role: string;
  userId: string;
  name: string;
}

export function saveMasterSession(session: MasterSession) {
  window.localStorage.setItem(MASTER_TOKEN_KEY, session.token);
  window.localStorage.setItem(MASTER_SESSION_KEY, JSON.stringify(session));
}

export function getMasterSession(): MasterSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MASTER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MasterSession;
  } catch {
    return null;
  }
}

export function getMasterToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MASTER_TOKEN_KEY);
}

export function clearMasterSession() {
  window.localStorage.removeItem(MASTER_TOKEN_KEY);
  window.localStorage.removeItem(MASTER_SESSION_KEY);
}
