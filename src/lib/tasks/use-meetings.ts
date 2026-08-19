import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Status é string solta no backend, só "Aberto"/"Finalizado" (ver comentário em
// Meeting.cs) — o wireframe R7 tem "Agendada"/"Encerrada"/"Ata pendente", que não
// existem. Sem Pauta nem Participantes no backend também — não fabricados aqui.
export type MeetingStatus = "Aberto" | "Finalizado";

export interface MeetingDto {
  id: number;
  classId: number;
  status: MeetingStatus;
  discussion: string | null;
  summary: string | null;
  createdAt: string;
}

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Meeting");
      const data = unwrapApiResponse(result, "Não foi possível carregar as reuniões.");
      return (data ?? []) as unknown as MeetingDto[];
    },
  });
}

export function useStartMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: number) => {
      const result = await tasksApi.POST("/api/Meeting/start", {
        body: { classId, status: "Aberto" },
      });
      unwrapApiResponse(result, "Não foi possível iniciar a reunião.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export interface UpdateMeetingInput {
  id: number;
  classId: number;
  status: MeetingStatus;
  discussion: string | null;
  summary: string | null;
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMeetingInput) => {
      const result = await tasksApi.PUT("/api/Meeting/{id}", {
        params: { path: { id: input.id } },
        body: input,
      });
      unwrapApiResponse(result, "Não foi possível salvar a ata.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useCloseMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMeetingInput) => {
      const result = await tasksApi.PUT("/api/Meeting/end", {
        body: { ...input, status: "Finalizado" },
      });
      unwrapApiResponse(result, "Não foi possível encerrar a reunião.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
