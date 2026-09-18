import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "../api/client";
import { unwrapApiResponse } from "../api/unwrap";
import { getToken } from "../auth/session";

export interface ContractSigner {
  id: string;
  nome: string;
  email: string;
  papel: number;
  status: number;
  statusDescricao: string;
  linkAssinatura?: string | null;
  visualizadoEm?: string | null;
  assinadoEm?: string | null;
  recusadoEm?: string | null;
  motivoRecusa?: string | null;
}

export interface Contract {
  id: string;
  formResponseId: string;
  titulo: string;
  status: number;
  statusDescricao: string;
  sandbox: boolean;
  hashDocumento?: string | null;
  criadoEm: string;
  enviadoEm?: string | null;
  concluidoEm?: string | null;
  ultimoErroEnvio?: string | null;
  /** Quando a via assinada saiu para a família. Nulo = ainda não saiu. */
  copiaEnviadaEm: string | null;
  temArquivoAssinado: boolean;
  temArquivoAuditoria: boolean;
  signatarios: ContractSigner[];
}

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const result = await flowApi.GET("/api/Contracts", {});
      return unwrapApiResponse(result, "Não foi possível carregar os contratos.") as unknown as Contract[];
    },
  });
}

/** Contratos já assinados pela família e ainda não conferidos pela gestão. */
export function useContractsAwaitingApproval() {
  return useQuery({
    queryKey: ["contracts", "aguardando-aprovacao"],
    queryFn: async () => {
      const result = await flowApi.GET("/api/Contracts/aguardando-aprovacao", {});
      return unwrapApiResponse(result, "Não foi possível carregar a fila de aprovação.") as unknown as Contract[];
    },
  });
}

export function useApproveContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; valores?: Record<string, string | null> }) => {
      const result = await flowApi.POST("/api/Contracts/{id}/aprovar", {
        params: { path: { id: input.id } },
        body: { valores: input.valores ?? null },
      });
      unwrapApiResponse(result, "Não foi possível aprovar o contrato.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

export function useRejectContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; motivo: string }) => {
      const result = await flowApi.POST("/api/Contracts/{id}/reprovar", {
        params: { path: { id: input.id } },
        body: { motivo: input.motivo },
      });
      unwrapApiResponse(result, "Não foi possível reprovar o contrato.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

/**
 * Exclui um contrato que falhou antes de ir para assinatura.
 *
 * O backend recusa qualquer outro estado: contrato assinado é a prova que sustenta a matrícula, e
 * apagá-lo não teria desfazer. Aqui a interface só oferece o botão onde ele é permitido, e a
 * checagem de verdade continua no servidor.
 */
/**
 * Gera um contrato novo a partir da mesma ficha que a família já enviou.
 *
 * Recusa no Autentique é definitiva: aquele link morre e não há como reenviá-lo. Sem isto, a
 * única saída era pedir à família para preencher tudo de novo. O contrato recusado continua na
 * lista — é o registro de que alguém recusou, com o motivo e a data.
 *
 * `fetch` cru porque a rota é nova e ainda não está nos tipos gerados do Swagger. A mensagem de
 * erro do backend vai direto para a tela: é ela que diz o que a escola precisa ajustar.
 */
export function useReissueContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141"}/api/Contracts/${id}/reemitir`,
        { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );

      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(
          (corpo as { message?: string } | null)?.message ??
            "Não foi possível gerar um contrato novo."
        );
      }

      return (await res.json()) as { contratoId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await flowApi.DELETE("/api/Contracts/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível excluir o contrato.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
