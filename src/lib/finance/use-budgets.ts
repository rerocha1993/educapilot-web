import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Espelha SharedKernel.Enums.RevenueCategory/ExpenseType do backend — Categoria é um
// int genérico que significa uma coisa ou outra dependendo de Tipo (ver comentário em
// Budget.cs).
export const RECEITA_CATEGORIES = [
  { value: 1, label: "Mensalidade" },
  { value: 2, label: "Patrocínio" },
  { value: 3, label: "Evento" },
  { value: 4, label: "Investimento" },
  { value: 5, label: "Verba pública" },
  { value: 99, label: "Outro" },
] as const;

export const DESPESA_CATEGORIES = [
  { value: 1, label: "Custo" },
  { value: 2, label: "Despesa" },
  { value: 3, label: "Investimento" },
] as const;

export interface BudgetDto {
  id: string;
  ano: number;
  mes: number | null;
  tipo: "Receita" | "Despesa";
  categoria: number;
  categoriaLabel: string | null;
  valorPlanejado: number;
}

export interface BudgetComparativoDto {
  tipo: "Receita" | "Despesa";
  categoria: number;
  categoriaLabel: string;
  planejado: number;
  realizado: number;
  variacao: number;
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
  categoria: number;
  valorPlanejado: number;
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const result = await financeApi.POST("/api/Budgets", {
        body: { ano: input.ano, mes: input.mes ?? null, tipo: input.tipo, categoria: input.categoria, valorPlanejado: input.valorPlanejado },
      });
      unwrapApiResponse(result, "Não foi possível criar o orçamento.");
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
