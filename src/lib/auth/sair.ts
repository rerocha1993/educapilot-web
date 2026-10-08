import { clearSession } from "@/lib/auth/session";
import { cancelarPush } from "@/lib/push/registrar-push";
import { desconectarChat } from "@/lib/relacionamento/chat-tempo-real";

/**
 * Sair da conta: cancela o push deste aparelho e fecha o chat em tempo real antes de apagar a
 * sessão. O cancelamento lê o token na hora (síncrono), então a ordem importa: `clearSession` por
 * último. Não espera a rede; quem chama segue para /login.
 */
export function encerrarSessao() {
  void cancelarPush();
  void desconectarChat();
  clearSession();
}
