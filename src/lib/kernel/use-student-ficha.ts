import { useQuery } from "@tanstack/react-query";
import { coreApi, tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import type { StudentDto } from "./use-students";

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: ["student", id],
    enabled: id !== null,
    queryFn: async () => {
      const result = await coreApi.GET("/api/Student/{id}", { params: { path: { id: id! } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar o aluno.");
      return data as unknown as StudentDto;
    },
  });
}

export interface StudentOccurrenceDto {
  id: number;
  categoria: string | null;
  observation: string | null;
  parentsNotified: boolean;
  createdAt: string;
  teacher?: { fullName: string } | null;
}

export function useStudentOccurrences(studentId: number | null) {
  return useQuery({
    queryKey: ["student-occurrences", studentId],
    enabled: studentId !== null,
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Occurrence/student/{studentId}", {
        params: { path: { studentId: studentId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as ocorrências.");
      return (data ?? []) as unknown as StudentOccurrenceDto[];
    },
  });
}
