import { useMutation } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { saveMasterSession, type MasterSession } from "./master-session";

export interface MasterLoginInput {
  email: string;
  password: string;
}

export function useMasterLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: MasterLoginInput) => {
      const result = await coreApi.POST("/api/Auth/master-login", {
        body: { email, password },
      });
      // Mesmo caso do login de tenant — resposta real não documentada no Swagger
      // (AuthController.LoginMaster não usa [ProducesResponseType]).
      const login = unwrapApiResponse(
        result,
        "Não foi possível entrar. Confira o e-mail e a senha."
      ) as unknown as MasterSession;

      saveMasterSession(login);
      return login;
    },
  });
}
