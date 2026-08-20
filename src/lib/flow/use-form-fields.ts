import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import type { FormFieldDto } from "./use-forms";

// Ampliado (2026-08, item 1 do gap analysis de Formulários): a coluna Opcoes existia
// no schema desde sempre mas nunca era usada — "selecao" era o único tipo que se
// aproximava de escolha, e mesmo assim só servia pra vincular a uma tabela de
// referência (Config.tabelaReferencia), nunca a uma lista estática de opções.
// Agora "selecao"/"checkbox"/"dropdown" usam Opcoes de verdade (array JSON de
// strings), "numero"/"avaliacao" ganham validação de faixa via Config, e todo campo
// pode ter lógica condicional (Config.visibleIf) — ver decodeFieldConfig abaixo.
export const FIELD_TYPES = [
  { value: "texto_curto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "sim_nao", label: "Sim/Não" },
  { value: "selecao", label: "Múltipla escolha (uma opção)" },
  { value: "checkbox", label: "Caixas de seleção (várias opções)" },
  { value: "dropdown", label: "Lista suspensa" },
  { value: "avaliacao", label: "Avaliação (escala)" },
  { value: "anexo", label: "Anexo" },
  { value: "referencia", label: "Dado de referência" },
] as const;

// Tipos cuja UI de edição precisa de um editor de opções estáticas (Opcoes).
export const CHOICE_FIELD_TYPES = ["selecao", "checkbox", "dropdown"] as const;

export function fieldTypeLabel(tipo: string) {
  return FIELD_TYPES.find((t) => t.value === tipo)?.label ?? tipo;
}

export interface VisibleIfConfig {
  fieldId: string;
  operator: "equals" | "not_equals" | "filled" | "not_filled";
  value?: string;
}

export interface FieldConfig {
  tabelaReferencia?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  maxEstrelas?: number;
  visibleIf?: VisibleIfConfig;
}

// "Fonte de dados" (F1) não tem endpoint próprio de vínculo — o mecanismo dedicado
// (FormFieldReferenceBindingService) existe no backend mas nenhum controller o expõe.
// Guardamos a tabela escolhida (e agora min/max/minLength/maxLength/maxEstrelas/
// visibleIf) dentro de FormField.Config (coluna JSON livre já existente).
export function encodeFieldConfig(config: FieldConfig): string | null {
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  );
  if (Object.keys(cleaned).length === 0) return null;
  return JSON.stringify(cleaned);
}
export function decodeFieldConfig(config: string | null | undefined): FieldConfig {
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

// Opcoes (lista de escolhas) é sempre um array JSON de strings — mesmo formato usado
// pro Valor de um item de campo "checkbox" (ver use-form-fill.ts).
export function encodeOpcoes(opcoes: string[]): string | null {
  const cleaned = opcoes.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}
export function decodeOpcoes(opcoes: string | null | undefined): string[] {
  if (!opcoes) return [];
  try {
    const parsed = JSON.parse(opcoes);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
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
      opcoes?: string | null;
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
          opcoes: input.opcoes ?? null,
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
