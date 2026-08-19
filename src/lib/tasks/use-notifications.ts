import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// GET /api/Notifications (e as duas ações de marcar como lida) são endpoints
// novos — o backend só tinha POST (enviar) antes desta sessão, sem nenhum jeito
// de listar ou marcar como lida. Retorna a entidade Notification direto (sem
// DTO), resposta não documentada no Swagger — tipado à mão.
export interface NotificationDto {
  id: string;
  teacherId: string;
  message: string;
  sentDate: string;
  isRead: boolean;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Notifications");
      const data = unwrapApiResponse(result, "Não foi possível carregar as notificações.");
      return (data ?? []) as unknown as NotificationDto[];
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.PUT("/api/Notifications/{id}/read", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível marcar como lida.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await tasksApi.PUT("/api/Notifications/read-all");
      unwrapApiResponse(result, "Não foi possível marcar todas como lidas.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
