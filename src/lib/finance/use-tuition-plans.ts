import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface TuitionPlanDto {
  id: string;
  studentId: number;
  studentName: string | null;
  guardianId: string;
  guardianName: string | null;
  valorMensal: number;
  diaVencimento: number;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  gerarCobrancaAsaas: boolean;
}

export function useTuitionPlans() {
  return useQuery({
    queryKey: ["tuition-plans"],
    queryFn: async () => {
      const result = await financeApi.GET("/api/TuitionPlans");
      const data = unwrapApiResponse(result, "Não foi possível carregar os planos de mensalidade.");
      return (data ?? []) as unknown as TuitionPlanDto[];
    },
  });
}

export interface SaveTuitionPlanInput {
  id?: string;
  studentId: number;
  guardianId: string;
  valorMensal: number;
  diaVencimento: number;
  dataInicio: string;
  dataFim?: string | null;
  ativo?: boolean;
  gerarCobrancaAsaas: boolean;
}

export function useSaveTuitionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTuitionPlanInput) => {
      const body = {
        studentId: input.studentId,
        guardianId: input.guardianId,
        valorMensal: input.valorMensal,
        diaVencimento: input.diaVencimento,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim ?? null,
        ativo: input.ativo ?? true,
        gerarCobrancaAsaas: input.gerarCobrancaAsaas,
      };
      if (input.id) {
        const result = await financeApi.PUT("/api/TuitionPlans/{id}", { params: { path: { id: input.id } }, body });
        unwrapApiResponse(result, "Não foi possível salvar o plano.");
      } else {
        const result = await financeApi.POST("/api/TuitionPlans", { body });
        unwrapApiResponse(result, "Não foi possível criar o plano.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tuition-plans"] }),
  });
}

export function useDeleteTuitionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await financeApi.DELETE("/api/TuitionPlans/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível remover o plano.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tuition-plans"] }),
  });
}

// Botão "Gerar agora" — sem [ProducesResponseType] no backend (content?: never),
// mesmo padrão de desembrulho manual do resto da sessão.
export function useGerarMensalidades() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mes, ano }: { mes: number; ano: number }) => {
      const result = await financeApi.POST("/api/TuitionPlans/gerar", {
        params: { query: { mes, ano } },
      });
      if (!result.response.ok || result.error) {
        const body = result.error as { message?: string } | undefined;
        throw new Error(body?.message ?? "Não foi possível gerar as mensalidades.");
      }
      return result.data as unknown as { gerados: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["tuition-plans"] });
    },
  });
}
