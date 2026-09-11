import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Acesso por módulo e área (2026-09).
//
// Substitui a ideia de "papel decide tudo": papel fixo quebra na primeira exceção real — a
// professora que também cuida do material, a coordenadora que não deve ver o financeiro.

export interface AreaCatalogo {
  slug: string;
  rotulo: string;
}

export interface ModuloCatalogo {
  slug: string;
  rotulo: string;
  areas: AreaCatalogo[];
}

export interface ModuloAcesso {
  moduloSlug: string;
  /** Vazio = módulo inteiro. A restrição é a exceção, e é ela que se escreve. */
  areas: string[];
}

export interface AcessoDoUsuario {
  userType: string;
  modulos: ModuloAcesso[];
  classIds: number[];
}

export function useCatalogoDeAcesso() {
  return useQuery({
    queryKey: ["acessos", "catalogo"],
    // O catálogo é código, não dado: só muda com deploy.
    staleTime: Infinity,
    queryFn: async () => {
      const result = await coreApi.GET("/api/Acessos/catalogo", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar os módulos.");
      return (data ?? []) as unknown as ModuloCatalogo[];
    },
  });
}

export function useAcessoDoUsuario(userId: string | undefined) {
  return useQuery({
    queryKey: ["acessos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const result = await coreApi.GET("/api/Acessos/{userId}", {
        params: { path: { userId: userId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar o acesso.");
      return data as unknown as AcessoDoUsuario;
    },
  });
}

/** Acesso de quem está logado. É com isto que o menu se monta. */
export function useMeuAcesso() {
  return useQuery({
    queryKey: ["acessos", "meu"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/Acessos/meu", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar seu acesso.");
      return data as unknown as AcessoDoUsuario;
    },
  });
}

export function useSalvarAcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; acesso: AcessoDoUsuario }) => {
      const result = await coreApi.PUT("/api/Acessos/{userId}", {
        params: { path: { userId: input.userId } },
        body: input.acesso,
      });
      unwrapApiResponse(result, "Não foi possível salvar o acesso.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["acessos"] }),
  });
}
