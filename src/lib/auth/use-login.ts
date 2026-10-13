import { useMutation } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { dadosDoAparelhoParaLogin, estaNoApp } from "@/lib/nativo/app";
import { saveSession } from "./session";
import type { LoginResponse } from "./types";

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password, rememberMe }: LoginInput) => {
      const result = await coreApi.POST("/api/Auth/login", {
        // Dentro do app o login pede sessão longa (refresh token); no navegador não manda nada a mais.
        body: { email, password, ...dadosDoAparelhoParaLogin() },
      });

      // Resposta real não está no schema do Swagger (sem [ProducesResponseType]) —
      // ver src/lib/auth/types.ts. AuthController.Login devolve { message } em erro.
      const login = unwrapApiResponse(
        result,
        "Não foi possível entrar. Confira o e-mail e a senha."
      ) as unknown as LoginResponse;

      // No app a sessão é sempre persistente: fechar o app não pode derrubar o login.
      saveSession(login, rememberMe || estaNoApp());
      return login;
    },
  });
}
