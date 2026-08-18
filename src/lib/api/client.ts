import createClient, { type Middleware } from "openapi-fetch";
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
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("educapilot_token");
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
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
}
