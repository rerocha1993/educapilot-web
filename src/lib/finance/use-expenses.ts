import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// ExpenseType: Custo=1, Despesa=2, Investimento=3
export const EXPENSE_CATEGORIES = [
  { value: 1, label: "Custo" },
  { value: 2, label: "Despesa" },
  { value: 3, label: "Investimento" },
] as const;

export interface ExpenseDto {
  id: string;
  nome: string;
  tipo: string | null;
  subcategoria: string | null;
  descricao: string | null;
  categoria: number;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  statusPagamento: string; // "Pendente" | "Pago" | "Vencido" (Vencido nunca é setado pelo backend)
  centroCusto: string | null;
  competenciaMes: number;
  competenciaAno: number;
}

export function useExpensesByMonth(month: number, year: number) {
  return useQuery({
    queryKey: ["expenses", month, year],
    queryFn: async () => {
      const result = await financeApi.GET("/api/Expenses", { params: { query: { month, year } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar as despesas.");
      return (data ?? []) as unknown as ExpenseDto[];
    },
  });
}

export interface CreateExpenseInput {
  nome: string;
  descricao?: string;
  categoria: number;
  subcategoria?: string;
  valor: number;
  dataVencimento: string;
  centroCusto?: string;
  competenciaMes: number;
  competenciaAno: number;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const result = await financeApi.POST("/api/Expenses", {
        body: { ...input, moeda: "BRL", statusPagamento: "Pendente" },
      });
      unwrapApiResponse(result, "Não foi possível criar a despesa.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dataPagamento }: { id: string; dataPagamento: string }) => {
      const result = await financeApi.PUT("/api/Expenses/confirmar-pagamento/{id}", {
        params: { path: { id } },
        body: { dataPagamento },
      });
      unwrapApiResponse(result, "Não foi possível confirmar o pagamento.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
