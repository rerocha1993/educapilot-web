/**
 * Helper pra evitar repetir (e errar) a checagem de erro do openapi-fetch em cada
 * hook. Motivo de existir: respostas 401/403 do [Authorize] do ASP.NET Core não têm
 * corpo JSON — o campo `error` do openapi-fetch fica `undefined` nesse caso. Checar só
 * `error` (sem olhar `response.ok`/`response.status`) mascara falha de autenticação
 * como sucesso com dado vazio — bug real encontrado ao testar a tela de Turmas.
 */
export function unwrapApiResponse<T>(
  result: { data?: T; error?: unknown; response: Response },
  fallbackMessage: string
): T {
  const { data, error, response } = result;

  if (!response.ok || error) {
    // Prioriza a mensagem real do backend quando ela existe (ex: 401 de
    // AuthController.Login, que devolve { message: "Credenciais inválidas." }).
    // Só cai pra "sessão expirada" quando o 401 vem SEM corpo — que é o caso do
    // middleware [Authorize] rejeitando token ausente/expirado em endpoints
    // protegidos, sem nenhum JSON de resposta.
    const bodyMessage = (error as { message?: string } | undefined)?.message;
    if (bodyMessage) {
      throw new Error(bodyMessage);
    }
    if (response.status === 401) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    throw new Error(fallbackMessage);
  }

  return data as T;
}
