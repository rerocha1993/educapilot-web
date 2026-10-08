import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { financeiroJson } from "./financeiro-api";
import { invalidarFinanceiro } from "./invalidar-financeiro";

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

  /** Conta em que a receita cai (fase 1 do financeiro). */
  bancoContaId?: string | null;

  // F5 (2026-10): baixa com valor real. receivedAmount = expectedAmount + juros + multa - desconto.
  juros?: number | null;
  multa?: number | null;
  desconto?: number | null;
  /** noDia, antecipado ou atrasado; nulo sem pagamento. */
  situacaoDoPagamento?: "noDia" | "antecipado" | "atrasado" | null;
  diasDeAtraso?: number | null;
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

  // Fase 1 do financeiro: conta, plano de contas e centro de custo cadastrados. Ainda não
  // estão nos tipos gerados do Swagger — como o corpo é montado por spread, o TypeScript não
  // reclama de propriedade a mais, e o backend já lê os três.
  bancoContaId?: string | null;
  categoriaFinanceiraId?: string | null;
  centroDeCustoId?: string | null;
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

/** Corpo de POST /api/RevenueEntries/{id}/baixar. A divisão vai explícita quando o valor difere. */
export interface BaixaDaReceita {
  /** aaaa-mm-dd; não pode ser futura. */
  dataPagamento: string;
  valorRecebido?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceiraId?: string;
  /** Dinheiro, Pix, Boleto, CartaoCredito, CartaoDebito, Transferencia ou Outro. */
  metodoPagamento?: string;
}

// Rotas novas (F5), fora dos tipos gerados do Swagger: fetch cru. O PUT não marca mais recebido.
export function useBaixarReceita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...baixa }: BaixaDaReceita & { id: string }) =>
      financeiroJson<RevenueEntryDto>(
        `/api/RevenueEntries/${id}/baixar`,
        { method: "POST", body: JSON.stringify(baixa) },
        "Não foi possível registrar o recebimento."
      ),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

/** Reabrir a receita reabre também a cobrança ligada a ela, inclusive paga pelo Asaas. */
export function useReabrirReceita() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      financeiroJson<RevenueEntryDto>(`/api/RevenueEntries/${id}/reabrir`, { method: "POST" }, "Não foi possível reabrir a receita."),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}
