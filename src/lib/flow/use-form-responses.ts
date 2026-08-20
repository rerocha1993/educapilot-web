import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

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

// Novo (2026-08): exportação (item 5 do gap analysis). GET /api/FormResponses/{id}/export
// é [ApiExplorerSettings(IgnoreApi = true)] (download binário) — fetch cru, sem tipo
// gerado, mesmo padrão do resto do arquivo de upload/import.
export function useExportResponses(formId: string) {
  return useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/FormResponses/${formId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error("Não foi possível exportar as respostas.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "respostas.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}
