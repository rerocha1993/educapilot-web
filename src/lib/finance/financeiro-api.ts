import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/** Prefixo da API do Financeiro para comprovantes e WhatsApp: /api/financeiro. */
export const API_FINANCEIRO = "/api/financeiro";

/**
 * Chamada à API do Financeiro (comprovantes e WhatsApp, 2026-10).
 *
 * fetch cru, no mesmo padrão dos recibos e dos projetos: há upload multipart e download
 * autenticado de arquivo, que o cliente tipado não cobre, e os tipos gerados só existem depois
 * que o Swagger do módulo for publicado. `caminho` é o caminho completo a partir da raiz da API
 * (`/api/financeiro/comprovantes`, ou `/api/Expenses/{id}/comprovante`). Manda o token e encerra
 * a sessão num 401.
 */
export async function financeiroFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Corpo de texto é JSON; FormData fica sem Content-Type para o navegador pôr o boundary.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}${caminho}`, { ...init, headers });

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
  if (res.status === 403) return "Você não tem permissão para fazer isso no Financeiro.";
  return falha;
}

/** Erro da API com o código HTTP, para a tela tratar um caso (409, por exemplo) com frase própria. */
export class ErroDeApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroDeApi";
    this.status = status;
  }
}

/** Chamada que devolve JSON. Falha vira ErroDeApi com a mensagem do backend. */
export async function financeiroJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await financeiroFetch(caminho, init);
  if (!res.ok) throw new ErroDeApi(await mensagemDeErro(res, falha), res.status);
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** Envio de um arquivo (campo `arquivo`, mais campos de texto) em multipart. */
export async function financeiroEnviarArquivo<T>(
  caminho: string,
  arquivo: File,
  falha: string,
  campos: Record<string, string | undefined> = {}
): Promise<T> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor) form.append(nome, valor);
  }
  return financeiroJson<T>(caminho, { method: "POST", body: form }, falha);
}

/** Baixa um arquivo autenticado como Blob. */
export async function financeiroBaixarArquivo(caminho: string, falha: string): Promise<Blob> {
  const res = await financeiroFetch(caminho);
  if (!res.ok) throw new ErroDeApi(await mensagemDeErro(res, falha), res.status);
  return res.blob();
}

/** Baixa um arquivo autenticado e o salva no computador com o nome dado. */
export async function baixarArquivoComNome(caminho: string, nomeDoArquivo: string, falha: string): Promise<void> {
  const blob = await financeiroBaixarArquivo(caminho, falha);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoga depois: revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Abre o arquivo numa aba nova.
 *
 * Não pode ser um link: o endpoint exige o Bearer. Busca com fetch e abre o Blob. O navegador
 * bloqueia aba aberta depois de uma espera, então quem chama a partir de um clique abre a aba em
 * branco na hora (`janela`) e a passa aqui; sem aba (ou bloqueada), o arquivo é baixado.
 */
export async function abrirArquivoEmNovaAba(
  caminho: string,
  nomeDoArquivo: string,
  janela?: Window | null,
  falha = "Não foi possível abrir o arquivo."
): Promise<void> {
  let blob: Blob;
  try {
    blob = await financeiroBaixarArquivo(caminho, falha);
  } catch (err) {
    janela?.close();
    throw err;
  }

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
