import { clearSession, getToken } from "@/lib/auth/session";
import { cancelarPush } from "@/lib/push/registrar-push";
import { desconectarChat } from "@/lib/relacionamento/chat-tempo-real";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Avisa a API para derrubar o token na hora (POST /api/auth/sair).
 *
 * Segurança (2026-10, auditoria): apagar o token do navegador não bastava; uma cópia dele (computador da escola,
 * extensão) continuava entrando até expirar. `keepalive` deixa o pedido seguir mesmo com a página indo para /login.
 */
function revogarNaApi(token: string) {
  void fetch(`${baseUrl}/api/auth/sair`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Sair da conta: cancela o push deste aparelho e fecha o chat em tempo real antes de apagar a
 * sessão. O cancelamento lê o token na hora (síncrono), então a ordem importa: `clearSession` por
 * último. O token só é revogado na API depois do push (que ainda precisa dele). Não espera a rede;
 * quem chama segue para /login.
 */
export function encerrarSessao() {
  const token = getToken();
  void cancelarPush().finally(() => {
    if (token) revogarNaApi(token);
  });
  void desconectarChat();
  clearSession();
}
