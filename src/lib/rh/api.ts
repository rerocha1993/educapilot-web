import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API do RH — /api/Rh.
 *
 * fetch cru, e não o cliente tipado: o RH tem upload multipart (atestado, documento, planilha de
 * ponto) e download binário (planilhas, arquivos), que o cliente tipado não cobre, e os tipos
 * gerados só existem depois que o Swagger do módulo estiver publicado. As respostas são tipadas à
 * mão em use-rh.ts, como na Portaria.
 *
 * Repete o que o cliente tipado faz de importante: manda o token e encerra a sessão num 401.
 *
 * Professor lê e não escreve: a escrita volta 403 e a mensagem sobe para o toast. A tela esconde
 * os botões, mas quem decide é o servidor.
 */
export async function rhFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Corpo de texto é JSON; FormData fica sem Content-Type para o navegador pôr o boundary.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Rh${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  return res;
}

/** Corpo de erro do ASP.NET: { message } nos controllers do projeto, ProblemDetails nos demais. */
interface CorpoDeErro {
  message?: string;
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

/**
 * A frase que explica o erro. `title` fica de fora: num 409 ele é só "Conflict", e o motivo de
 * verdade está em `message` ou `detail` (por exemplo, "o período sobrepõe outro afastamento").
 */
export async function mensagemDeErro(res: Response, falha: string): Promise<string> {
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
  if (res.status === 403) return "Você não tem permissão para esta ação no RH.";
  return falha;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function rhJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await rhFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/**
 * Envio multipart (arquivo + campos). Campos vazios ou nulos ficam de fora: o servidor lê a
 * ausência como "não informado", e um texto vazio viraria o valor "" no lugar de nulo.
 */
export async function rhUpload<T>(
  caminho: string,
  campos: Record<string, string | number | boolean | File | null | undefined>,
  falha: string,
  metodo: "POST" | "PUT" = "POST"
): Promise<T> {
  const form = new FormData();
  for (const [nome, valor] of Object.entries(campos)) {
    if (valor === null || valor === undefined || valor === "") continue;
    form.append(nome, typeof valor === "object" ? valor : String(valor));
  }

  return rhJson<T>(caminho, { method: metodo, body: form }, falha);
}

/** Nome do arquivo no Content-Disposition, quando o servidor manda um. */
function nomeDoCabecalho(res: Response): string | null {
  const cabecalho = res.headers.get("Content-Disposition");
  if (!cabecalho) return null;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      // cai no filename simples
    }
  }

  const simples = /filename="?([^";]+)"?/i.exec(cabecalho);
  return simples ? simples[1].trim() : null;
}

/**
 * Baixa um arquivo autenticado.
 *
 * Não pode ser um link: o endpoint exige o Bearer, e o navegador não manda cabeçalho num
 * <a href>. Busca com fetch, vira Blob e dispara o download por um link temporário. O nome vem do
 * servidor quando ele manda; senão, de `nomeSugerido`.
 */
export async function rhDownload(caminho: string, nomeSugerido: string, falha: string): Promise<void> {
  const res = await rhFetch(caminho);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoCabecalho(res) ?? nomeSugerido;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoga depois: revogar na hora cancelaria o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
