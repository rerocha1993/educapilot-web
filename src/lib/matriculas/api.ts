import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API de Matrículas (`/api/matriculas`).
 *
 * fetch cru, como na Portaria: os tipos gerados só existem depois que o Swagger do módulo estiver
 * publicado. As respostas são tipadas à mão em tipos.ts.
 *
 * Repete o que o cliente tipado faz de importante: manda o token e encerra a sessão num 401.
 */
export async function matriculasFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/matriculas${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  return res;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function matriculasJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await matriculasFetch(caminho, init);
  if (!res.ok) {
    const { mensagem, campo } = await lerErro(res, falha);
    throw new ErroDaApi(mensagem, campo);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Error que carrega o `campo` que o backend aponta (relato da visita), quando ele aponta. */
export class ErroDaApi extends Error {
  readonly campo?: string;
  constructor(mensagem: string, campo?: string) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.campo = campo;
  }
}

async function lerErro(res: Response, falha: string): Promise<{ mensagem: string; campo?: string }> {
  if (res.status === 401) return { mensagem: "Sessão expirada. Faça login novamente." };
  // O ModuleAccessMiddleware responde 403 com texto puro, sem JSON.
  if (res.status === 403) return { mensagem: "A escola não tem o módulo Matrículas, ou você não tem acesso a esta área." };

  try {
    const corpo = (await res.json()) as { message?: string; campo?: string; errors?: Record<string, string[]> };
    if (corpo.message) return { mensagem: corpo.message, campo: corpo.campo };
    const primeiro = corpo.errors && Object.values(corpo.errors).flat().find((m) => !!m);
    if (primeiro) return { mensagem: primeiro };
  } catch {
    // corpo vazio ou não-JSON: fica a mensagem padrão
  }
  return { mensagem: falha };
}
