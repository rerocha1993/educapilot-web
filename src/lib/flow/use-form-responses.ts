import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface FormResponseItemDto {
  id: string;
  responseId: string;
  fieldId: string;
  valor: string | null;
}

export interface FormResponseDto {
  id: string;
  formId: string;
  tenantId: string;
  userId: string | null;
  referenciaId: string | null;
  nomeReferencia: string | null;
  observacoes: string | null;
  status: string; // livre — usamos Pendente/Revisar/Concluída por convenção
  dataPreenchimento: string;
  itens: FormResponseItemDto[] | null;
}

export const RESPONSE_STATUS_BADGE: Record<string, string> = {
  Concluída: "bg-success-soft text-success-soft-foreground",
  Revisar: "bg-warning-soft text-warning-soft-foreground",
  Pendente: "bg-accent text-accent-foreground",
};

export function useFormResponses(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-responses", formId],
    enabled: !!formId,
    queryFn: async () => {
      const result = await flowApi.GET("/api/FormResponses/{formId}", {
        params: { path: { formId: formId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as respostas.");
      return (data ?? []) as unknown as FormResponseDto[];
    },
  });
}

export function useMarkResponseReviewed(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (response: FormResponseDto) => {
      const result = await flowApi.PUT("/api/FormResponses/{formId}/{id}", {
        params: { path: { formId, id: response.id } },
        body: {
          id: response.id,
          formId,
          tenantId: response.tenantId,
          userId: response.userId,
          referenciaId: response.referenciaId,
          nomeReferencia: response.nomeReferencia,
          observacoes: response.observacoes,
          status: "Concluída",
        },
      });
      unwrapApiResponse(result, "Não foi possível marcar como revisada.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-responses", formId] }),
  });
}
