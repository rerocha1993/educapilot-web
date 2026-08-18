import { useMutation } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
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
      const { data, error, response } = await coreApi.POST("/api/Auth/login", {
        body: { email, password },
      });

      if (error || !response.ok) {
        // AuthController.Login devolve { message } em 401/500 — ver AuthController.cs.
        const message =
          (error as { message?: string } | undefined)?.message ??
          "Não foi possível entrar. Confira o e-mail e a senha.";
        throw new Error(message);
      }

      // Resposta real não está no schema do Swagger (sem [ProducesResponseType]) —
      // ver src/lib/auth/types.ts.
      const login = data as unknown as LoginResponse;
      saveSession(login, rememberMe);
      return login;
    },
  });
}
