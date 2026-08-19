import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// SimNao = checkbox comum, Contagem = resposta numérica (CountValue em
// ChecklistResponseItem). String solta, mesmo padrão de Attendance.Status.
export type ChecklistItemTipo = "SimNao" | "Contagem";

export interface ChecklistItemDto {
  id: number;
  checklistTemplateId: number;
  description: string;
  order: number;
  tipo: ChecklistItemTipo;
  ativo: boolean;
}

export interface ChecklistTemplateDto {
  id: number;
  name: string;
  items: ChecklistItemDto[];
  templateClasses: { classId: number }[];
}

export interface ChecklistFillItemDto {
  id: number;
  description: string;
  tipo: ChecklistItemTipo;
  order: number;
  isChecked: boolean;
  countValue: number | null;
  checkedAt: string | null;
}

export interface ChecklistFillDto {
  checklistId: number;
  classId: number;
  date: string;
  responseId: number | null;
  items: ChecklistFillItemDto[];
}

const BASE = "/api/ClassroomChecklist";

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

// ---- Templates (R3) ----

export function useChecklistTemplates() {
  return useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const result = await tasksApi.GET(`${BASE}/checklists`);
      const data = unwrapApiResponse(result, "Não foi possível carregar os checklists.");
      return (data ?? []) as unknown as ChecklistTemplateDto[];
    },
  });
}

export function useChecklistTemplatesForClass(classId: number | null) {
  return useQuery({
    queryKey: ["checklist-templates", "by-class", classId],
    queryFn: async () => {
      const result = await tasksApi.GET(`${BASE}/classes/{classId}/checklists`, {
        params: { path: { classId: classId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os checklists da turma.");
      return (data ?? []) as unknown as ChecklistTemplateDto[];
    },
    enabled: classId !== null,
  });
}

export function useSaveChecklistTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; name: string }) => {
      if (input.id) {
        const result = await tasksApi.PUT(`${BASE}/checklists/{id}`, {
          params: { path: { id: input.id } },
          body: { id: input.id, name: input.name },
        });
        unwrapApiResponse(result, "Não foi possível salvar o checklist.");
      } else {
        const result = await tasksApi.POST(`${BASE}/checklists`, { body: { name: input.name } });
        unwrapApiResponse(result, "Não foi possível criar o checklist.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

export function useSetChecklistClasses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistId, classIds }: { checklistId: number; classIds: number[] }) => {
      const result = await tasksApi.PUT(`${BASE}/checklists/{id}/classes`, {
        params: { path: { id: checklistId } },
        body: classIds,
      });
      unwrapApiResponse(result, "Não foi possível salvar as turmas do checklist.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await tasksApi.DELETE(`${BASE}/checklists/{id}`, { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o checklist.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

// ---- Itens (R3) ----

export function useSaveChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: number;
      checklistTemplateId: number;
      description: string;
      tipo: ChecklistItemTipo;
      ativo: boolean;
    }) => {
      if (input.id) {
        const result = await tasksApi.PUT(`${BASE}/checklists/items/{itemId}`, {
          params: { path: { itemId: input.id } },
          body: {
            id: input.id,
            checklistTemplateId: input.checklistTemplateId,
            description: input.description,
            tipo: input.tipo,
            ativo: input.ativo,
          },
        });
        unwrapApiResponse(result, "Não foi possível salvar o item.");
      } else {
        const result = await tasksApi.POST(`${BASE}/checklists/{checklistId}/items`, {
          params: { path: { checklistId: input.checklistTemplateId } },
          body: { description: input.description, tipo: input.tipo, ativo: input.ativo },
        });
        unwrapApiResponse(result, "Não foi possível criar o item.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

export function useReorderChecklistItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistId, orderedItemIds }: { checklistId: number; orderedItemIds: number[] }) => {
      const result = await tasksApi.PUT(`${BASE}/checklists/{checklistId}/items/reorder`, {
        params: { path: { checklistId } },
        body: orderedItemIds,
      });
      unwrapApiResponse(result, "Não foi possível reordenar os itens.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: number) => {
      const result = await tasksApi.DELETE(`${BASE}/checklists/items/{itemId}`, {
        params: { path: { itemId } },
      });
      unwrapApiResponse(result, "Não foi possível excluir o item.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates"] }),
  });
}

// ---- Preenchimento (R4) ----

export function useChecklistFill(checklistId: number | null, classId: number | null, date: Date) {
  const dateParam = toDateParam(date);
  return useQuery({
    queryKey: ["checklist-fill", checklistId, classId, dateParam],
    queryFn: async () => {
      const result = await tasksApi.GET(`${BASE}/checklists/{checklistId}/fill`, {
        params: { path: { checklistId: checklistId! }, query: { classId: classId!, date: dateParam } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o checklist.");
      return data as unknown as ChecklistFillDto;
    },
    enabled: checklistId !== null && classId !== null,
  });
}

export interface SubmitChecklistInput {
  checklistTemplateId: number;
  classId: number;
  date: string; // YYYY-MM-DD
  responsible: string;
  items: { checklistItemId: number; isChecked: boolean; countValue: number | null }[];
}

export function useSubmitChecklistResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitChecklistInput) => {
      const result = await tasksApi.POST(`${BASE}/responses`, {
        body: {
          checklistTemplateId: input.checklistTemplateId,
          classId: input.classId,
          responsible: input.responsible,
          inspectionDate: input.date,
          responseItems: input.items.map((i) => ({
            checklistItemId: i.checklistItemId,
            isChecked: i.isChecked,
            countValue: i.countValue,
          })),
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o checklist.");
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["checklist-fill", input.checklistTemplateId, input.classId, input.date],
      });
    },
  });
}
