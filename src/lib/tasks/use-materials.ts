import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Novo (2026-09, feedback do cliente) — cadastro geral de materiais + controle de
// quantidade em estoque. Antes só existia leitura no backend (GET /api/Materials);
// a tela era "desnecessária por que nem dá pra criar material" porque não tinha por
// onde criar. Cruzamento com o que a professora pede no planejamento semanal fica
// pra depois — o planejamento ainda não tem modelo (é o próximo item, R12).
export interface MaterialDto {
  id: string;
  name: string;
  type: string;
  availableQuantity: number;
}

export interface SaveMaterialInput {
  id?: string;
  name: string;
  type: string;
  availableQuantity: number;
}

export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Materials");
      const data = unwrapApiResponse(result, "Não foi possível carregar os materiais.");
      return (data ?? []) as unknown as MaterialDto[];
    },
  });
}

export function useSaveMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMaterialInput) => {
      const body = { name: input.name, type: input.type, availableQuantity: input.availableQuantity };
      if (input.id) {
        const result = await tasksApi.PUT("/api/Materials/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o material.");
      } else {
        const result = await tasksApi.POST("/api/Materials", { body });
        unwrapApiResponse(result, "Não foi possível cadastrar o material.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.DELETE("/api/Materials/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível excluir o material.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}
