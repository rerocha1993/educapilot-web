import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "../api/client";
import { unwrapApiResponse } from "../api/unwrap";

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
