import createClient, { type Middleware } from "openapi-fetch";
import { clearSession, getToken } from "../auth/session";
import { getMasterToken } from "../auth/master-session";
import type { paths as CorePaths } from "./generated/core";
import type { paths as TasksPaths } from "./generated/tasks";
import type { paths as FlowPaths } from "./generated/flow";
import type { paths as EventsPaths } from "./generated/events";
import type { paths as FinancePaths } from "./generated/finance";

// Sem /api no final — os paths gerados (ex: "/api/Auth/login") já incluem o prefixo.
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Injeta o token JWT salvo (após login) em toda chamada. O backend valida via
 * JwtValidationMiddleware — ver EducaPilot.API/Middleware/JwtValidationMiddleware.cs.
 */
/**
 * Encerra a sessão quando o backend rejeita o token.
 *
 * O token de usuário vale 2 horas. Sem isto, ao expirar, a aplicação continua com cara de
 * logada — o shell renderiza, o nome do usuário aparece — mas toda chamada volta 401 e cada
 * tela mostra vazio: o menu perde os módulos, as listas somem, botões ficam desabilitados.
 * Ninguém associa isso a sessão expirada, e o sintoma parece bug de dado.
 *
 * A rota de login fica de fora: um 401 ali é credencial errada, e deslogar quem já está
 * deslogado só apagaria a mensagem de erro da tela.
 */
const sessionExpiryMiddleware: Middleware = {
  async onResponse({ request, response }) {
    const ehLogin = request.url.includes("/api/Auth/");

    if (response.status === 401 && !ehLogin && typeof window !== "undefined") {
      clearSession();

      // replace em vez de push: a página atual já não funciona sem sessão, e deixá-la no
      // histórico faria o botão Voltar cair de novo numa tela quebrada.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login?expirada=1");
      }
    }

    return response;
  },
};

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
};

// Um cliente tipado por módulo — espelha a separação de Swagger docs do backend
// (Core/Tasks/Flow/Events/Finance), consistente com a arquitetura de monólito modular.
export const coreApi = createClient<CorePaths>({ baseUrl });
export const tasksApi = createClient<TasksPaths>({ baseUrl });
export const flowApi = createClient<FlowPaths>({ baseUrl });
export const eventsApi = createClient<EventsPaths>({ baseUrl });
export const financeApi = createClient<FinancePaths>({ baseUrl });

for (const client of [coreApi, tasksApi, flowApi, eventsApi, financeApi]) {
  client.use(authMiddleware);
  client.use(sessionExpiryMiddleware);
}

// Cliente separado pro painel Master (A1-A4/A8) — mesmos paths do Core (Admin/
// Module/tenants-modules vivem no doc "Core"), mas injeta o token master
// (assinado com chave diferente, ver master-session.ts) em vez do token de tenant.
const masterAuthMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getMasterToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
};
export const masterApi = createClient<CorePaths>({ baseUrl });
masterApi.use(masterAuthMiddleware);
