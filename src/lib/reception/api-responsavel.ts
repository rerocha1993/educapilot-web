import { clearSession, getToken } from "@/lib/auth/session";
import { mensagemDeErro } from "./api";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API do site do responsável (/api/Responsavel).
 *
 * Separada de portariaFetch porque o prefixo é outro: o papel "Responsavel" só enxerga estas rotas
 * (e as de login), então nada do cliente tipado da equipe serve aqui. Mesmo tratamento de 401.
 */
export async function responsavelFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Responsavel${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  return res;
}

export async function responsavelJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await responsavelFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
