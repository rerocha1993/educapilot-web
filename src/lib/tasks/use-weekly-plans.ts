import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// O wireframe R11 ("Seminários semanais") descreve cards com tema/responsável/
// local/status — mas o backend "WeeklySeminar" é, na prática, um PLANEJAMENTO
// SEMANAL pedagógico (objetivos, dever de casa, atividades, desenvolvimento
// socioemocional, materiais), não um evento de seminário. São conceitos
// diferentes: não fabriquei tema/responsável/local/status que não existem —
// construí a tela em cima do que o backend realmente é. Ver MD de entrega.
export type TaskExecutionStatus = "Sim" | "Não" | "Parcial";

export interface WeeklyPlanDto {
  id: number;
  classId: number;
  startDate: string;
  endDate: string;
  generalObjectives: string;
  homework: string;
  notebookActivities: string;
  portfolioActivities: string;
  drawingNotebookActivities: string;
  socialEmotionalDevelopment: string;
  previousWeekTasksExecutionStatus: TaskExecutionStatus | string;
  uncompletedTasks: string;
  requiredMaterials: string;
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
      const result = await tasksApi.GET("/api/WeeklySeminars", {
        params: { query: { classId: classId ?? undefined, startDate: start, endDate: end } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os planejamentos.");
      return (data ?? []) as unknown as WeeklyPlanDto[];
    },
  });
}

export interface SaveWeeklyPlanInput {
  id?: number;
  classId: number;
  startDate: string;
  endDate: string;
  generalObjectives: string;
  homework: string;
  notebookActivities: string;
  portfolioActivities: string;
  drawingNotebookActivities: string;
  socialEmotionalDevelopment: string;
  previousWeekTasksExecutionStatus: TaskExecutionStatus;
  uncompletedTasks: string;
  requiredMaterials: string;
}

// O backend serializa o enum TaskExecutionStatus como número no corpo da
// requisição (Sim=1, Não=2, Parcial=3), mas devolve string na resposta do GET
// (o service já faz .ToString()) — assimetria real da API, não escolha nossa.
const STATUS_TO_NUMBER: Record<TaskExecutionStatus, 1 | 2 | 3> = { Sim: 1, Não: 2, Parcial: 3 };

export function useSaveWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveWeeklyPlanInput) => {
      const body = {
        ...input,
        previousWeekTasksExecutionStatus: STATUS_TO_NUMBER[input.previousWeekTasksExecutionStatus],
      };
      if (input.id) {
        const result = await tasksApi.PUT("/api/WeeklySeminars/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o planejamento.");
      } else {
        const result = await tasksApi.POST("/api/WeeklySeminars", { body });
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
      const result = await tasksApi.DELETE("/api/WeeklySeminars/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o planejamento.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-plans"] }),
  });
}
