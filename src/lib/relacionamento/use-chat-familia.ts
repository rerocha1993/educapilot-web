import { useQuery } from "@tanstack/react-query";

import { CHAVES_DO_CHAT, chamarChat, normalizarConversa, type ConversaCrua, type ConversaDoChat } from "./chat-comum";
import { useIntervaloDeReserva } from "./chat-tempo-real";

/**
 * Chat, lado dos pais — /api/Responsavel/chat. A família não inicia conversa: ela aparece quando a
 * escola escreve (ou por filho, se o servidor já a cria). Mensagens, envio e "lida" são de
 * use-chat-comum.ts.
 */

/** Uma conversa por filho. A contagem de não lidas da aba vem de `mensagensNaoLidas` no início. */
export function useConversasDaFamilia(habilitado = true) {
  const intervalo = useIntervaloDeReserva();

  return useQuery({
    queryKey: [...CHAVES_DO_CHAT.conversas, "familia"],
    enabled: habilitado,
    refetchInterval: intervalo,
    queryFn: async (): Promise<ConversaDoChat[]> => {
      const lista = await chamarChat<ConversaCrua[] | null>(
        "familia",
        "/conversas",
        {},
        "Não foi possível carregar as conversas."
      );
      return (lista ?? []).map(normalizarConversa);
    },
  });
}
