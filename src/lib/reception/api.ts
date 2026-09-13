import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API da Portaria.
 *
 * fetch cru, e não o cliente tipado: foto é multipart e binária, que o cliente tipado não cobre, e
 * os tipos gerados só existem depois que o Swagger do módulo estiver publicado. As respostas são
 * tipadas à mão em use-portaria.ts, como nos outros hooks do projeto.
 *
 * Repete o que o cliente tipado faz de importante: manda o token e encerra a sessão num 401.
 */
export async function portariaFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Portaria${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  return res;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function portariaJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await portariaFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function mensagemDeErro(res: Response, falha: string): Promise<string> {
  if (res.status === 401) return "Sessão expirada. Faça login novamente.";

  try {
    const corpo = (await res.json()) as { message?: string; errors?: Record<string, string[]> };
    if (corpo.message) return corpo.message;
    const primeiro = corpo.errors && Object.values(corpo.errors).flat().find((m) => !!m);
    if (primeiro) return primeiro;
  } catch {
    // corpo vazio ou não-JSON: fica a mensagem padrão
  }
  return falha;
}
