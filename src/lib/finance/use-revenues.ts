import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export const REVENUE_CATEGORIES = [
  { value: 1, label: "Mensalidade" },
  { value: 2, label: "Patrocínio" },
  { value: 3, label: "Evento" },
  { value: 4, label: "Investimento" },
  { value: 5, label: "Verba pública" },
  { value: 99, label: "Outro" },
] as const;

export const REVENUE_STATUS = [
  { value: 1, label: "Planejado" },
  { value: 2, label: "Recebido" },
  { value: 3, label: "Vencido" },
  { value: 4, label: "Cancelado" },
] as const;

const STATUS_LABEL: Record<number, string> = Object.fromEntries(REVENUE_STATUS.map((s) => [s.value, s.label]));
const CATEGORY_LABEL: Record<number, string> = Object.fromEntries(REVENUE_CATEGORIES.map((c) => [c.value, c.label]));
export function revenueStatusLabel(status: number) {
  return STATUS_LABEL[status] ?? "—";
}
export function revenueCategoryLabel(category: number) {
  return CATEGORY_LABEL[category] ?? "—";
}

export interface RevenueEntryDto {
  id: string;
  description: string | null;
  origin: number;
  status: number;
  category: number;
  costCenter: string | null;
  expectedAmount: number;
  receivedAmount: number;
  dueDate: string;
  paymentDate: string | null;
  competencyMonth: number;
  competencyYear: number;
  paymentMethod: number;
  notes: string | null;
}

export function useRevenuesByMonth(month: number, year: number) {
  return useQuery({
    queryKey: ["revenues", month, year],
    queryFn: async () => {
      const result = await financeApi.GET("/api/RevenueEntries", { params: { query: { month, year } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar as receitas.");
      return (data ?? []) as unknown as RevenueEntryDto[];
    },
  });
}

export interface CreateRevenueInput {
  description: string;
  category: number;
  costCenter?: string;
  expectedAmount: number;
  dueDate: string;
  competencyMonth: number;
  competencyYear: number;
}

export function useCreateRevenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRevenueInput) => {
      const result = await financeApi.POST("/api/RevenueEntries", {
        body: {
          ...input,
          category: input.category as 1 | 2 | 3 | 4 | 5 | 99,
          origin: 1, // Manual
          status: 1, // Planejado
          receivedAmount: 0,
          currency: "BRL",
          paymentMethod: 1, // Pix (default; sem seletor específico neste primeiro corte)
        },
      });
      unwrapApiResponse(result, "Não foi possível criar a receita.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["revenues"] }),
  });
}

// Não existe endpoint dedicado de "marcar como recebido" (só Expense tem
// confirmar-pagamento) — reenvia a entrada inteira via PUT, único caminho que o
// backend expõe pra RevenueEntry.
export function useMarkRevenueReceived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: RevenueEntryDto) => {
      const result = await financeApi.PUT("/api/RevenueEntries/{id}", {
        params: { path: { id: entry.id } },
        body: {
          description: entry.description,
          origin: entry.origin as 1 | 2 | 3 | 4 | 5 | 99,
          status: 2, // Recebido
          category: entry.category as 1 | 2 | 3 | 4 | 5 | 99,
          costCenter: entry.costCenter,
          expectedAmount: entry.expectedAmount,
          receivedAmount: entry.expectedAmount,
          dueDate: entry.dueDate,
          paymentDate: new Date().toISOString(),
          currency: "BRL",
          competencyMonth: entry.competencyMonth,
          competencyYear: entry.competencyYear,
          paymentMethod: entry.paymentMethod as 1 | 2 | 3 | 4 | 5 | 99,
          notes: entry.notes,
        },
      });
      unwrapApiResponse(result, "Não foi possível confirmar o recebimento.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["revenues"] }),
  });
}
