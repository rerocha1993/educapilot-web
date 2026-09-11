import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { getSession } from "@/lib/auth/session";

/**
 * Turmas que o usuário logado pode ver.
 *
 * Professor recebe só as turmas dele; coordenação e administração recebem todas.
 *
 * Antes disto, toda tela usava GET /api/Class, que devolve as turmas da escola inteira para
 * qualquer usuário autenticado — uma professora abria a Chamada e via a lista completa, com as
 * turmas das colegas. Escopar aqui, e não em cada tela, faz todos os seletores de turma do
 * sistema passarem a mostrar a lista certa de uma vez (era o pedido: a professora atende mais de
 * uma turma e precisa escolher entre AS DELA).
 *
 * O backend continua sendo a autoridade: os endpoints de dado por turma têm suas próprias
 * verificações. Isto aqui é o que a interface OFERECE, não o que ela autoriza.
 */
export function useClasses() {
  const ehProfessor = getSession()?.role === "Teacher";

  return useQuery({
    queryKey: ["classes", ehProfessor ? "minhas" : "todas"],
    queryFn: async () => {
      const result = ehProfessor
        ? await coreApi.GET("/api/User/classes")
        : await coreApi.GET("/api/Class");
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
