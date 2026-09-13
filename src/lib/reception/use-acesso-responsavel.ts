import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portariaJson } from "./api";

export interface AcessoResponsavel {
  guardianId: string;
  nome: string;
  email?: string | null;
  temAcesso: boolean;
  senhaDefinida: boolean;
  /** Só vem quando um link acabou de ser gerado. */
  link?: string | null;
  emailEnviado: boolean;
}

const chave = (guardianId: string) => ["portaria", "acesso-responsavel", guardianId];

export function useAcessoResponsavel(guardianId: string) {
  return useQuery({
    queryKey: chave(guardianId),
    queryFn: () =>
      portariaJson<AcessoResponsavel>(
        `/responsaveis/${guardianId}/acesso`,
        {},
        "Não foi possível consultar o acesso do responsável."
      ),
  });
}

export function useGerarLinkDeAcesso(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      portariaJson<AcessoResponsavel>(
        `/responsaveis/${guardianId}/acesso`,
        { method: "POST" },
        "Não foi possível gerar o link de acesso."
      ),
    onSuccess: (acesso) => queryClient.setQueryData(chave(guardianId), acesso),
  });
}
