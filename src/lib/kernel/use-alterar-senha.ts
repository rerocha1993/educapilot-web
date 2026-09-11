import { useMutation } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/** Mesmo mínimo do backend (UserService.TamanhoMinimoDaSenha). A tela avisa antes de enviar. */
export const TAMANHO_MINIMO_DA_SENHA = 8;

/**
 * Troca a senha de quem está logado.
 *
 * Senha atual errada volta 400 com a mensagem, e não 401: o cliente HTTP trata 401 como sessão
 * expirada e desloga (ver src/lib/api/client.ts). Errar a senha atual só mostra o aviso.
 */
export function useAlterarSenha() {
  return useMutation({
    mutationFn: async (input: { senhaAtual: string; novaSenha: string }) => {
      const result = await coreApi.POST("/api/User/me/senha", {
        body: { senhaAtual: input.senhaAtual, novaSenha: input.novaSenha },
      });
      unwrapApiResponse(result, "Não foi possível alterar a senha.");
    },
  });
}
