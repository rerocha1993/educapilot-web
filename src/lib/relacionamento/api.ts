import { clearSession, getToken } from "@/lib/auth/session";
import { responsavelFetch } from "@/lib/reception/api-responsavel";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Chamada à API do Relacionamento da escola — /api/Relacionamento.
 *
 * fetch cru, pelo mesmo motivo do RH: há upload multipart (anexos) e download autenticado, que o
 * cliente tipado não cobre. O lado dos pais usa `responsavelFetch` (/api/Responsavel), com o
 * mesmo tratamento de 401.
 *
 * Professor só enxerga e mexe nas publicações das turmas dele; quem decide é o servidor (a tela
 * apenas não oferece o que ele não pode).
 */
export async function relacionamentoFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Corpo de texto é JSON; FormData fica sem Content-Type para o navegador pôr o boundary.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Relacionamento${caminho}`, { ...init, headers });

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

/** A frase que explica o erro. `title` fica de fora: num 409 ele é só "Conflict". */
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
  if (res.status === 403) return "Você não tem permissão para esta ação.";
  return falha;
}

/** Chamada que devolve JSON. Falha vira Error com a mensagem do backend. */
export async function relacionamentoJson<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await relacionamentoFetch(caminho, init);
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** Envio multipart de um arquivo. */
export async function relacionamentoUpload<T>(
  caminho: string,
  campo: string,
  arquivo: File,
  falha: string
): Promise<T> {
  const form = new FormData();
  form.append(campo, arquivo);
  return relacionamentoJson<T>(caminho, { method: "POST", body: form }, falha);
}

/** Query string só com o que tem valor. */
export function consulta(parametros: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [nome, valor] of Object.entries(parametros)) {
    if (valor === null || valor === undefined || valor === "" || valor === false) continue;
    q.set(nome, String(valor));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
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
 * Entrega ao navegador o arquivo de uma resposta autenticada.
 *
 * Não pode ser um link: o endpoint exige o Bearer, e o navegador não manda cabeçalho num <a href>.
 * Com `abrir`, imprime/abre numa aba nova (PDF e imagem), que é o que o pai espera ao tocar num
 * anexo; sem, baixa. Se o navegador bloquear a aba, cai no download.
 */
async function entregar(res: Response, nomeSugerido: string, abrir: boolean): Promise<void> {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  if (abrir && typeof window !== "undefined") {
    const aba = window.open(url, "_blank", "noopener");
    if (aba) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoCabecalho(res) ?? nomeSugerido;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoga depois: revogar na hora cancelaria o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Baixa um anexo pelo lado da escola. */
export async function baixarAnexoDaEscola(anexoId: string, nome: string): Promise<void> {
  const res = await relacionamentoFetch(`/publicacoes/anexos/${anexoId}/arquivo`);
  if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível baixar o anexo."));
  await entregar(res, nome, false);
}

/** Abre ou baixa um anexo pelo lado dos pais. */
export async function abrirAnexoDaFamilia(anexoId: string, nome: string): Promise<void> {
  const res = await responsavelFetch(`/avisos/anexos/${anexoId}/arquivo`);
  if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível abrir o anexo."));
  await entregar(res, nome, true);
}

/** Envio multipart de vários arquivos no mesmo campo (fotos de atividade e de álbum). */
export async function relacionamentoUploadVarios<T>(
  caminho: string,
  campo: string,
  arquivos: File[],
  falha: string
): Promise<T> {
  const form = new FormData();
  for (const arquivo of arquivos) form.append(campo, arquivo, arquivo.name);
  return relacionamentoJson<T>(caminho, { method: "POST", body: form }, falha);
}

// ------------------------------------------------------------------ fotos autenticadas

/** Miniatura (quadrada, leve) ou a foto original reduzida no envio. */
export type VarianteDaFoto = "thumb" | "original";

/**
 * Como buscar o arquivo de uma foto. Cada lado (escola, família) tem o seu: o endpoint exige o
 * Bearer, então a imagem não pode ser um <img src> direto.
 */
export type BaixarFoto = (fotoId: string, variante: VarianteDaFoto) => Promise<Blob>;

async function blobDe(res: Response, falha: string): Promise<Blob> {
  if (!res.ok) throw new Error(await mensagemDeErro(res, falha));
  return res.blob();
}

const FALHA_DA_FOTO = "Não foi possível carregar a foto.";

/** Foto de uma atividade, pelo lado da escola. */
export const baixarFotoDaAtividade: BaixarFoto = async (fotoId, variante) =>
  blobDe(await relacionamentoFetch(`/atividades/fotos/${fotoId}/arquivo${consulta({ variante })}`), FALHA_DA_FOTO);

/** Foto de um álbum do mural, pelo lado da escola. */
export const baixarFotoDoMural: BaixarFoto = async (fotoId, variante) =>
  blobDe(await relacionamentoFetch(`/mural/fotos/${fotoId}/arquivo${consulta({ variante })}`), FALHA_DA_FOTO);

/** Foto de atividade ou de álbum, pelo lado dos pais (o servidor confere o vínculo com a turma). */
export const baixarFotoDaFamilia: BaixarFoto = async (fotoId, variante) =>
  blobDe(await responsavelFetch(`/fotos/${fotoId}/arquivo${consulta({ variante })}`), FALHA_DA_FOTO);
