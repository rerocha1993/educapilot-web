import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// GET /api/Reports/available é o único endpoint que existe — o backend não gera
// relatório nenhum, só lista os tipos disponíveis (conforme a nota do próprio
// wireframe R13: "sem geração customizada").
export interface ReportTypeDto {
  id: string;
  name: string;
  requiresClass: boolean;
  requiresDateRange: boolean;
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
