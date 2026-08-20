import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface FormAutomationDto {
  id: string;
  tenantId: string;
  formId: string;
  nome: string | null;
  evento: string | null; // "Quando" — texto livre
  acao: string | null; // "Então" — texto livre
  config: string | null;
  ativo: boolean;
}

export function useFormAutomations(formId: string) {
  return useQuery({
    queryKey: ["form-automations", formId],
    queryFn: async () => {
      const result = await flowApi.GET("/api/forms/{formId}/automations", {
        params: { path: { formId } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as automações.");
      return (data ?? []) as unknown as FormAutomationDto[];
    },
  });
}

export function useCreateAutomation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; evento: string; acao: string }) => {
      const result = await flowApi.POST("/api/forms/{formId}/automations", {
        params: { path: { formId } },
        body: { formId, nome: input.nome, evento: input.evento, acao: input.acao, ativo: true, config: null },
      });
      unwrapApiResponse(result, "Não foi possível criar a regra.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-automations", formId] }),
  });
}

export function useToggleAutomation(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (automation: FormAutomationDto) => {
      const result = await flowApi.PUT("/api/forms/{formId}/automations/{id}", {
        params: { path: { formId, id: automation.id } },
        body: { ...automation, ativo: !automation.ativo },
      });
      unwrapApiResponse(result, "Não foi possível atualizar a regra.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-automations", formId] }),
  });
}
