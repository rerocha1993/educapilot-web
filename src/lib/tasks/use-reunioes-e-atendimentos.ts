import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/**
 * Reuniões e atendimentos — /api/ReunioesEAtendimentos (área `tasks:reunioes-pais`; o slug antigo ficou).
 *
 * Contrato: docs/reunioes/CONTRATO.md do core. Tipado à mão: o Swagger gerado ainda não conhece estes
 * endpoints. Datas são texto "yyyy-MM-dd" (dia de Brasília) e horas "HH:mm". A API omite campos nulos
 * (WhenWritingNull): campo ausente é null, então compare sempre com `== null`. A ata (`conversado`) é
 * interna da escola. As notas só vêm para a gestão: para os demais nem existem no JSON.
 */

export type StatusDaReuniao = "Agendada" | "Realizada" | "Cancelada" | "ResponsavelNaoCompareceu";

export const ROTULO_DO_STATUS: Record<StatusDaReuniao, string> = {
  Agendada: "Agendada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
  ResponsavelNaoCompareceu: "Não compareceu",
};

export const VARIANTE_DO_STATUS: Record<StatusDaReuniao, "waiting" | "success" | "outline" | "overdue"> = {
  Agendada: "waiting",
  Realizada: "success",
  Cancelada: "outline",
  ResponsavelNaoCompareceu: "overdue",
};

export const STATUS_DA_LISTA: StatusDaReuniao[] = ["Agendada", "Realizada", "ResponsavelNaoCompareceu", "Cancelada"];

export type TipoDeEnvolvido = "Aluno" | "Responsavel" | "Funcionario";
export const ROTULO_DO_ENVOLVIDO: Record<TipoDeEnvolvido, string> = {
  Aluno: "Aluno",
  Responsavel: "Responsável",
  Funcionario: "Funcionário",
};

export type QuemFaz = "Escola" | "Familia" | "Funcionario";
export const ROTULO_DE_QUEM_FAZ: Record<QuemFaz, string> = { Escola: "Escola", Familia: "Família", Funcionario: "Funcionário" };

/** O assunto "Advertência verbal" tem regras próprias (precisa de funcionário; registra no Desempenho). */
export function ehAdvertenciaVerbal(assunto: string | null | undefined): boolean {
  return (assunto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === "advertencia verbal";
}

// ------------------------------------------------------------------ tipos

export interface AssuntoDeReuniao {
  valor: string;
  grupo: string;
  soGestao?: boolean | null;
}

export interface OpcoesDeReuniao {
  assuntos: AssuntoDeReuniao[];
  podeDarNota?: boolean | null;
  souGestao?: boolean | null;
}

export interface Envolvivel {
  tipo: TipoDeEnvolvido;
  studentId?: number | null;
  guardianId?: string | null;
  funcionarioId?: string | null;
  nome: string;
  detalhe?: string | null;
}

export interface CondutorPossivel {
  userId: string;
  funcionarioId?: string | null;
  nome: string;
  cargo?: string | null;
}

export interface EnvolvidoNaReuniao extends Envolvivel {
  id?: string | null;
}

export interface CondutorDaReuniao {
  userId: string;
  funcionarioId?: string | null;
  nome: string;
}

export interface Encaminhamento {
  id: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo?: string | null;
  cumprido: boolean;
  cumpridoEm?: string | null;
  /** Tem prazo anterior a hoje (Brasília) e ainda não foi cumprido. */
  vencido?: boolean | null;
  funcionarioId?: string | null;
  funcionarioNome?: string | null;
  responsavelUserId?: string | null;
  cartaoId?: string | null;
  cartaoConcluido?: boolean | null;
}

export interface ReuniaoDoResumo {
  id: string;
  data: string;
  hora?: string | null;
  assunto: string;
  status: StatusDaReuniao;
  envolvidos: { tipo: TipoDeEnvolvido; nome: string }[];
  condutores: string[];
  notaDoAssunto?: number | null;
  notaDoDesfecho?: number | null;
  /** Os campos abaixo são opcionais no contrato: a tela só os mostra quando vêm. */
  atrasada?: boolean | null;
  totalDeEncaminhamentos?: number | null;
  encaminhamentosEmAberto?: number | null;
  encaminhamentosVencidos?: number | null;
}

export interface ReuniaoDetalhada {
  id: string;
  data: string;
  hora?: string | null;
  assunto: string;
  status: StatusDaReuniao;
  envolvidos: EnvolvidoNaReuniao[];
  condutores: CondutorDaReuniao[];
  pauta?: string | null;
  conversado?: string | null;
  proximaReuniaoEm?: string | null;
  motivoDoCancelamento?: string | null;
  occurrenceId?: number | null;
  ocorrencia?: { id: number; data: string; categoria: string } | null;
  encaminhamentos: Encaminhamento[];
  notaDoAssunto?: number | null;
  notaDoDesfecho?: number | null;
  advertenciaRegistrada?: boolean | null;
  atrasada?: boolean | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
}

export interface FiltroDeReunioes {
  assunto?: string;
  status?: StatusDaReuniao | "";
  de?: string;
  ate?: string;
  studentId?: number | null;
  funcionarioId?: string | null;
}

export interface EncaminhamentoEntrada {
  id?: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo: string | null;
  cumprido: boolean;
  funcionarioId?: string | null;
  criarCard?: boolean;
}

export interface EnvolvidoEntrada {
  tipo: TipoDeEnvolvido;
  studentId?: number | null;
  guardianId?: string | null;
  funcionarioId?: string | null;
  nome?: string | null;
  detalhe?: string | null;
}

export interface ReuniaoEntrada {
  data: string;
  hora: string | null;
  assunto: string;
  envolvidos: EnvolvidoEntrada[];
  condutores: string[];
  pauta: string | null;
  conversado: string | null;
  proximaReuniaoEm: string | null;
  occurrenceId: number | null;
  encaminhamentos: EncaminhamentoEntrada[];
}

export interface ResponsavelDoAluno {
  guardianId?: string | null;
  id?: string | null;
  nome: string;
  parentesco?: string | null;
}

export interface ReuniaoDoMeuDesempenho {
  data: string;
  assunto: string;
  condutores: string[];
  notaDoAssunto?: number | null;
  notaDoDesfecho?: number | null;
}

// openapi-fetch tipa os caminhos pelo Swagger gerado; estes ainda não existem lá. O cast mantém o cliente
// (token, 401) e o unwrapApiResponse, e some quando o tipo for regenerado.
interface OpcoesDeChamada {
  params?: { path?: Record<string, string | number>; query?: Record<string, string | number | boolean | undefined> };
  body?: unknown;
}
type ClienteSemTipo = Record<
  "GET" | "POST" | "PUT",
  (caminho: string, opcoes?: OpcoesDeChamada) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;
const api = () => tasksApi as unknown as ClienteSemTipo;

const RAIZ = "/api/ReunioesEAtendimentos";
const CHAVE = "reunioes-e-atendimentos";

// ------------------------------------------------------------------ consultas

export function useOpcoesDeReuniao() {
  return useQuery({
    queryKey: [CHAVE, "opcoes"],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/opcoes`);
      return unwrapApiResponse(result, "Não foi possível carregar as opções da reunião.") as unknown as OpcoesDeReuniao;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** Busca única de pessoas para a reunião (aluno, responsável, funcionário), por nome, até 20. */
export function useEnvolviveis(busca: string, tipo: TipoDeEnvolvido | "") {
  const termo = busca.trim();
  return useQuery({
    queryKey: [CHAVE, "envolviveis", termo, tipo],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/envolviveis`, { params: { query: { busca: termo || undefined, tipo: tipo || undefined } } });
      return (unwrapApiResponse(result, "Não foi possível buscar as pessoas.") ?? []) as unknown as Envolvivel[];
    },
    enabled: termo.length >= 2,
    retry: false,
    staleTime: 30_000,
  });
}

export function useCondutoresPossiveis() {
  return useQuery({
    queryKey: [CHAVE, "condutores"],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/condutores`);
      return (unwrapApiResponse(result, "Não foi possível carregar quem pode conduzir.") ?? []) as unknown as CondutorPossivel[];
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** Responsáveis cadastrados de um aluno, para sugerir quando ele entra na reunião. Falha sem barulho. */
export function useResponsaveisDoAluno(studentId: number | null) {
  return useQuery({
    queryKey: [CHAVE, "responsaveis", studentId],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/alunos/{studentId}/responsaveis`, { params: { path: { studentId: studentId! } } });
      return (unwrapApiResponse(result, "Não foi possível carregar os responsáveis do aluno.") ?? []) as unknown as ResponsavelDoAluno[];
    },
    enabled: studentId !== null && Number.isFinite(studentId),
    retry: false,
    staleTime: 60_000,
  });
}

/** A lista pode vir como array simples ou como { itens }: aceita os dois. */
export function useReunioes(filtro: FiltroDeReunioes) {
  return useQuery({
    queryKey: [CHAVE, "lista", filtro],
    queryFn: async () => {
      const result = await api().GET(RAIZ, {
        params: {
          query: {
            de: filtro.de || undefined,
            ate: filtro.ate || undefined,
            assunto: filtro.assunto || undefined,
            status: filtro.status || undefined,
            studentId: filtro.studentId ?? undefined,
            funcionarioId: filtro.funcionarioId || undefined,
          },
        },
      });
      const corpo = unwrapApiResponse(result, "Não foi possível carregar as reuniões.") as unknown;
      const lista = Array.isArray(corpo) ? corpo : ((corpo as { itens?: unknown[] } | null)?.itens ?? []);
      return lista as ReuniaoDoResumo[];
    },
    retry: false,
    staleTime: 15_000,
  });
}

export function useReuniao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "detalhe", id],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/{id}`, { params: { path: { id: id! } } });
      return unwrapApiResponse(result, "Não foi possível carregar a reunião.") as unknown as ReuniaoDetalhada;
    },
    enabled: !!id,
    retry: false,
  });
}

/** "Meu desempenho": só data, assunto, quem conduziu e as notas. Sem pauta nem ata. */
export function useMinhasReunioes(habilitado = true) {
  return useQuery({
    queryKey: ["rh-meu-desempenho", "reunioes"],
    enabled: habilitado,
    retry: false,
    queryFn: async () => {
      const result = await api().GET("/api/rh/meu-desempenho/reunioes");
      return (unwrapApiResponse(result, "Não foi possível carregar as suas reuniões.") ?? []) as unknown as ReuniaoDoMeuDesempenho[];
    },
  });
}

// ------------------------------------------------------------------ comandos

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  // A reunião aparece também na ficha do aluno, na linha do tempo e na nota do funcionário.
  void queryClient.invalidateQueries({ queryKey: [CHAVE] });
  void queryClient.invalidateQueries({ queryKey: ["resumo-do-aluno"] });
  void queryClient.invalidateQueries({ queryKey: ["rh-desempenho"] });
  void queryClient.invalidateQueries({ queryKey: ["rh-meu-desempenho"] });
  void queryClient.invalidateQueries({ queryKey: ["tarefas"] });
}

export function useSalvarReuniao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id?: string; entrada: ReuniaoEntrada }) => {
      const result = id
        ? await api().PUT(`${RAIZ}/{id}`, { params: { path: { id } }, body: entrada })
        : await api().POST(RAIZ, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar a reunião.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useFinalizarReuniao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api().POST(`${RAIZ}/{id}/finalizar`, { params: { path: { id } } });
      return unwrapApiResponse(result, "Não foi possível finalizar a reunião.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useCancelarReuniao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const result = await api().POST(`${RAIZ}/{id}/cancelar`, { params: { path: { id } }, body: { motivo: motivo.trim() || null } });
      return unwrapApiResponse(result, "Não foi possível cancelar a reunião.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useMarcarNaoCompareceu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api().POST(`${RAIZ}/{id}/nao-compareceu`, { params: { path: { id } } });
      return unwrapApiResponse(result, "Não foi possível registrar que não compareceu.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useSalvarNotas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notaDoAssunto, notaDoDesfecho }: { id: string; notaDoAssunto: number | null; notaDoDesfecho: number | null }) => {
      const result = await api().PUT(`${RAIZ}/{id}/notas`, { params: { path: { id } }, body: { notaDoAssunto, notaDoDesfecho } });
      return unwrapApiResponse(result, "Não foi possível salvar as notas.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useMarcarCombinado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, encaminhamentoId, cumprido }: { id: string; encaminhamentoId: string; cumprido: boolean }) => {
      const result = await api().PUT(`${RAIZ}/{id}/encaminhamentos/{encaminhamentoId}/cumprido`, {
        params: { path: { id, encaminhamentoId } },
        body: { cumprido },
      });
      return unwrapApiResponse(result, "Não foi possível atualizar o encaminhamento.") as unknown as ReuniaoDetalhada;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

// ------------------------------------------------------------------ apresentação

/** "3 · 8": as duas notas lado a lado; "—" no lugar da que falta; vazio sem nenhuma. */
export function textoDasNotas(a: number | null | undefined, d: number | null | undefined): string {
  if (a == null && d == null) return "";
  return `${a ?? "—"} · ${d ?? "—"}`;
}

/** Junta nomes com vírgula e "e" no fim. */
export function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
