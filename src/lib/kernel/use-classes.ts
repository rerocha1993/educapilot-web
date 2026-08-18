import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/Class");
      return unwrapApiResponse(result, "Não foi possível carregar as turmas.") ?? [];
    },
  });
}

export interface SaveClassInput {
  id?: number;
  className: string;
}

export function useSaveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveClassInput) => {
      if (input.id) {
        const result = await coreApi.PUT("/api/Class/{id}", {
          params: { path: { id: input.id } },
          body: { id: input.id, className: input.className },
        });
        unwrapApiResponse(result, "Não foi possível salvar a turma.");
      } else {
        const result = await coreApi.POST("/api/Class", {
          body: { className: input.className },
        });
        unwrapApiResponse(result, "Não foi possível criar a turma.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await coreApi.DELETE("/api/Class/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível excluir a turma.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
