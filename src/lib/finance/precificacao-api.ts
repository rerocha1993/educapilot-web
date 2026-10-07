import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API de precificação — /api/Precificacao.
 *
 * fetch cru, no mesmo padrão dos recibos (lib/finance/recibos-api.ts): os tipos gerados só existem
 * depois que o Swagger do módulo for publicado. Manda o token e encerra a sessão num 401.
 */
export async function precificacaoFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Precificacao${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  return res;
}

interface CorpoDeErro {
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/** A frase do servidor (`message`, `detail` ou erro de validação); senão, a de `falha`. */
async function mensagemDeErro(res: Response, falha: string): Promise<string> {
  let corpo: CorpoDeErro | null = null;
  try {
    corpo = (await res.json()) as CorpoDeErro;
  } catch {
    // corpo vazio ou não-JSON: fica a mensagem padrão
  }

  const validacao = corpo?.errors && Object.values(corpo.errors).flat().find((m) => !!m);
  const dito = corpo?.message || corpo?.detail || validacao;
  if (dito) return dito;

  if (res.status === 401) return "Sessão expirada. Faça login novamente.";
  if (res.status === 403) return "Você não tem permissão para usar a precificação.";
  return falha;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function precificacaoJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await precificacaoFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}
