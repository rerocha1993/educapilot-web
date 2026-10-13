import createClient, { type Middleware } from "openapi-fetch";
import { clearSession, getSession, getToken } from "../auth/session";
import { renovarSessao } from "../auth/renovar-sessao";
import { API_BASE_URL } from "./base-url";
import { getMasterToken } from "../auth/master-session";
import type { paths as CorePaths } from "./generated/core";
import type { paths as TasksPaths } from "./generated/tasks";
import type { paths as FlowPaths } from "./generated/flow";
import type { paths as EventsPaths } from "./generated/events";
import type { paths as FinancePaths } from "./generated/finance";

const baseUrl = API_BASE_URL;

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
const CHAVE_RECARGA = "educapilot_recarga_renovacao";

/** Recarrega a tela com a sessão renovada, no máximo uma vez a cada 10 s (o 401 pode não ser de token vencido). */
function recarregarComSessaoNova(): boolean {
  try {
    const ultima = Number(window.sessionStorage.getItem(CHAVE_RECARGA) ?? 0);
    if (Date.now() - ultima < 10_000) return false;
    window.sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

const sessionExpiryMiddleware: Middleware = {
  async onResponse({ request, response }) {
    const ehLogin = request.url.includes("/api/Auth/");

    if (response.status === 401 && !ehLogin && typeof window !== "undefined") {
      // Sessão longa (app): tenta renovar antes de desistir. Renovou: recarrega a tela com o token
      // novo. Sem rede ou erro do servidor: mantém a sessão (ninguém recusou nada).
      if (getSession()?.refreshToken) {
        const resultado = await renovarSessao();
        if (resultado === "falha") return response;
        if (resultado === "renovada" && recarregarComSessaoNova()) return response;
      }

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
