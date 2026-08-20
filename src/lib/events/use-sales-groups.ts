import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface SalesGroupEventDto {
  id: string;
  nome: string;
  meta: number | null;
  responsavel: string | null;
}

export function useSalesGroups() {
  return useQuery({
    queryKey: ["events", "sales-groups"],
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/SalesGroupEvent");
      const data = unwrapApiResponse(result, "Não foi possível carregar os grupos de venda.");
      return (data ?? []) as unknown as SalesGroupEventDto[];
    },
  });
}

export interface SaveSalesGroupInput {
  id?: string;
  nome: string;
  meta?: number;
  responsavel?: string;
}

export function useSaveSalesGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveSalesGroupInput) => {
      const body = { nome: input.nome, meta: input.meta ?? null, responsavel: input.responsavel ?? null };
      if (input.id) {
        const result = await eventsApi.PUT("/api/events/SalesGroupEvent/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o grupo.");
      } else {
        const result = await eventsApi.POST("/api/events/SalesGroupEvent", { body });
        unwrapApiResponse(result, "Não foi possível criar o grupo.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "sales-groups"] }),
  });
}

export function useDeleteSalesGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await eventsApi.DELETE("/api/events/SalesGroupEvent/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível remover o grupo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "sales-groups"] }),
  });
}
