import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import type { FormFieldDto } from "./use-forms";

export const FIELD_TYPES = [
  { value: "texto_curto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "selecao", label: "Seleção" },
  { value: "sim_nao", label: "Sim/Não" },
  { value: "data", label: "Data" },
  { value: "anexo", label: "Anexo" },
  { value: "referencia", label: "Dado de referência" },
] as const;

export function fieldTypeLabel(tipo: string) {
  return FIELD_TYPES.find((t) => t.value === tipo)?.label ?? tipo;
}

// "Fonte de dados" (F1) não tem endpoint próprio de vínculo — o mecanismo dedicado
// (FormFieldReferenceBindingService) existe no backend mas nenhum controller o expõe.
// Guardamos a tabela escolhida dentro de FormField.Config (coluna JSON livre já
// existente, sem schema definido) em vez de fabricar um endpoint novo.
export function encodeFieldConfig(tabelaReferencia?: string): string | null {
  if (!tabelaReferencia) return null;
  return JSON.stringify({ tabelaReferencia });
}
export function decodeFieldConfig(config: string | null): { tabelaReferencia?: string } {
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

export function useCreateFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      label: string;
      tipo: string;
      ordem: number;
      obrigatorio: boolean;
      config?: string | null;
    }) => {
      const result = await flowApi.POST("/api/forms/{formId}/fields", {
        params: { path: { formId } },
        body: {
          formId,
          label: input.label,
          tipo: input.tipo,
          ordem: input.ordem,
          obrigatorio: input.obrigatorio,
          ativo: true,
          config: input.config ?? null,
          opcoes: null,
        },
      });
      unwrapApiResponse(result, "Não foi possível criar o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}

export function useUpdateFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field: FormFieldDto) => {
      const result = await flowApi.PUT("/api/forms/{formId}/fields/{id}", {
        params: { path: { formId, id: field.id } },
        body: {
          id: field.id,
          formId,
          label: field.label,
          tipo: field.tipo,
          ordem: field.ordem,
          obrigatorio: field.obrigatorio,
          ativo: field.ativo,
          config: field.config,
          opcoes: field.opcoes,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}

export function useDeleteFormField(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await flowApi.DELETE("/api/forms/{formId}/fields/{id}", {
        params: { path: { formId, id } },
      });
      unwrapApiResponse(result, "Não foi possível remover o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms", formId] }),
  });
}
