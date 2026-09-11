import { getToken } from "@/lib/auth/session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface ContractSettings {
  exigirContraAssinatura: boolean;
  nomeSignatarioEscola?: string | null;
  emailSignatarioEscola?: string | null;
  prazoAssinaturaDias?: number | null;
  /** Reajuste aplicado às mensalidades na rematrícula (8 = 8%). */
  percentualReajuste: number;
  /** Só indica que já existe imagem gravada — o caminho nunca vem do backend. */
  temAssinaturaEscola: boolean;
}

export function useContractSettings() {
  return useQuery({
    queryKey: ["contract-settings"],
    queryFn: async () => {
      const result = await flowApi.GET("/api/Contracts/configuracao", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar a configuração.");
      return data as unknown as ContractSettings;
    },
  });
}

export function useSaveContractSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContractSettings) => {
      const result = await flowApi.PUT("/api/Contracts/configuracao", {
        body: {
          exigirContraAssinatura: input.exigirContraAssinatura,
          nomeSignatarioEscola: input.nomeSignatarioEscola ?? null,
          emailSignatarioEscola: input.emailSignatarioEscola ?? null,
          prazoAssinaturaDias: input.prazoAssinaturaDias ?? null,
          percentualReajuste: input.percentualReajuste,
          temAssinaturaEscola: input.temAssinaturaEscola,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar a configuração.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-settings"] });
    },
  });
}

/**
 * Sobe a imagem da assinatura da escola.
 *
 * fetch cru porque é multipart — o cliente tipado não cobre upload, mesmo padrão do resto do
 * projeto. Sem esta imagem, a via que a família recebe sai sem a contra-assinatura: o código já
 * trata isso sem quebrar, mas o documento fica incompleto.
 */
export function useUploadAssinaturaEscola() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141"}/api/Contracts/configuracao/assinatura`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        }
      );

      if (!res.ok) {
        const corpo = await res.text();
        let mensagem: string | undefined;
        try {
          mensagem = (JSON.parse(corpo) as { message?: string }).message;
        } catch {
          mensagem = undefined;
        }
        throw new Error(mensagem ?? "Não foi possível enviar a assinatura.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contract-settings"] }),
  });
}
