import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { responsavelJson } from "@/lib/reception/api-responsavel";

/**
 * Notas, matérias e boletim — /api/Notas (cadastros em Administração; lançamento na área `tasks:notas`).
 *
 * Contrato: docs/notas/CONTRATO.md do core. Tipado à mão: o Swagger gerado ainda não conhece estes
 * endpoints. Ids são Guid (texto), exceto turma e aluno (número). Datas são texto "yyyy-MM-dd". A API omite
 * campos nulos: campo ausente é null, então compare sempre com `== null` / `!= null`.
 */

export type TipoDeAvaliacao = "Nota" | "Conceito" | "Descritivo";
export type DivisaoDoAno = "Bimestre" | "Trimestre" | "Semestre";

export const ROTULO_DO_TIPO: Record<TipoDeAvaliacao, string> = {
  Nota: "Nota (0 a 10)",
  Conceito: "Conceito",
  Descritivo: "Descritivo (texto)",
};

export interface EscalaItem {
  sigla: string;
  nome: string;
  valor: number;
}

export interface PeriodoLetivo {
  id: string;
  numero: number;
  nome: string;
  inicio: string;
  fim: string;
}

export interface AnoLetivo {
  id: string;
  ano: number;
  divisao: DivisaoDoAno;
  ativo: boolean;
  periodos: PeriodoLetivo[];
}

export interface Materia {
  id: string;
  nome: string;
  sigla?: string | null;
  area?: string | null;
  ativa: boolean;
  /** Quantas turmas usam a matéria: em uso não se exclui, só se desativa. */
  emUso: number;
}

export interface MateriaDaTurmaConfig {
  materiaDaTurmaId?: string | null;
  materiaId: string;
  materia: string;
  professorUserId?: string | null;
  professor?: string | null;
}

export interface ConfiguracaoDaTurma {
  classId: number;
  turma: string;
  anoLetivoId: string;
  ano: number;
  configurada: boolean;
  tipo: TipoDeAvaliacao;
  mediaMinima?: number | null;
  conceitos: EscalaItem[];
  conceitosDeComportamento: EscalaItem[];
  materias: MateriaDaTurmaConfig[];
}

export interface MateriaMinha {
  materiaDaTurmaId: string;
  materia: string;
  professor?: string | null;
}

export interface MinhaTurma {
  classId: number;
  turma: string;
  tipo: TipoDeAvaliacao;
  materias: MateriaMinha[];
  podeLancarComportamento: boolean;
}

export interface Instrumento {
  id: string;
  nome: string;
  peso: number;
  data?: string | null;
}

/** Por instrumento: o número (Nota) ou a sigla (Conceito). Sem entrada = sem nota. */
export type ValorLancado = number | string | null | undefined;

export interface AlunoDoLancamento {
  studentId: number;
  nome: string;
  notas: Record<string, ValorLancado>;
  media?: number | null;
  conceitoDaMedia?: string | null;
  descritivo?: string | null;
}

export interface Lancamento {
  materiaDaTurmaId: string;
  materia: string;
  classId: number;
  turma: string;
  periodoId: string;
  periodo: string;
  tipo: TipoDeAvaliacao;
  mediaMinima?: number | null;
  conceitos: EscalaItem[];
  instrumentos: Instrumento[];
  alunos: AlunoDoLancamento[];
  publicado: boolean;
  publicadoEm?: string | null;
  atualizadoAposPublicarEm?: string | null;
  podeEditar: boolean;
}

export interface AlunoDoComportamento {
  studentId: number;
  nome: string;
  conceito?: string | null;
  observacao?: string | null;
}

export interface ComportamentoDaTurma {
  classId: number;
  turma: string;
  periodoId: string;
  periodo: string;
  conceitos: EscalaItem[];
  alunos: AlunoDoComportamento[];
  publicado: boolean;
  atualizadoAposPublicarEm?: string | null;
  podeEditar: boolean;
}

export interface SituacaoDaPublicacao {
  classId: number;
  turma: string;
  periodoId: string;
  periodo: string;
  publicado: boolean;
  publicadoEm?: string | null;
  atualizadoAposPublicarEm?: string | null;
  totalDeAlunos: number;
  notasFaltando: number;
  materiasSemInstrumento: number;
  comportamentoFaltando: number;
  avisados?: number | null;
}

export interface PeriodoDoBoletim extends PeriodoLetivo {
  publicado: boolean;
  publicadoEm?: string | null;
}

export interface ResultadoDoPeriodo {
  periodoId: string;
  media?: number | null;
  conceito?: string | null;
  descritivo?: string | null;
}

export interface MateriaDoBoletim {
  materiaDaTurmaId: string;
  materia: string;
  area?: string | null;
  professor?: string | null;
  periodos: ResultadoDoPeriodo[];
  mediaDoAno?: number | null;
  conceitoDoAno?: string | null;
  /** "Acima da média" ou "Abaixo da média" (só no tipo Nota). */
  situacao?: string | null;
}

export interface ComportamentoDoBoletim {
  periodoId: string;
  conceito: string;
  nome?: string | null;
  valor?: number | null;
  observacao?: string | null;
}

export interface Boletim {
  aluno: { studentId: number; nome: string; classId: number; turma: string };
  ano: number;
  divisao: DivisaoDoAno;
  /** Ausente = a turma ainda não foi configurada neste ano. */
  tipo?: TipoDeAvaliacao | null;
  mediaMinima?: number | null;
  conceitos: EscalaItem[];
  conceitosDeComportamento: EscalaItem[];
  periodos: PeriodoDoBoletim[];
  materias: MateriaDoBoletim[];
  comportamento: ComportamentoDoBoletim[];
}

// ------------------------------------------------------------------ entradas

export interface AnoLetivoEntrada {
  ano: number;
  divisao?: DivisaoDoAno;
  ativo?: boolean;
}

export interface PeriodoEntrada {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
}

export interface MateriaEntrada {
  nome: string;
  sigla?: string | null;
  area?: string | null;
  ativa?: boolean;
}

export interface ConfiguracaoEntrada {
  tipo: TipoDeAvaliacao;
  mediaMinima?: number | null;
  conceitos?: EscalaItem[];
  conceitosDeComportamento?: EscalaItem[];
  materias: { materiaId: string; professorUserId?: string | null }[];
}

export interface InstrumentoEntrada {
  materiaDaTurmaId: string;
  periodoId: string;
  nome: string;
  peso: number;
  data?: string | null;
}

export interface NotaEntrada {
  instrumentoId: string;
  studentId: number;
  valor?: number | null;
  conceito?: string | null;
}

export interface LancamentoEntrada {
  materiaDaTurmaId: string;
  periodoId: string;
  notas?: NotaEntrada[];
  descritivos?: { studentId: number; texto: string }[];
}

export interface ComportamentoEntrada {
  classId: number;
  periodoId: string;
  alunos: { studentId: number; conceito?: string | null; observacao?: string | null }[];
}

// ------------------------------------------------------------------ cliente

interface OpcoesDeChamada {
  params?: { path?: Record<string, string | number>; query?: Record<string, string | number | boolean | undefined> };
  body?: unknown;
}
type ClienteSemTipo = Record<
  "GET" | "POST" | "PUT" | "DELETE",
  (caminho: string, opcoes?: OpcoesDeChamada) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;
const api = () => tasksApi as unknown as ClienteSemTipo;

const RAIZ = "/api/Notas";
const CHAVE = "notas";

function invalidar(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [CHAVE] });
}

/** Lista que a API pode omitir quando vazia. */
function lista<T>(valor: T[] | null | undefined): T[] {
  return Array.isArray(valor) ? valor : [];
}

// ------------------------------------------------------------------ cadastros

export function useAnosLetivos() {
  return useQuery({
    queryKey: [CHAVE, "anos"],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/anos`);
      const anos = lista(unwrapApiResponse(result, "Não foi possível carregar os anos letivos.") as unknown as AnoLetivo[]);
      return anos
        .map((a) => ({ ...a, periodos: lista(a.periodos).slice().sort((x, y) => x.numero - y.numero) }))
        .sort((a, b) => b.ano - a.ano);
    },
    staleTime: 60_000,
  });
}

export function useSalvarAnoLetivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id?: string; entrada: AnoLetivoEntrada }) => {
      const result = id
        ? await api().PUT(`${RAIZ}/anos/{id}`, { params: { path: { id } }, body: entrada })
        : await api().POST(`${RAIZ}/anos`, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar o ano letivo.") as unknown as AnoLetivo;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useSalvarPeriodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ anoId, periodos }: { anoId: string; periodos: PeriodoEntrada[] }) => {
      const result = await api().PUT(`${RAIZ}/anos/{id}/periodos`, { params: { path: { id: anoId } }, body: periodos });
      return unwrapApiResponse(result, "Não foi possível salvar os períodos.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

/** Quem pode ser professora de uma matéria na turma (usuários ativos da equipe). Só a gestão lê. */
export function useProfessoresPossiveis() {
  return useQuery({
    queryKey: [CHAVE, "professores"],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/professores`);
      const pessoas = lista(unwrapApiResponse(result, "Não foi possível carregar as professoras.") as unknown as { userId: string; nome: string }[]);
      return pessoas.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
    staleTime: 60_000,
  });
}

export function useMaterias() {
  return useQuery({
    queryKey: [CHAVE, "materias"],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/materias`);
      const materias = lista(unwrapApiResponse(result, "Não foi possível carregar as matérias.") as unknown as Materia[]);
      return materias.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
    staleTime: 60_000,
  });
}

export function useSalvarMateria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id?: string; entrada: MateriaEntrada }) => {
      const result = id
        ? await api().PUT(`${RAIZ}/materias/{id}`, { params: { path: { id } }, body: entrada })
        : await api().POST(`${RAIZ}/materias`, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar a matéria.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useExcluirMateria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api().DELETE(`${RAIZ}/materias/{id}`, { params: { path: { id } } });
      return unwrapApiResponse(result, "Não foi possível excluir a matéria.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export interface ResultadoDoModelo {
  criadas: number;
  jaExistiam: number;
}

export function useCriarModeloDeMaterias() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelo: "bncc" | "fundamental") => {
      const result = await api().POST(`${RAIZ}/materias/modelos/${modelo}`);
      return unwrapApiResponse(result, "Não foi possível criar as matérias.") as unknown as ResultadoDoModelo;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useConfiguracaoDaTurma(classId: number | null, ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "configuracao", classId, ano],
    enabled: classId != null && ano != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/turmas/{classId}/configuracao`, {
        params: { path: { classId: classId! }, query: { ano: ano! } },
      });
      const c = unwrapApiResponse(result, "Não foi possível carregar a configuração da turma.") as unknown as ConfiguracaoDaTurma;
      return {
        ...c,
        conceitos: lista(c.conceitos),
        conceitosDeComportamento: lista(c.conceitosDeComportamento),
        materias: lista(c.materias),
      } satisfies ConfiguracaoDaTurma;
    },
    retry: false,
  });
}

export function useSalvarConfiguracaoDaTurma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, ano, entrada }: { classId: number; ano: number; entrada: ConfiguracaoEntrada }) => {
      const result = await api().PUT(`${RAIZ}/turmas/{classId}/configuracao`, {
        params: { path: { classId }, query: { ano } },
        body: entrada,
      });
      return unwrapApiResponse(result, "Não foi possível salvar a configuração da turma.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

// ------------------------------------------------------------------ lançamento

export function useMinhasTurmas(ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "minhas-turmas", ano],
    enabled: ano != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/minhas-turmas`, { params: { query: { ano: ano! } } });
      const turmas = lista(unwrapApiResponse(result, "Não foi possível carregar as turmas.") as unknown as MinhaTurma[]);
      return turmas.map((t) => ({ ...t, materias: lista(t.materias) }));
    },
    staleTime: 30_000,
  });
}

export function useLancamento(materiaDaTurmaId: string | null, periodoId: string | null) {
  return useQuery({
    queryKey: [CHAVE, "lancamento", materiaDaTurmaId, periodoId],
    enabled: materiaDaTurmaId != null && periodoId != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/lancamento`, {
        params: { query: { materiaDaTurmaId: materiaDaTurmaId!, periodoId: periodoId! } },
      });
      const l = unwrapApiResponse(result, "Não foi possível carregar o lançamento.") as unknown as Lancamento;
      return {
        ...l,
        conceitos: lista(l.conceitos),
        instrumentos: lista(l.instrumentos),
        alunos: lista(l.alunos).map((a) => ({ ...a, notas: a.notas ?? {} })),
      } satisfies Lancamento;
    },
    retry: false,
    staleTime: 0,
  });
}

export function useSalvarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: LancamentoEntrada) => {
      const result = await api().PUT(`${RAIZ}/lancamento`, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar as notas.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useSalvarInstrumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id?: string; entrada: InstrumentoEntrada }) => {
      const result = id
        ? await api().PUT(`${RAIZ}/instrumentos/{id}`, { params: { path: { id } }, body: entrada })
        : await api().POST(`${RAIZ}/instrumentos`, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar a avaliação.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useExcluirInstrumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api().DELETE(`${RAIZ}/instrumentos/{id}`, { params: { path: { id } } });
      return unwrapApiResponse(result, "Não foi possível excluir a avaliação.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useComportamento(classId: number | null, periodoId: string | null) {
  return useQuery({
    queryKey: [CHAVE, "comportamento", classId, periodoId],
    enabled: classId != null && periodoId != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/comportamento`, {
        params: { query: { classId: classId!, periodoId: periodoId! } },
      });
      const c = unwrapApiResponse(result, "Não foi possível carregar o comportamento.") as unknown as ComportamentoDaTurma;
      return { ...c, conceitos: lista(c.conceitos), alunos: lista(c.alunos) } satisfies ComportamentoDaTurma;
    },
    retry: false,
    staleTime: 0,
  });
}

export function useSalvarComportamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: ComportamentoEntrada) => {
      const result = await api().PUT(`${RAIZ}/comportamento`, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar o comportamento.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

// ------------------------------------------------------------------ publicação

/** O que falta para publicar o boletim deste período da turma (GET /publicacoes?classId=&periodoId=). */
export function useSituacaoDaPublicacao(classId: number | null, periodoId: string | null, ativo = true) {
  return useQuery({
    queryKey: [CHAVE, "publicacao", classId, periodoId],
    enabled: ativo && classId != null && periodoId != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/publicacoes`, { params: { query: { classId: classId!, periodoId: periodoId! } } });
      return unwrapApiResponse(result, "Não foi possível verificar o boletim.") as unknown as SituacaoDaPublicacao;
    },
    retry: false,
    staleTime: 0,
  });
}

export function usePublicarBoletim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, periodoId }: { classId: number; periodoId: string }) => {
      const result = await api().POST(`${RAIZ}/publicacoes`, { body: { classId, periodoId } });
      return unwrapApiResponse(result, "Não foi possível publicar o boletim.") as unknown as SituacaoDaPublicacao;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useDespublicarBoletim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, periodoId }: { classId: number; periodoId: string }) => {
      const result = await api().DELETE(`${RAIZ}/publicacoes`, { body: { classId, periodoId } });
      return unwrapApiResponse(result, "Não foi possível despublicar o boletim.");
    },
    onSuccess: () => invalidar(queryClient),
  });
}

// ------------------------------------------------------------------ boletim

function normalizarBoletim(b: Boletim): Boletim {
  return {
    ...b,
    conceitos: lista(b.conceitos),
    conceitosDeComportamento: lista(b.conceitosDeComportamento),
    periodos: lista(b.periodos).slice().sort((x, y) => x.numero - y.numero),
    materias: lista(b.materias).map((m) => ({ ...m, periodos: lista(m.periodos) })),
    comportamento: lista(b.comportamento),
  };
}

/** Boletim completo do aluno, para a gestão e o professor da turma. */
export function useBoletimDoAluno(studentId: number | null, ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "boletim", studentId, ano],
    enabled: studentId != null && ano != null,
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/boletim/{studentId}`, {
        params: { path: { studentId: studentId! }, query: { ano: ano! } },
      });
      return normalizarBoletim(unwrapApiResponse(result, "Não foi possível carregar o boletim.") as unknown as Boletim);
    },
    retry: false,
    staleTime: 30_000,
  });
}

/** Boletim do filho no portal da família: só vêm os períodos publicados. */
export function useBoletimDoPortal(studentId: number | null, ano: number | null) {
  return useQuery({
    queryKey: ["responsavel", "portal", "boletim", studentId, ano],
    enabled: studentId != null && ano != null,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const q = new URLSearchParams({ studentId: String(studentId), ano: String(ano) });
      const b = await responsavelJson<Boletim>(`/boletim?${q.toString()}`, {}, "Não foi possível carregar o boletim.");
      return normalizarBoletim(b);
    },
  });
}
