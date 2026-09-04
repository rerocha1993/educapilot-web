import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Reescrito (2026-09, feedback do cliente) — "planejamento semanal, isso eu quero
// que criemos o modelo, não pode ser fixo". Antes os campos do planejamento
// (objetivos gerais, dever de casa, atividades...) eram fixos no código, ligados a
// WeeklySeminar. Agora um WeeklyPlanTemplate define os campos (WeeklyPlanField,
// texto livre, ordem, ativo/inativo) e cada preenchimento (WeeklyPlan) guarda um
// valor por campo — mesmo padrão de ChecklistTemplates/ChecklistItem. WeeklySeminar
// não foi apagado (histórico antigo preservado), só deixou de ser o caminho da tela.
export type TaskExecutionStatus = "Sim" | "Não" | "Parcial";

const STATUS_TO_NUMBER: Record<TaskExecutionStatus, 1 | 2 | 3> = { Sim: 1, Não: 2, Parcial: 3 };
const NUMBER_TO_STATUS: Record<number, TaskExecutionStatus> = { 1: "Sim", 2: "Não", 3: "Parcial" };

const BASE = "/api/WeeklyPlan";

export interface WeeklyPlanFieldDto {
  id: number;
  weeklyPlanTemplateId: number;
  label: string;
  order: number;
  ativo: boolean;
}

export interface WeeklyPlanTemplateDto {
  id: number;
  name: string;
  fields: WeeklyPlanFieldDto[];
}

// ---- Modelos (config) ----

export function useWeeklyPlanTemplates() {
  return useQuery({
    queryKey: ["weekly-plan-templates"],
    queryFn: async () => {
      const result = await tasksApi.GET(`${BASE}/templates`);
      const data = unwrapApiResponse(result, "Não foi possível carregar os modelos.");
      return (data ?? []) as unknown as WeeklyPlanTemplateDto[];
    },
  });
}

export function useSaveWeeklyPlanTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; name: string }) => {
      if (input.id) {
        const result = await tasksApi.PUT(`${BASE}/templates/{id}`, {
          params: { path: { id: input.id } },
          body: { id: input.id, name: input.name },
        });
        unwrapApiResponse(result, "Não foi possível salvar o modelo.");
      } else {
        const result = await tasksApi.POST(`${BASE}/templates`, { body: { name: input.name } });
        unwrapApiResponse(result, "Não foi possível criar o modelo.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plan-templates"] }),
  });
}

export function useDeleteWeeklyPlanTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await tasksApi.DELETE(`${BASE}/templates/{id}`, { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o modelo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plan-templates"] }),
  });
}

export function useSaveWeeklyPlanField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: number; templateId: number; label: string; ativo: boolean }) => {
      if (input.id) {
        const result = await tasksApi.PUT(`${BASE}/fields/{fieldId}`, {
          params: { path: { fieldId: input.id } },
          body: { id: input.id, weeklyPlanTemplateId: input.templateId, label: input.label, ativo: input.ativo },
        });
        unwrapApiResponse(result, "Não foi possível salvar o campo.");
      } else {
        const result = await tasksApi.POST(`${BASE}/templates/{templateId}/fields`, {
          params: { path: { templateId: input.templateId } },
          body: { label: input.label, ativo: input.ativo },
        });
        unwrapApiResponse(result, "Não foi possível criar o campo.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plan-templates"] }),
  });
}

export function useReorderWeeklyPlanFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, orderedFieldIds }: { templateId: number; orderedFieldIds: number[] }) => {
      const result = await tasksApi.PUT(`${BASE}/templates/{templateId}/fields/reorder`, {
        params: { path: { templateId } },
        body: orderedFieldIds,
      });
      unwrapApiResponse(result, "Não foi possível reordenar os campos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plan-templates"] }),
  });
}

export function useDeleteWeeklyPlanField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fieldId: number) => {
      const result = await tasksApi.DELETE(`${BASE}/fields/{fieldId}`, { params: { path: { fieldId } } });
      unwrapApiResponse(result, "Não foi possível excluir o campo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plan-templates"] }),
  });
}

// ---- Preenchimentos ----

export interface WeeklyPlanDto {
  id: number;
  weeklyPlanTemplateId: number;
  classId: number;
  startDate: string;
  endDate: string;
  previousWeekTasksExecutionStatus: TaskExecutionStatus;
  weeklyPlanTemplate?: { id: number; name: string };
  fieldValues: { weeklyPlanFieldId: number; value: string; weeklyPlanField?: { label: string } }[];
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function useWeeklyPlans(classId: number | null, startDate: Date, endDate: Date) {
  const start = toDateParam(startDate);
  const end = toDateParam(endDate);
  return useQuery({
    queryKey: ["weekly-plans", classId, start, end],
    queryFn: async () => {
      const result = await tasksApi.GET(`${BASE}/plans`, {
        params: { query: { classId: classId!, startDate: start, endDate: end } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os planejamentos.");
      return ((data ?? []) as unknown[]).map((p) => {
        const plan = p as Record<string, unknown>;
        return {
          ...plan,
          previousWeekTasksExecutionStatus:
            NUMBER_TO_STATUS[plan.previousWeekTasksExecutionStatus as number] ?? "Sim",
        };
      }) as unknown as WeeklyPlanDto[];
    },
    enabled: classId !== null,
  });
}

export interface SaveWeeklyPlanInput {
  id?: number;
  weeklyPlanTemplateId: number;
  classId: number;
  startDate: string;
  endDate: string;
  previousWeekTasksExecutionStatus: TaskExecutionStatus;
  fieldValues: { weeklyPlanFieldId: number; value: string }[];
}

export function useSaveWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveWeeklyPlanInput) => {
      const body = {
        id: input.id ?? 0,
        weeklyPlanTemplateId: input.weeklyPlanTemplateId,
        classId: input.classId,
        startDate: input.startDate,
        endDate: input.endDate,
        previousWeekTasksExecutionStatus: STATUS_TO_NUMBER[input.previousWeekTasksExecutionStatus],
        fieldValues: input.fieldValues,
      };
      if (input.id) {
        const result = await tasksApi.PUT(`${BASE}/plans/{id}`, {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o planejamento.");
      } else {
        const result = await tasksApi.POST(`${BASE}/plans`, { body });
        unwrapApiResponse(result, "Não foi possível criar o planejamento.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plans"] }),
  });
}

export function useDeleteWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await tasksApi.DELETE(`${BASE}/plans/{id}`, { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o planejamento.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plans"] }),
  });
}
