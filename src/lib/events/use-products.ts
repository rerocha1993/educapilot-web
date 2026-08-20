import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface ProductEventDto {
  id: string;
  nome: string;
  preco: number;
  salesGroupId: string;
  ativo: boolean;
  estoque: number | null;
}

export function useProductsByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["events", "products", "by-group", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/ProductEvent/by-group/{groupId}", {
        params: { path: { groupId: groupId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os produtos.");
      return (data ?? []) as unknown as ProductEventDto[];
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["events", "products"],
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/ProductEvent");
      const data = unwrapApiResponse(result, "Não foi possível carregar os produtos.");
      return (data ?? []) as unknown as ProductEventDto[];
    },
  });
}

export interface SaveProductInput {
  id?: string;
  nome: string;
  preco: number;
  salesGroupId: string;
  ativo: boolean;
  estoque?: number;
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProductInput) => {
      const body = {
        nome: input.nome,
        preco: input.preco,
        salesGroupId: input.salesGroupId,
        ativo: input.ativo,
        estoque: input.estoque ?? null,
      };
      if (input.id) {
        const result = await eventsApi.PUT("/api/events/ProductEvent/{id}", {
          params: { path: { id: input.id } },
          body,
        });
        unwrapApiResponse(result, "Não foi possível salvar o produto.");
      } else {
        const result = await eventsApi.POST("/api/events/ProductEvent", { body });
        unwrapApiResponse(result, "Não foi possível criar o produto.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await eventsApi.DELETE("/api/events/ProductEvent/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível remover o produto.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", "products"] }),
  });
}

export interface SubProductEventDto {
  id: string;
  nome: string;
  productId: string;
  ativo: boolean;
}

export function useSubProducts(productId: string | undefined) {
  return useQuery({
    queryKey: ["events", "sub-products", productId],
    enabled: !!productId,
    queryFn: async () => {
      const result = await eventsApi.GET("/api/events/SubProductEvent/by-product/{productId}", {
        params: { path: { productId: productId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os subprodutos.");
      return (data ?? []) as unknown as SubProductEventDto[];
    },
  });
}

export function useSaveSubProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; productId: string; ativo: boolean }) => {
      const result = await eventsApi.POST("/api/events/SubProductEvent", { body: input });
      unwrapApiResponse(result, "Não foi possível criar o subproduto.");
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["events", "sub-products", variables.productId] }),
  });
}
