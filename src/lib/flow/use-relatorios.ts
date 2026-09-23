import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

// fetch cru: rotas novas, fora dos tipos gerados, e as planilhas são binárias.
async function chamar(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}/api/Flow/relatorios${caminho}`, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.replace("/login?expirada=1");
  }
  return res;
}

async function json<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const res = await chamar(caminho, init);
  if (!res.ok) {
    let mensagem = falha;
    try {
      mensagem = ((await res.json()) as { message?: string }).message ?? falha;
    } catch {
      // corpo vazio
    }
    throw new Error(mensagem);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

async function baixarArquivo(caminho: string, nomePadrao: string, falha: string) {
  const res = await chamar(caminho);
  if (!res.ok) throw new Error(falha);

  // O nome vem do servidor (Content-Disposition) quando dá para ler; senão, o padrão.
  const disposicao = res.headers.get("Content-Disposition") ?? "";
  const nome = /filename\*=UTF-8''([^;]+)/i.exec(disposicao)?.[1] ?? /filename="?([^";]+)"?/i.exec(disposicao)?.[1];

  const url = window.URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nome ? decodeURIComponent(nome) : nomePadrao;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function periodo(de: string, ate: string) {
  const params = new URLSearchParams();
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

// ------------------------------------------------------------------ relatórios montados

/** Base de cadastro em que cada linha é uma pessoa, e não um envio. */
export const BASE_FORMULARIO = "formulario";

/** Filtros do cruzamento, como o backend os grava. */
export const FILTRO_TODOS = "todos";
export const FILTRO_COM_ENVIO = "com-envio";
export const FILTRO_SEM_ENVIO = "sem-envio";

export interface ColunaDaBase {
  slug: string;
  rotulo: string;
}

export interface BaseDeRelatorio {
  slug: string;
  rotulo: string;
  descricao: string;
  colunas: ColunaDaBase[];
  /** Formas de ligar um envio a uma linha desta base (ex.: "responsavel-cpf"). */
  chaves: string[];
}

export interface RelatorioDeFormulario {
  id: string;
  nome: string;
  descricao?: string | null;
  formId: string;
  formNome?: string | null;
  /** Vazio = todas as perguntas do formulário. */
  camposIds: string[];
  statusFiltro?: string | null;

  /** Só a gestão vê este relatório (ele mostra valor). */
  somenteGestao: boolean;

  /** "formulario" (cada linha é um envio) ou o slug da base de cadastro das linhas. */
  baseDados: string;
  /** Colunas da base de cadastro que viram coluna. Vazio = todas. */
  colunasBase: string[];
  cruzamentoFormId?: string | null;
  cruzamentoFormNome?: string | null;
  chaveDeLigacao?: string | null;
  filtroDoCruzamento?: string | null;

  criadoEm: string;
}

export interface SalvarRelatorio {
  nome: string;
  descricao?: string | null;
  formId: string;
  camposIds: string[];
  statusFiltro?: string | null;
  somenteGestao: boolean;
  baseDados: string;
  colunasBase: string[];
  cruzamentoFormId?: string | null;
  chaveDeLigacao?: string | null;
  filtroDoCruzamento?: string | null;
}

export interface ResultadoDoRelatorio {
  id: string;
  nome: string;
  descricao?: string | null;
  formId: string;
  formNome: string;
  statusFiltro?: string | null;
  colunas: string[];
  /** `enviadoEm` é nulo na linha de cadastro de quem não enviou — que é o caso que a escola procura. */
  linhas: { respostaId: string; enviadoEm: string | null; status: string; valores: string[] }[];
}

const CHAVE = ["relatorios-de-formulario"];

/**
 * De onde um relatório pode partir. Catálogo: só muda com deploy, e é lido toda vez que o editor
 * abre — fora da chave dos relatórios para não ser recarregado a cada salvamento.
 */
export function useBasesDeRelatorio() {
  return useQuery({
    queryKey: ["relatorios-bases"],
    staleTime: Infinity,
    queryFn: () => json<BaseDeRelatorio[]>("/bases", {}, "Não foi possível carregar as bases de dados."),
  });
}

export function useRelatoriosDeFormulario() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => json<RelatorioDeFormulario[]>("", {}, "Não foi possível carregar os relatórios."),
  });
}

export function useRelatorioDeFormulario(id: string | undefined) {
  return useQuery({
    queryKey: [...CHAVE, id],
    enabled: !!id,
    queryFn: () => json<RelatorioDeFormulario>(`/${id}`, {}, "Não foi possível carregar o relatório."),
  });
}

export function useSalvarRelatorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: SalvarRelatorio }) =>
      json<RelatorioDeFormulario>(
        id ? `/${id}` : "",
        { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
        "Não foi possível salvar o relatório."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirRelatorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => json<void>(`/${id}`, { method: "DELETE" }, "Não foi possível excluir o relatório."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useDadosDoRelatorio(id: string | undefined, de: string, ate: string) {
  return useQuery({
    queryKey: [...CHAVE, id, "dados", de, ate],
    enabled: !!id,
    queryFn: () =>
      json<ResultadoDoRelatorio>(`/${id}/dados${periodo(de, ate)}`, {}, "Não foi possível gerar o relatório."),
  });
}

export function useBaixarRelatorio() {
  return useMutation({
    mutationFn: ({ id, de, ate }: { id: string; de: string; ate: string }) =>
      baixarArquivo(`/${id}/excel${periodo(de, ate)}`, "relatorio.xlsx", "Não foi possível gerar a planilha."),
  });
}

// ------------------------------------------------------------------ matrículas x rematrículas

export type SituacaoDaMatricula =
  | "rematriculado"
  | "rematricula-pendente"
  | "nao-rematriculado"
  | "matricula-nova"
  | "matricula-nova-pendente"
  | "rematricula-sem-cadastro";

export interface LinhaMatriculaRematricula {
  studentId?: number | null;
  aluno: string;
  dataNascimento?: string | null;
  turmaAtual?: string | null;
  situacao: SituacaoDaMatricula;
  situacaoDescricao: string;
  turmaProximoAno?: string | null;
  statusEnvio?: string | null;
  enviadoEm?: string | null;
  formulario?: string | null;
}

export interface RelatorioMatriculas {
  anoVigente: number;
  proximoAno: number;
  alunosAtivos: number;
  rematriculados: number;
  rematriculasPendentes: number;
  naoRematriculados: number;
  matriculasNovas: number;
  matriculasNovasPendentes: number;
  rematriculasSemCadastro: number;
  linhas: LinhaMatriculaRematricula[];
}

export function useRelatorioMatriculas() {
  return useQuery({
    queryKey: ["relatorios", "matriculas-rematriculas"],
    queryFn: () =>
      json<RelatorioMatriculas>("/matriculas-rematriculas", {}, "Não foi possível gerar o relatório."),
  });
}

export function useBaixarRelatorioMatriculas() {
  return useMutation({
    mutationFn: () =>
      baixarArquivo(
        "/matriculas-rematriculas/excel",
        "matriculas-x-rematriculas.xlsx",
        "Não foi possível gerar a planilha."
      ),
  });
}
