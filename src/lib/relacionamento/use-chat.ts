import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CHAVES_DO_CHAT,
  chamarChat,
  normalizarConversa,
  normalizarResumo,
  type ConversaCrua,
  type ConversaDoChat,
  type ResumoDoChat,
  type SituacaoDaConversa,
} from "./chat-comum";
import { useIntervaloDeReserva } from "./chat-tempo-real";
import { consulta } from "./api";

/**
 * Chat, lado da escola — /api/Relacionamento/chat. Professor só enxerga as conversas das turmas
 * dele (o servidor recorta). Mensagens, envio e "lida" são de use-chat-comum.ts.
 */

export interface FiltroDeConversas {
  classId: number | null;
  somenteNaoLidas: boolean;
  busca: string;
  status: SituacaoDaConversa;
}

/** Lista de conversas, com os filtros da tela. A ordem (mais recente primeiro) é do servidor. */
export function useConversasDaEscola(filtro: FiltroDeConversas, habilitado = true) {
  const intervalo = useIntervaloDeReserva();
  const busca = filtro.busca.trim();

  return useQuery({
    queryKey: [...CHAVES_DO_CHAT.conversas, "escola", filtro.classId, filtro.somenteNaoLidas, busca, filtro.status],
    enabled: habilitado,
    refetchInterval: intervalo,
    queryFn: async (): Promise<ConversaDoChat[]> => {
      const lista = await chamarChat<ConversaCrua[] | null>(
        "escola",
        `/conversas${consulta({
          classId: filtro.classId,
          somenteNaoLidas: filtro.somenteNaoLidas,
          busca,
          status: filtro.status,
        })}`,
        {},
        "Não foi possível carregar as conversas."
      );
      return (lista ?? []).map(normalizarConversa);
    },
  });
}

/** Uma conversa (cabeçalho da tela de conversa). */
export function useConversaDaEscola(conversaId: string) {
  return useQuery({
    queryKey: CHAVES_DO_CHAT.conversa(conversaId),
    enabled: !!conversaId,
    queryFn: async () =>
      normalizarConversa(
        (await chamarChat<ConversaCrua | null>(
          "escola",
          `/conversas/${conversaId}`,
          {},
          "Não foi possível abrir a conversa."
        )) ?? {}
      ),
  });
}

/** Abre uma conversa com a família do aluno (devolve a que já existe, se houver). */
export function useIniciarConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, assunto }: { studentId: number; assunto: string }) =>
      normalizarConversa(
        (await chamarChat<ConversaCrua | null>(
          "escola",
          "/conversas/iniciar",
          { method: "POST", body: JSON.stringify({ studentId, assunto: assunto.trim() || undefined }) },
          "Não foi possível iniciar a conversa."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversas }),
  });
}

/** Arquiva ou reabre uma conversa. */
export function useAlterarSituacaoDaConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversaId, acao }: { conversaId: string; acao: "arquivar" | "reabrir" }) =>
      chamarChat<void>(
        "escola",
        `/conversas/${conversaId}/${acao}`,
        { method: "POST" },
        acao === "arquivar" ? "Não foi possível arquivar a conversa." : "Não foi possível reabrir a conversa."
      ),
    onSuccess: (_, { conversaId }) => {
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversas });
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversa(conversaId) });
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.resumo });
    },
  });
}

/** Conversas e mensagens não lidas de quem está logado: alimenta o sino e a aba do Chat. */
export function useResumoDoChat(habilitado = true) {
  const intervalo = useIntervaloDeReserva();

  return useQuery({
    queryKey: CHAVES_DO_CHAT.resumo,
    enabled: habilitado,
    // Com o tempo real de pé, ele invalida; sem, pergunta de 15 em 15 s (e a janela refaz ao voltar).
    refetchInterval: intervalo,
    queryFn: async (): Promise<ResumoDoChat> =>
      normalizarResumo(
        await chamarChat<Partial<ResumoDoChat> | null>("escola", "/resumo", {}, "Não foi possível carregar o resumo do chat.")
      ),
  });
}
