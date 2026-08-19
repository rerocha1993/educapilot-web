import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface WeeklyObservationDto {
  id: number;
  classId: number;
  weekOfMonth: number;
  weeklyObservation: string | null;
  createdAt: string;
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateParam(start), end: toDateParam(end) };
}

export function useWeeklyObservations(classId: number | null) {
  const { start, end } = monthRange(new Date());
  return useQuery({
    queryKey: ["weekly-observations", classId, start, end],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Occurrence/class/{classId}/weekly-reports", {
        params: { path: { classId: classId! }, query: { startDate: start, endDate: end } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as observações semanais.");
      return (data ?? []) as unknown as WeeklyObservationDto[];
    },
    enabled: classId !== null,
  });
}

export function useSendWeeklyObservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { classId: number; weekOfMonth: number; weeklyObservation: string }) => {
      const result = await tasksApi.POST("/api/Occurrence/weekly-report", {
        body: {
          classId: input.classId,
          weekOfMonth: input.weekOfMonth,
          weeklyObservation: input.weeklyObservation,
          isWeeklyReport: true,
        },
      });
      unwrapApiResponse(result, "Não foi possível enviar a observação semanal.");
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["weekly-observations", input.classId] });
    },
  });
}
