import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Chips de categoria única do wireframe R8 — não existiam no backend antes desta
// sessão (campo Occurrence.Categoria, string solta, sem enum).
export const OCCURRENCE_CATEGORIES = ["Comportamento", "Saúde", "Pedagógica", "Atraso"] as const;
export type OccurrenceCategoria = (typeof OCCURRENCE_CATEGORIES)[number];

// Novo (2026-08, feedback do cliente) — registra a MESMA ocorrência (descrição/
// categoria/solução) pra vários alunos envolvidos de uma vez, um item por aluno, via
// POST /api/Occurrence/bulk (já existia no backend, mas nunca fazia o enriquecimento
// de professor/semana — corrigido junto com esta mudança, ver OccurrenceController).
export interface CreateOccurrencesInput {
  childIds: number[];
  classId: number;
  categoria: OccurrenceCategoria;
  observation: string;
  solution?: string;
  parentsNotified: boolean;
}

export function useCreateOccurrences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOccurrencesInput) => {
      const result = await tasksApi.POST("/api/Occurrence/bulk", {
        body: input.childIds.map((childId) => ({
          childId,
          classId: input.classId,
          categoria: input.categoria,
          observation: input.observation,
          solution: input.solution || null,
          parentsNotified: input.parentsNotified,
        })),
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

// Novo (2026-08, feedback do cliente) — filtro de turma no relatório (backend já
// aceita ?classId= opcional, ver OccurrenceController.GetReport).
export function useOccurrencesReport(startDate: Date, endDate: Date, classId: number | null) {
  const start = toDateParam(startDate);
  const end = toDateParam(endDate);
  return useQuery({
    queryKey: ["occurrences-report", start, end, classId],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Occurrence/report", {
        params: { query: { startDate: start, endDate: end, classId: classId ?? undefined } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o relatório.");
      return data as unknown as OccurrenceReportDto;
    },
  });
}

// Novo (2026-09, feedback do cliente) — "tem uma ocorrência pra Caterina, mas cade a
// ocorrência? precisa aparecer": o relatório só mostrava contagem agregada, sem
// jeito de ver o que de fato foi registrado. Reaproveita GET /api/Occurrence/
// student/{studentId} (já existia, nunca era usado no frontend) pra listar as
// ocorrências reais de um aluno quando clica no nome dele no relatório.
export interface OccurrenceDetailDto {
  id: number;
  categoria: OccurrenceCategoria;
  observation: string | null;
  solution: string | null;
  parentsNotified: boolean;
  createdAt: string;
}

export function useOccurrencesByStudent(studentId: number | null) {
  return useQuery({
    queryKey: ["occurrences-by-student", studentId],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Occurrence/student/{studentId}", {
        params: { path: { studentId: studentId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as ocorrências do aluno.");
      return (data ?? []) as unknown as OccurrenceDetailDto[];
    },
    enabled: studentId !== null,
  });
}
