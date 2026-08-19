import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// "Justificada" é convenção de aplicação (frontend): Reason vazio ou igual ao
// placeholder que a Chamada (R1) manda automaticamente ("Não informado") conta
// como não justificada. O backend não tem um campo de status separado.
export const UNJUSTIFIED_REASON = "Não informado";

export interface AbsenceDto {
  id: number;
  attendanceId: number;
  reason: string;
  createdAt: string;
  attendanceDate: string;
  attendance?: {
    id: number;
    classId: number;
    studentId: number;
    status: string;
    student?: { id: number; fullName: string };
    class?: { id: number; className: string };
  };
}

export function useAbsences() {
  return useQuery({
    queryKey: ["absences"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Absence");
      const data = unwrapApiResponse(result, "Não foi possível carregar as faltas.");
      return (data ?? []) as unknown as AbsenceDto[];
    },
  });
}

export function useJustifyAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      attendanceId,
      reason,
    }: {
      id: number;
      attendanceId: number;
      reason: string;
    }) => {
      const result = await tasksApi.PUT("/api/Absence/{id}", {
        params: { path: { id } },
        body: { id, attendanceId, reason },
      });
      unwrapApiResponse(result, "Não foi possível registrar a justificativa.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });
}
