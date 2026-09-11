import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface TenantEmailSettings {
  host: string;
  port: number;
  username: string;
  remetente: string | null;
  nomeRemetente: string | null;
  /** Indica que já existe senha gravada. A senha em si nunca vem do backend. */
  configurado: boolean;
  testadoEm: string | null;
}

export function useTenantEmail() {
  return useQuery({
    queryKey: ["tenant-email"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/TenantEmail", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar a configuração de e-mail.");
      return data as unknown as TenantEmailSettings;
    },
  });
}

export function useSaveTenantEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      host: string;
      port: number;
      username: string;
      /** Em branco preserva a senha já gravada — o backend não devolve a atual. */
      senha?: string;
      remetente?: string | null;
      nomeRemetente?: string | null;
    }) => {
      const result = await coreApi.PUT("/api/TenantEmail", {
        body: {
          host: input.host,
          port: input.port,
          username: input.username,
          senha: input.senha || null,
          remetente: input.remetente ?? null,
          nomeRemetente: input.nomeRemetente ?? null,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar a configuração de e-mail.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-email"] }),
  });
}

export interface TesteEmailResult {
  sucesso: boolean;
  /** Mensagem do provedor. É ela que distingue senha errada de porta bloqueada. */
  erro: string | null;
}

export function useTestarTenantEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (destinatario: string) => {
      const result = await coreApi.POST("/api/TenantEmail/testar", {
        body: { destinatario },
      });
      const data = unwrapApiResponse(result, "Não foi possível enviar o teste.");
      return data as unknown as TesteEmailResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-email"] }),
  });
}
