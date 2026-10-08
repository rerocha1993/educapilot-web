import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API de projetos (festa) — /api/Projetos.
 *
 * fetch cru, no mesmo padrão da precificação e dos recibos: há upload multipart (comprovante) e
 * download autenticado (o arquivo do comprovante), que o cliente tipado não cobre, e os tipos
 * gerados só existem depois que o Swagger do módulo for publicado. Manda o token e encerra a
 * sessão num 401.
 */
export async function projetosFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Corpo de texto é JSON; FormData fica sem Content-Type para o navegador pôr o boundary.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Projetos${caminho}`, { ...init, headers });

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
  if (res.status === 403) return "Você não tem permissão para usar os projetos.";
  return falha;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function projetosJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await projetosFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** Envio de um arquivo (campo `arquivo`) em multipart. */
export async function projetosEnviarArquivo<T>(caminho: string, arquivo: File, falha: string): Promise<T> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return projetosJson<T>(caminho, { method: "POST", body: form }, falha);
}

/**
 * Abre o arquivo de um comprovante numa aba nova.
 *
 * Não pode ser um link: o endpoint exige o Bearer. Busca com fetch e abre o Blob. O navegador
 * bloqueia aba aberta depois de uma espera, então quem chama a partir de um clique abre a aba em
 * branco na hora (`janela`) e a passa aqui; sem aba (ou bloqueada), o arquivo é baixado.
 */
export async function abrirArquivoDoComprovante(
  comprovanteId: string,
  nomeDoArquivo: string,
  janela?: Window | null
): Promise<void> {
  let res: Response;
  try {
    res = await projetosFetch(`/comprovantes/${comprovanteId}/arquivo`);
  } catch (err) {
    janela?.close();
    throw err;
  }
  if (!res.ok) {
    janela?.close();
    throw new Error(await mensagemDeErro(res, "Não foi possível abrir o arquivo do comprovante."));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  if (janela && !janela.closed) {
    janela.location.href = url;
  } else if (!window.open(url, "_blank")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  // Revoga depois: revogar na hora derrubaria o arquivo que a aba ainda está carregando.
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
}
