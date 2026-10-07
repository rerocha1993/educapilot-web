import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { ErroDeApi, financeiroJson } from "./financeiro-api";

// F3 (2026-10): o orçamento passou a usar o plano de contas (categoriaFinanceiraId) e, se quiser,
// um centro de custo. O enum `categoria` continua na resposta por compatibilidade, mas a tela não
// o escolhe mais; `categoriaLabel` já vem como "Grupo › Conta".

export interface BudgetDto {
  id: string;
  ano: number;
  mes: number | null;
  tipo: "Receita" | "Despesa";
  categoria: number;
  /** "Grupo › Conta" do plano de contas. */
  categoriaLabel: string | null;
  valorPlanejado: number;
  categoriaFinanceiraId?: string | null;
  centroDeCustoId?: string | null;
  centroDeCustoNome?: string | null;
}

export interface BudgetComparativoDto {
  tipo: "Receita" | "Despesa";
  categoria: number;
  categoriaLabel: string;
  planejado: number;
  realizado: number;
  variacao: number;
  categoriaFinanceiraId?: string | null;
  centroDeCustoId?: string | null;
  centroDeCustoNome?: string | null;
}

export function useBudgets(ano: number) {
  return useQuery({
    queryKey: ["budgets", ano],
    queryFn: async () => {
      const result = await financeApi.GET("/api/Budgets", { params: { query: { ano } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar o orçamento.");
      return (data ?? []) as unknown as BudgetDto[];
    },
  });
}

export function useBudgetComparativo(ano: number, mes?: number) {
  return useQuery({
    queryKey: ["budgets", "comparativo", ano, mes ?? null],
    queryFn: async () => {
      const result = await financeApi.GET("/api/Budgets/comparativo", { params: { query: { ano, mes } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar o comparativo.");
      return (data ?? []) as unknown as BudgetComparativoDto[];
    },
  });
}

export interface CreateBudgetInput {
  ano: number;
  mes?: number | null;
  tipo: "Receita" | "Despesa";
  /** Conta do plano de contas. */
  categoriaFinanceiraId: string;
  centroDeCustoId?: string | null;
  valorPlanejado: number;
}

export const MENSAGEM_DE_ORCAMENTO_REPETIDO =
  "Já existe orçamento dessa categoria neste mês. Apague o que está cadastrado ou importe uma planilha para atualizá-lo.";

// A rota aceita categoriaFinanceiraId, que ainda não está nos tipos gerados do Swagger: fetch cru.
// Chave única (ano, mês, tipo, categoria, centro): repetida volta 409.
export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      try {
        await financeiroJson<unknown>(
          "/api/Budgets",
          {
            method: "POST",
            body: JSON.stringify({
              ano: input.ano,
              mes: input.mes ?? null,
              tipo: input.tipo,
              categoriaFinanceiraId: input.categoriaFinanceiraId,
              centroDeCustoId: input.centroDeCustoId || null,
              valorPlanejado: input.valorPlanejado,
            }),
          },
          "Não foi possível criar o orçamento."
        );
      } catch (err) {
        if (err instanceof ErroDeApi && err.status === 409) throw new Error(MENSAGEM_DE_ORCAMENTO_REPETIDO);
        throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await financeApi.DELETE("/api/Budgets/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível remover o orçamento.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
