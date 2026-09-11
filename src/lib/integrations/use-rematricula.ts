import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi, flowApi } from "../api/client";
import { unwrapApiResponse } from "../api/unwrap";

// Rematrícula (2026-09) — dois grupos de chamadas com regras bem diferentes, no mesmo arquivo
// porque falam do mesmo assunto:
//
// - as PÚBLICAS (`flowApi`, rota /api/PublicForms/{token}/...) rodam sem login, na página que o
//   responsável abre pelo link. O tenant sai do token do formulário, nunca do cliente.
// - as ADMINISTRATIVAS (`coreApi`, rota /api/Rematricula/...) exigem sessão e configuram a
//   progressão de turma da escola.

export interface TurmaPublica {
  id: number;
  nome: string;
}

export interface DadosRematricula {
  encontrado: boolean;
  /** Por que não achou, em linguagem que ajuda a corrigir. */
  mensagem?: string | null;
  nomeAluno?: string | null;
  dataNascimentoAluno?: string | null;
  turmaAtual?: string | null;
  /** Turma do ano seguinte, pela progressão configurada. */
  turmaProximoAno?: string | null;
  nomeResponsavel?: string | null;
  cpfResponsavel?: string | null;
  emailResponsavel?: string | null;
  telefoneResponsavel?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numeroEndereco?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  valorAtual?: number | null;
  percentualReajuste?: number | null;
  /** Já calculado no servidor — o formulário só exibe. */
  valorProximoAno?: number | null;
  /** 12 mensalidades do próximo ano, calculada no servidor. */
  valorAnuidade?: number | null;
  diaVencimento?: number | null;
}

export function useTurmasPublicas(token: string | undefined) {
  return useQuery({
    queryKey: ["public-form", token, "turmas"],
    enabled: !!token,
    queryFn: async () => {
      const result = await flowApi.GET("/api/PublicForms/{token}/turmas", {
        params: { path: { token: token! } },
      });
      // Sem unwrapApiResponse: aqui um erro não deve quebrar a página. Sem a lista, o
      // preenchimento automático simplesmente não aparece e o responsável digita tudo.
      if (!result.response.ok || result.error) return [] as TurmaPublica[];
      return (result.data ?? []) as unknown as TurmaPublica[];
    },
  });
}

export interface BuscaAlunoInput {
  nome: string;
  /** ISO (yyyy-MM-dd) vindo de um <input type="date">. */
  dataNascimento: string;
  classId: number;
}

export function useBuscarRematricula(token: string) {
  return useMutation({
    mutationFn: async (input: BuscaAlunoInput) => {
      const result = await flowApi.POST("/api/PublicForms/{token}/rematricula/buscar", {
        params: { path: { token } },
        body: {
          nome: input.nome,
          dataNascimento: input.dataNascimento,
          classId: input.classId,
        },
      });
      if (!result.response.ok || result.error) {
        throw new Error("Não foi possível consultar agora. Tente novamente em instantes.");
      }
      return result.data as unknown as DadosRematricula;
    },
  });
}

export interface ClassProgression {
  classOrigemId: number;
  turmaOrigem?: string | null;
  /** Nulo = turma final: os alunos se formam em vez de passar para outra. */
  classDestinoId?: number | null;
  turmaDestino?: string | null;
}

export function useProgressoes() {
  return useQuery({
    queryKey: ["rematricula", "progressoes"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/Rematricula/progressoes", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar as progressões de turma.");
      return data as unknown as ClassProgression[];
    },
  });
}

export function useSalvarProgressao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { classOrigemId: number; classDestinoId: number | null }) => {
      const result = await coreApi.PUT("/api/Rematricula/progressoes/{classOrigemId}", {
        params: { path: { classOrigemId: input.classOrigemId } },
        body: { classDestinoId: input.classDestinoId },
      });
      unwrapApiResponse(result, "Não foi possível salvar a progressão.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rematricula", "progressoes"] });
    },
  });
}

export interface PromoverTurmaResult {
  sucesso: boolean;
  erro?: string | null;
  alunosPromovidos: number;
  turmaOrigem?: string | null;
  turmaDestino?: string | null;
}

export function usePromoverTurma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classOrigemId: number) => {
      const result = await coreApi.POST("/api/Rematricula/progressoes/{classOrigemId}/promover", {
        params: { path: { classOrigemId } },
      });
      const data = unwrapApiResponse(result, "Não foi possível promover a turma.");
      return data as unknown as PromoverTurmaResult;
    },
    onSuccess: () => {
      // A promoção muda a turma dos alunos: qualquer lista já carregada ficou desatualizada.
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["rematricula", "progressoes"] });
    },
  });
}
