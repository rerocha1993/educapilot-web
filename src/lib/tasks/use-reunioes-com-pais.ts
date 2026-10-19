import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/**
 * Reunião com os pais — /api/ReunioesComPais (área `tasks:reunioes-pais`).
 *
 * Tipado à mão: o Swagger gerado ainda não conhece estes endpoints. Datas são texto "yyyy-MM-dd" (dia de
 * Brasília) e horas "HH:mm": fiquem assim até a tela (use formatarSoData). A ata é interna da escola — a
 * família não a lê.
 */

export const TIPOS_DE_REUNIAO = [
  "Pedagógica",
  "Comportamento",
  "Desempenho",
  "Rotina/Adaptação",
  "Financeira",
  "Outro",
] as const;

export type StatusDaReuniao = "Agendada" | "Realizada" | "Cancelada" | "ResponsavelNaoCompareceu";

/** Status que o formulário aceita; Cancelada é um comando à parte. */
export const STATUS_DO_FORMULARIO: StatusDaReuniao[] = ["Agendada", "Realizada", "ResponsavelNaoCompareceu"];

export const ROTULO_DO_STATUS: Record<StatusDaReuniao, string> = {
  Agendada: "Agendada",
  Realizada: "Realizada",
  Cancelada: "Cancelada",
  ResponsavelNaoCompareceu: "Responsável não compareceu",
};

export const VARIANTE_DO_STATUS: Record<StatusDaReuniao, "waiting" | "success" | "outline" | "overdue"> = {
  Agendada: "waiting",
  Realizada: "success",
  Cancelada: "outline",
  ResponsavelNaoCompareceu: "overdue",
};

export type QuemFaz = "Escola" | "Familia";
export const ROTULO_DE_QUEM_FAZ: Record<QuemFaz, string> = { Escola: "Escola", Familia: "Família" };

export interface ResponsavelNaReuniao {
  id: string;
  guardianId: string | null;
  nome: string;
  parentesco: string | null;
}

export interface Encaminhamento {
  id: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo: string | null;
  cumprido: boolean;
  cumpridoEm: string | null;
  /** Tem prazo anterior a hoje (Brasília) e ainda não foi cumprido. */
  vencido: boolean;
}

export interface ReuniaoComPaisItem {
  id: string;
  studentId: number;
  aluno: string;
  classId: number;
  turma: string | null;
  data: string;
  hora: string | null;
  tipo: string;
  status: StatusDaReuniao;
  conduzidaPor: string;
  nomesDosResponsaveis: string[];
  totalDeEncaminhamentos: number;
  encaminhamentosEmAberto: number;
  encaminhamentosVencidos: number;
  proximaReuniaoEm: string | null;
  /** Agendada para um dia que já passou: falta registrar como feita ou cancelar. */
  atrasada: boolean;
}

export interface ReuniaoComPais extends ReuniaoComPaisItem {
  pauta: string | null;
  conversado: string | null;
  motivoDoCancelamento: string | null;
  occurrenceId: number | null;
  ocorrencia: { id: number; data: string; categoria: string } | null;
  responsaveis: ResponsavelNaReuniao[];
  encaminhamentos: Encaminhamento[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface ResumoDasReunioes {
  agendadas: number;
  realizadas: number;
  canceladas: number;
  naoCompareceu: number;
  agendadasAtrasadas: number;
  encaminhamentosEmAberto: number;
  encaminhamentosVencidos: number;
}

export interface ListaDeReunioes {
  itens: ReuniaoComPaisItem[];
  total: number;
  pagina: number;
  tamanho: number;
  resumo: ResumoDasReunioes;
}

export interface FiltroDeReunioes {
  classId?: number | null;
  studentId?: number | null;
  status?: StatusDaReuniao | "";
  tipo?: string;
  de?: string;
  ate?: string;
  comPendencias?: boolean;
  pagina?: number;
}

export interface EncaminhamentoEntrada {
  id?: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo: string | null;
  cumprido: boolean;
}

export interface ResponsavelEntrada {
  guardianId?: string | null;
  nome?: string | null;
  parentesco?: string | null;
}

export interface ReuniaoEntrada {
  studentId: number;
  data: string;
  hora: string | null;
  tipo: string;
  status: StatusDaReuniao;
  pauta: string | null;
  conversado: string | null;
  proximaReuniaoEm: string | null;
  occurrenceId: number | null;
  responsaveis: ResponsavelEntrada[];
  encaminhamentos: EncaminhamentoEntrada[];
}

// openapi-fetch tipa os caminhos pelo Swagger gerado; estes ainda não existem lá. O cast mantém o cliente
// (token, 401) e o unwrapApiResponse, e some quando o tipo for regenerado.
interface Opcoes {
  params?: { path?: Record<string, string | number>; query?: Record<string, string | number | boolean | undefined> };
  body?: unknown;
}
type ClienteSemTipo = Record<
  "GET" | "POST" | "PUT",
  (caminho: string, opcoes?: Opcoes) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;
const api = () => tasksApi as unknown as ClienteSemTipo;

const RAIZ = "/api/ReunioesComPais";

export function useReunioesComPais(filtro: FiltroDeReunioes) {
  return useQuery({
    queryKey: ["reunioes-com-pais", "lista", filtro],
    queryFn: async () => {
      const result = await api().GET(RAIZ, {
        params: {
          query: {
            classId: filtro.classId ?? undefined,
            studentId: filtro.studentId ?? undefined,
            status: filtro.status || undefined,
            tipo: filtro.tipo || undefined,
            de: filtro.de || undefined,
            ate: filtro.ate || undefined,
            comPendencias: filtro.comPendencias || undefined,
            pagina: filtro.pagina ?? 1,
            tamanho: 20,
          },
        },
      });
      return unwrapApiResponse(result, "Não foi possível carregar as reuniões.") as unknown as ListaDeReunioes;
    },
    retry: false,
    staleTime: 15_000,
  });
}

export function useReuniaoComPais(id: string | null) {
  return useQuery({
    queryKey: ["reunioes-com-pais", "detalhe", id],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/{id}`, { params: { path: { id: id! } } });
      return unwrapApiResponse(result, "Não foi possível carregar a reunião.") as unknown as ReuniaoComPais;
    },
    enabled: !!id,
    retry: false,
  });
}

/** Responsáveis cadastrados do aluno (nome e parentesco; contato é de outra área). */
export function useResponsaveisDoAluno(studentId: number | null) {
  return useQuery({
    queryKey: ["reunioes-com-pais", "responsaveis", studentId],
    queryFn: async () => {
      const result = await api().GET(`${RAIZ}/alunos/{studentId}/responsaveis`, { params: { path: { studentId: studentId! } } });
      return (unwrapApiResponse(result, "Não foi possível carregar os responsáveis do aluno.") ?? []) as unknown as ResponsavelNaReuniao[];
    },
    enabled: studentId !== null && Number.isFinite(studentId),
    retry: false,
  });
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  // A reunião aparece também no dossiê do aluno.
  void queryClient.invalidateQueries({ queryKey: ["reunioes-com-pais"] });
  void queryClient.invalidateQueries({ queryKey: ["resumo-do-aluno"] });
}

export function useSalvarReuniaoComPais() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entrada }: { id?: string; entrada: ReuniaoEntrada }) => {
      const result = id
        ? await api().PUT(`${RAIZ}/{id}`, { params: { path: { id } }, body: entrada })
        : await api().POST(RAIZ, { body: entrada });
      return unwrapApiResponse(result, "Não foi possível salvar a reunião.") as unknown as ReuniaoComPais;
    },
    onSuccess: () => invalidar(queryClient),
  });
}

export function useCancelarReuniaoComPais() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const result = await api().POST(`${RAIZ}/{id}/cancelar`, { params: { path: { id } }, body: { motivo: motivo.trim() || null } });
      return unwrapApiResponse(result, "Não foi possível cancelar a reunião.") as unknown as ReuniaoComPais;
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
      return unwrapApiResponse(result, "Não foi possível atualizar o combinado.") as unknown as ReuniaoComPais;
    },
    onSuccess: () => invalidar(queryClient),
  });
}
