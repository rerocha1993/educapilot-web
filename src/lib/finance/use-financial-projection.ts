import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface MonthlySummaryDto {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  totalReceitasPlanejadas: number;
  totalReceitasRecebidas: number;
  totalReceitasVencidas: number;
  totalDespesasPagas: number;
  totalDespesasPendentes: number;
  totalDespesasVencidas: number;
  mes: number;
  ano: number;
}

export function useMonthlySummary(mes: number, ano: number) {
  return useQuery({
    queryKey: ["financial-summary", mes, ano],
    queryFn: async () => {
      const result = await financeApi.GET("/api/FinancialProjection/monthly-summary", {
        params: { query: { mes, ano } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o resumo financeiro.");
      return data as unknown as MonthlySummaryDto;
    },
  });
}

// GET .../series é endpoint novo (ver educaPilot-core) — não existia agregação
// multi-mês antes, só um mês por vez.
export function useFinancialSeries(startMonth: number, startYear: number, months = 6) {
  return useQuery({
    queryKey: ["financial-series", startMonth, startYear, months],
    queryFn: async () => {
      const result = await financeApi.GET("/api/FinancialProjection/series", {
        params: { query: { startMonth, startYear, months } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar a série financeira.");
      return (data ?? []) as unknown as MonthlySummaryDto[];
    },
  });
}
