import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Reescrito (2026-09, feedback do cliente) — "relatorios precisa cadastrar o tipo de
// relatorio, precisamos bolar o formato". Antes só existia leitura (GET /available) —
// nenhum jeito de criar um tipo pela tela. DataSource diz qual relatório já existente
// no sistema esse tipo representa (Ocorrências, Faltas, Observação semanal ou os
// indicadores de Reunião) — não é um motor de relatório genérico novo, é um catálogo
// configurável sobre os relatórios que já existem.
export const REPORT_DATA_SOURCES = ["Ocorrencias", "Faltas", "ObservacaoSemanal", "ReuniaoIndicadores"] as const;
export type ReportDataSource = (typeof REPORT_DATA_SOURCES)[number];

export const REPORT_DATA_SOURCE_LABELS: Record<ReportDataSource, string> = {
  Ocorrencias: "Ocorrências",
  Faltas: "Faltas",
  ObservacaoSemanal: "Observação semanal",
  ReuniaoIndicadores: "Indicadores de reunião",
};

export interface ReportTypeDto {
  id: string;
  name: string;
  requiresClass: boolean;
  requiresDateRange: boolean;
  dataSource: ReportDataSource;
}

export function useAvailableReports() {
  return useQuery({
    queryKey: ["available-reports"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Reports/available");
      const data = unwrapApiResponse(result, "Não foi possível carregar os relatórios.");
      return (data ?? []) as unknown as ReportTypeDto[];
    },
  });
}

export interface SaveReportTypeInput {
  id?: string;
  name: string;
  dataSource: ReportDataSource;
  requiresClass: boolean;
  requiresDateRange: boolean;
}

export function useSaveReportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveReportTypeInput) => {
      const body = {
        id: input.id ?? "",
        name: input.name,
        dataSource: input.dataSource,
        requiresClass: input.requiresClass,
        requiresDateRange: input.requiresDateRange,
      };
      if (input.id) {
        const result = await tasksApi.PUT("/api/Reports/types/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o tipo de relatório.");
      } else {
        const result = await tasksApi.POST("/api/Reports/types", { body });
        unwrapApiResponse(result, "Não foi possível criar o tipo de relatório.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["available-reports"] }),
  });
}

export function useDeleteReportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.DELETE("/api/Reports/types/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o tipo de relatório.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["available-reports"] }),
  });
}
