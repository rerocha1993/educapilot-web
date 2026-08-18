import { useQuery } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Igual ao caso de login: TenantModulesController.GetActiveModules não usa
// [ProducesResponseType], então o Swagger não documenta o corpo — tipado à mão a
// partir de SharedKernel/DTOs/ModuleDto.cs.
export interface ActiveModuleDto {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  monthlyPrice: number;
}

/**
 * Módulos que o tenant atual tem contratados/ativos — GET /api/tenants/modules.
 * Cada slug corresponde a um módulo vendido separadamente (ver
 * design/handoff/README.md e a Fase 1 do plano original do EducaPilot: módulos são
 * plugáveis por tenant, não pacote fechado). O catálogo real hoje só tem
 * "tasks", "flow", "finance" — Kernel (turmas/alunos/usuários) é a base da
 * plataforma, não um módulo vendável, por isso não aparece aqui.
 */
export function useActiveModules() {
  return useQuery({
    queryKey: ["active-modules"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/tenants/modules");
      const data = unwrapApiResponse(result, "Não foi possível carregar os módulos.");
      return (data ?? []) as unknown as ActiveModuleDto[];
    },
    staleTime: 5 * 60_000, // módulos não mudam a cada request; 5min é seguro
  });
}
