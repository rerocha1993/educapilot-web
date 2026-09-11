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

/**
 * Envia o convite JÁ COM o acesso definido.
 *
 * Antes o convite só levava o e-mail, e quem aceitava escolhia o próprio papel no formulário de
 * cadastro — bastava marcar "Admin". Nível de acesso é decisão de quem convida, e agora viaja
 * no convite; o formulário de aceite não pergunta mais.
 */
export function useSendInvite() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      nome?: string;
      acesso: {
        userType: string;
        modulos: { moduloSlug: string; areas: string[] }[];
        classIds: number[];
      };
    }) => {
      const result = await coreApi.POST("/api/Invites/send", {
        body: {
          email: input.email,
          nome: input.nome ?? null,
          acesso: input.acesso,
        },
      });
      const data = unwrapApiResponse(result, "Não foi possível enviar o convite.");

      // O backend devolve 200 mesmo quando o e-mail nao sai: o convite existe e o link vale.
      // A tela mostra o link para a escola repassar por outro meio.
      return data as unknown as { message: string; enviado: boolean; link?: string };
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

// Turmas por usuário (2026-09) — até aqui as turmas só eram definidas no aceite do convite e
// não havia como mudar depois: uma professora que passasse a atender duas turmas precisava de
// um convite novo. Ver UserController.SetClassesByUser.

export function useUserClasses(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", userId, "classes"],
    enabled: !!userId,
    queryFn: async () => {
      const result = await coreApi.GET("/api/User/{id}/classes", {
        params: { path: { id: userId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar as turmas do usuário.");
      return (data ?? []) as { id?: number; className?: string | null }[];
    },
  });
}

export function useSaveUserClasses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; classIds: number[] }) => {
      const result = await coreApi.PUT("/api/User/{id}/classes", {
        params: { path: { id: input.userId } },
        body: { classIds: input.classIds },
      });
      unwrapApiResponse(result, "Não foi possível salvar as turmas.");
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["users", input.userId, "classes"] });
      // A lista de turmas do próprio usuário logado também muda quando ele edita a si mesmo.
      queryClient.invalidateQueries({ queryKey: ["minhas-turmas"] });
    },
  });
}
