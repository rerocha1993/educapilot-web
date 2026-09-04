import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Novo (2026-09, feedback do cliente) — "a tela de reuniões [...] é para ser por
// turma, nela ao selecionar a turma a diretora clica na semana, quando ela clica na
// semana vai trazer relatório de faltas, relatório de ocorrências e de observação
// semanal, um espaço para a diretora descrever como foi a reunião [...] no final
// tudo é salvo pra gerar um relatório pela gestão com indicadores resumidos com
// explosão de descrição e resumos".
//
// O backend de Meeting já existia com quase tudo pronto (confirmado lendo
// MeetingController/MeetingService antes de construir): GET studentClass/{id}/dates
// já junta faltas+ocorrências por aluno no período + os relatórios semanais
// (Occurrence.IsWeeklyReport=true) da turma — exatamente o que a tela pede. Só
// faltava a tela em si consumir isso; nenhuma rota nova precisou ser criada aqui.
export type MeetingStatus = "Aberto" | "Finalizado";

export interface MeetingDto {
  id: number;
  classId: number;
  status: MeetingStatus;
  discussion: string | null;
  summary: string | null;
  createdAt: string;
}

// Meeting não tem endpoint "por turma" — busca tudo (mesmo padrão do backend,
// GetAllMeetingsAsync não pagina "de propósito") e filtra no cliente.
export function useMeetings(classId: number | null) {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Meeting");
      const data = unwrapApiResponse(result, "Não foi possível carregar as reuniões.");
      return (data ?? []) as unknown as MeetingDto[];
    },
    select: (data) => (classId === null ? data : data.filter((m) => m.classId === classId)),
  });
}

export interface MeetingOccurrenceDto {
  id: number;
  description: string | null;
  createdAt: string;
}

export interface MeetingAbsenceDto {
  id: number;
  reason: string | null;
  createdAt: string;
}

export interface MeetingStudentDto {
  id: number;
  fullName: string;
  occurrences: MeetingOccurrenceDto[];
  absences: MeetingAbsenceDto[];
}

export interface MeetingWeeklyReportDto {
  id: number;
  weekOfMonth: number | null;
  weeklyObservation: string | null;
  createdAt: string;
}

export interface MeetingReportDto {
  weeklyReports: MeetingWeeklyReportDto[];
  students: MeetingStudentDto[];
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function useMeetingReport(classId: number | null, startDate: Date, endDate: Date) {
  const start = toDateParam(startDate);
  const end = toDateParam(endDate);
  return useQuery({
    queryKey: ["meeting-report", classId, start, end],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Meeting/studentClass/{classId}/dates", {
        params: { path: { classId: classId! }, query: { startDate: start, endDate: end } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os dados da semana.");
      return data as unknown as MeetingReportDto;
    },
    enabled: classId !== null,
  });
}

export interface SaveMeetingInput {
  id?: number;
  classId: number;
  createdAt: string; // início da semana — chave que identifica a reunião junto com a turma
  status: MeetingStatus;
  discussion: string;
  summary: string | null;
}

export function useSaveMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMeetingInput) => {
      const body = {
        id: input.id,
        classId: input.classId,
        status: input.status,
        discussion: input.discussion,
        summary: input.summary,
        createdAt: input.createdAt,
      };
      if (input.id) {
        const result = await tasksApi.PUT("/api/Meeting/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar a reunião.");
      } else {
        const result = await tasksApi.POST("/api/Meeting/start", { body });
        unwrapApiResponse(result, "Não foi possível iniciar a reunião.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
