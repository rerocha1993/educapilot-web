import { useMutation, useQuery } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/** O que a validação do convite devolve para a tela mostrar antes de pedir os dados. */
export interface ConviteValido {
  email: string;
  nomeEscola?: string | null;
  perfil?: string | null;
}

/**
 * Confere o convite do link.
 *
 * Sem nova tentativa em caso de erro: convite expirado ou já usado não passa a valer tentando de
 * novo, e repetir só atrasaria a mensagem que diz para pedir outro.
 */
export function useValidarConvite(token: string | null) {
  return useQuery({
    queryKey: ["convite", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const result = await coreApi.GET("/api/Invites/validate", {
        params: { query: { token: token! } },
      });
      const data = unwrapApiResponse(result, "Convite inválido ou expirado.");
      return data as unknown as ConviteValido;
    },
  });
}

export interface DadosDoAceite {
  nome: string;
  cpf: string;
  celular: string;
  senha: string;
  confirmacao: string;
}

/**
 * Conclui o cadastro de quem recebeu o convite.
 *
 * Só campos de texto no corpo, e o token entre eles: o backend lê o token do corpo para saber de
 * qual escola é o convite, e só consegue fazer isso quando todos os valores são texto. Papel e
 * turmas não vão: vêm do próprio convite, decididos por quem convidou.
 */
export function useAceitarConvite(token: string | null, email: string) {
  return useMutation({
    mutationFn: async (dados: DadosDoAceite) => {
      const result = await coreApi.POST("/api/Invites/accept", {
        body: {
          token: token ?? "",
          email,
          name: dados.nome.trim(),
          cpf: dados.cpf.replace(/\D/g, ""),
          phone: dados.celular.replace(/\D/g, ""),
          password: dados.senha,
          confirmPassword: dados.confirmacao,
        },
      });
      unwrapApiResponse(result, "Não foi possível concluir o cadastro.");
    },
  });
}
