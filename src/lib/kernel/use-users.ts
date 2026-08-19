import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// GET /api/User não documenta a resposta no Swagger (mesmo padrão dos outros
// endpoints desta sessão) — PagedResult<User>, tipado à mão a partir de
// SharedKernel/Entities/User.cs (passwordHash tem [JsonIgnore], nunca vem no JSON)
// e SharedKernel/DTOs/PagedResult.cs.
export interface UserDto {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  userType: string;
  ativo: boolean;
  createdAt: string;
  tenantId: string;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function useUsers(page: number, pageSize = 50) {
  return useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: async () => {
      const result = await coreApi.GET("/api/User", { params: { query: { page, pageSize } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar os usuários.");
      return data as unknown as PagedResultDto<UserDto>;
    },
  });
}

export interface SaveUserInput {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  userType: string;
  ativo: boolean;
}

// Só edição, sem criação direta: PasswordHash tem [JsonIgnore] (nem entra nem sai
// pelo JSON) e o backend não tem endpoint de "criar usuário já com senha" fora do
// fluxo de convite — POST /api/User criaria uma conta sem senha utilizável, que
// nunca conseguiria logar. Pra adicionar gente nova, usar useSendInvite() abaixo
// (POST /api/Invites/send), que é o fluxo real: a pessoa define a própria senha ao
// aceitar o convite (InvitesController.Accept).
export function useSaveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveUserInput) => {
      const result = await coreApi.PUT("/api/User/{id}", {
        params: { path: { id: input.id } },
        body: {
          id: input.id,
          fullName: input.fullName,
          cpf: input.cpf,
          email: input.email,
          userType: input.userType,
          ativo: input.ativo,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o usuário.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useSendInvite() {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await coreApi.POST("/api/Invites/send", { body: { email } });
      unwrapApiResponse(result, "Não foi possível enviar o convite.");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await coreApi.DELETE("/api/User/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível excluir o usuário.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
