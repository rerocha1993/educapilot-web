import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "../api/client";
import { unwrapApiResponse } from "../api/unwrap";

/** Cobrança do EduPay vencida e não paga — ver AgendaEduCobrancaVencidaDto no backend. */
export interface CobrancaVencida {
  cobrancaId: string;
  titulo?: string | null;
  /** Nulo quando o aluno ainda não foi importado do Agenda Edu. */
  alunoId?: number | null;
  alunoNome: string;
  turma?: string | null;
  responsavelNome?: string | null;
  responsavelTelefone?: string | null;
  responsavelEmail?: string | null;
  valorTotal: number;
  valorPago: number;
  valorEmAberto: number;
  venceEm: string;
  diasAtraso: number;
  boletoUrl?: string | null;
  status: string;
}

/** Conta de recebimento da escola no EduPay. A escola pode ter mais de uma, uma por CNPJ. */
export interface CarteiraAgendaEdu {
  id: string;
  nome?: string | null;
  banco?: string | null;
  eventos: number;
}

export interface InadimplenciaAgendaEdu {
  /** Falso quando a escola não configurou o Agenda Edu: a tela nem mostra a seção. */
  configurado: boolean;
  ultimaSincronizacaoEm?: string | null;
  /** Motivo da última falha de leitura. Lista vazia com erro não é "ninguém deve". */
  erro?: string | null;
  /** Carteiras encontradas e por onde vieram os eventos. Distingue "não tem" de "não achei". */
  resumo?: string | null;
  totalEmAberto: number;
  itens: CobrancaVencida[];
}

export interface ResultadoSincronizacao {
  sucesso: boolean;
  erro?: string | null;
  eventos: number;
  cobrancas: number;
  novas: number;
  atualizadas: number;
  inadimplentes: number;
  sincronizadoEm?: string | null;
  carteiras: CarteiraAgendaEdu[];
  origem?: string | null;
}

/** O que uma rota do EduPay respondeu. Usado para achar onde mora a cobrança recorrente. */
export interface RotaSondada {
  caminho: string;
  status: number;
  itens: number;
  observacao?: string | null;
}

export interface DiagnosticoAgendaEdu {
  configurado: boolean;
  erro?: string | null;
  carteiras: CarteiraAgendaEdu[];
  rotas: RotaSondada[];
}

const CHAVE = ["agenda-edu", "inadimplencia"];

/**
 * Inadimplência lida do Agenda Edu.
 *
 * Recarrega a cada 5 minutos com a tela aberta: o servidor relê o Agenda Edu a cada 15, e quem
 * deixa a tela aberta para cobrar vê a lista encolher conforme as famílias pagam, sem precisar
 * recarregar a página.
 */
export function useInadimplenciaAgendaEdu() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async () => {
      const result = await coreApi.GET("/api/AgendaEdu/inadimplencia", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar a inadimplência do Agenda Edu.");
      return data as unknown as InadimplenciaAgendaEdu;
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

/** Lê as cobranças do Agenda Edu agora, sem esperar o próximo ciclo de 15 minutos. */
export function useSincronizarCobrancasAgendaEdu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await coreApi.POST("/api/AgendaEdu/cobrancas/sincronizar", {});
      const data = unwrapApiResponse(result, "Não foi possível ler as cobranças do Agenda Edu.");
      return data as unknown as ResultadoSincronizacao;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

/**
 * Carteiras da escola e o que cada rota do EduPay responde.
 *
 * Só busca quando a pessoa abre o diagnóstico: são várias chamadas ao Agenda Edu, e isso não tem
 * por que acontecer toda vez que alguém abre a tela de inadimplência.
 */
export function useDiagnosticoAgendaEdu(aberto: boolean) {
  return useQuery({
    queryKey: ["agenda-edu", "diagnostico"],
    enabled: aberto,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const result = await coreApi.GET("/api/AgendaEdu/cobrancas/diagnostico", {});
      const data = unwrapApiResponse(result, "Não foi possível diagnosticar a integração.");
      return data as unknown as DiagnosticoAgendaEdu;
    },
  });
}
