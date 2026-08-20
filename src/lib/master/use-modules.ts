import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface ModuleDto {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  monthlyPrice: number;
  isActive: boolean;
}

export function useModuleCatalog() {
  return useQuery({
    queryKey: ["master", "modules"],
    queryFn: async () => {
      const result = await masterApi.GET("/api/Module");
      const data = unwrapApiResponse(result, "Não foi possível carregar o catálogo de módulos.");
      return (data ?? []) as unknown as ModuleDto[];
    },
  });
}

export interface CreateModuleInput {
  slug: string;
  displayName: string;
  description?: string;
  icon?: string;
  monthlyPrice: number;
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateModuleInput) => {
      const result = await masterApi.POST("/api/Module", { body: input });
      unwrapApiResponse(result, "Não foi possível criar o módulo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "modules"] }),
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (module: ModuleDto) => {
      const result = await masterApi.PUT("/api/Module/{id}", {
        params: { path: { id: module.id } },
        body: {
          displayName: module.displayName,
          description: module.description,
          icon: module.icon,
          monthlyPrice: module.monthlyPrice,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o módulo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "modules"] }),
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await masterApi.DELETE("/api/Module/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível desativar o módulo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "modules"] }),
  });
}

// Módulos ATIVOS de um tenant específico — a mesma rota que o app do tenant usa pra
// montar o próprio menu, só que o Master passa o tenant-alvo via header X-Tenant-Id
// em vez de depender de um claim TenantId (que o token Master não tem).
export function useTenantActiveModules(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["master", "tenant-modules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const result = await masterApi.GET("/api/tenants/modules", {
        headers: { "X-Tenant-Id": tenantId! },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os módulos do tenant.");
      return (data ?? []) as unknown as ModuleDto[];
    },
  });
}

export function useUpdateTenantModules(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slugs: string[]) => {
      const result = await masterApi.POST("/api/tenants/modules/{tenantId}", {
        params: { path: { tenantId } },
        body: { modules: slugs },
      });
      unwrapApiResponse(result, "Não foi possível salvar os módulos do tenant.");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["master", "tenant-modules", tenantId] }),
  });
}
