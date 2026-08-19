import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Chips de categoria única do wireframe R8 — não existiam no backend antes desta
// sessão (campo Occurrence.Categoria, string solta, sem enum).
export const OCCURRENCE_CATEGORIES = ["Comportamento", "Saúde", "Pedagógica", "Atraso"] as const;
export type OccurrenceCategoria = (typeof OCCURRENCE_CATEGORIES)[number];

export interface CreateOccurrenceInput {
  childId: number;
  classId: number;
  categoria: OccurrenceCategoria;
  observation: string;
  parentsNotified: boolean;
}

export function useCreateOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOccurrenceInput) => {
      const result = await tasksApi.POST("/api/Occurrence", {
        body: {
          childId: input.childId,
          classId: input.classId,
          categoria: input.categoria,
          observation: input.observation,
          parentsNotified: input.parentsNotified,
        },
      });
      unwrapApiResponse(result, "Não foi possível registrar a ocorrência.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["occurrences-report"] });
    },
  });
}

export interface OccurrenceReportDto {
  startDate: string;
  endDate: string;
  byClass: { classId: number; className: string; count: number }[];
  topStudents: {
    studentId: number;
    studentName: string;
    classId: number;
    className: string | null;
    count: number;
    topCategoria: OccurrenceCategoria;
  }[];
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function useOccurrencesReport(startDate: Date, endDate: Date) {
  const start = toDateParam(startDate);
  const end = toDateParam(endDate);
  return useQuery({
    queryKey: ["occurrences-report", start, end],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Occurrence/report", {
        params: { query: { startDate: start, endDate: end } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o relatório.");
      return data as unknown as OccurrenceReportDto;
    },
  });
}
