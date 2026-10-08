import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getSession } from "@/lib/auth/session";
import {
  achatarMensagens,
  anexarMensagemAoCache,
  atualizarConversaNasListas,
  AUTOR_DO_LADO,
  buscarMensagens,
  CHAVE_DO_INICIO_DOS_PAIS,
  CHAVES_DO_CHAT,
  chamarChat,
  marcarComoLidasNoCache,
  normalizarMensagem,
  novoIdTemporario,
  usePendentesDoChat,
  type LadoDoChat,
  type MensagemCrua,
  type MensagemDoChat,
  type MensagensEmCache,
} from "./chat-comum";
import { useIntervaloDeReserva } from "./chat-tempo-real";
import { comprimirImagem } from "./comprimir-imagem";

/**
 * Hooks do chat que valem para os dois lados (escola e pais): as mensagens de uma conversa, o
 * envio com mensagem "enviando" na tela e o "lida". O que é de um lado só (listas, iniciar,
 * arquivar) está em use-chat.ts e use-chat-familia.ts.
 */

/** O servidor recusa anexo grande; o PDF vai como está, então o limite é conferido aqui. */
export const LIMITE_DO_ANEXO = 15 * 1024 * 1024;

export function ehPdf(arquivo: { type: string; name: string }): boolean {
  return arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
}

/** Confere o arquivo escolhido. Devolve a frase do problema, ou nulo se pode seguir. */
export function problemaDoAnexo(arquivo: File): string | null {
  const imagem = arquivo.type.startsWith("image/");
  if (!imagem && !ehPdf(arquivo)) return "Envie uma foto ou um PDF.";
  if (!imagem && arquivo.size > LIMITE_DO_ANEXO) return "O PDF passa de 15 MB. Escolha um arquivo menor.";
  return null;
}

/** Foto vai reduzida (JPEG, 1600 px); PDF vai como está. */
async function prepararAnexo(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  const reduzida = await comprimirImagem(arquivo);
  if (reduzida.size > LIMITE_DO_ANEXO) throw new Error("A foto passa de 15 MB, mesmo reduzida.");
  return reduzida;
}

// ------------------------------------------------------------------ mensagens

/**
 * Mensagens de uma conversa, da mais nova para trás: a primeira página é a última meia centena, e
 * `fetchNextPage` busca as anteriores (`antesDe` é o instante da mais antiga já carregada).
 */
export function useMensagensDaConversa(lado: LadoDoChat, conversaId: string) {
  const intervalo = useIntervaloDeReserva();

  return useInfiniteQuery({
    queryKey: CHAVES_DO_CHAT.mensagens(conversaId),
    enabled: !!conversaId,
    // Ao abrir, mostra o que já estava em cache e confere com o servidor em seguida.
    staleTime: 0,
    refetchInterval: intervalo,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => buscarMensagens(lado, conversaId, pageParam),
    getNextPageParam: (ultima) => (ultima.temMais ? ultima.itens[0]?.enviadaEm : undefined),
  });
}

// ------------------------------------------------------------------ envio

interface Envio {
  conversaId: string;
  texto: string;
  arquivo: File | null;
  tmpId: string;
}

async function enviarAoServidor(lado: LadoDoChat, envio: Envio): Promise<MensagemDoChat> {
  const { conversaId, texto, arquivo } = envio;

  if (arquivo) {
    const preparado = await prepararAnexo(arquivo);
    const form = new FormData();
    form.append("arquivo", preparado, preparado.name);
    if (texto.trim()) form.append("texto", texto.trim());
    const r = await chamarChat<MensagemCrua | null>(
      lado,
      `/conversas/${conversaId}/mensagens/anexo`,
      { method: "POST", body: form },
      "Não foi possível enviar o anexo."
    );
    return normalizarMensagem(r ?? {});
  }

  const r = await chamarChat<MensagemCrua | null>(
    lado,
    `/conversas/${conversaId}/mensagens`,
    { method: "POST", body: JSON.stringify({ texto: texto.trim() }) },
    "Não foi possível enviar a mensagem."
  );
  return normalizarMensagem(r ?? {});
}

/**
 * Envio com mensagem otimista: a mensagem aparece na hora como "enviando" (ver
 * `usePendentesDoChat`), vira a do servidor quando o POST responde e, se falhar, fica na tela com
 * o motivo, para tentar de novo ou descartar.
 */
export function useEnviarMensagem(lado: LadoDoChat) {
  const queryClient = useQueryClient();

  const mutacao = useMutation({
    mutationFn: (envio: Envio) => enviarAoServidor(lado, envio),
    onMutate: (envio) => {
      const pendentes = usePendentesDoChat.getState();
      const cache = queryClient.getQueryData<MensagensEmCache>(CHAVES_DO_CHAT.mensagens(envio.conversaId));
      const conhecidas = achatarMensagens(cache).map((m) => m.id);

      if (pendentes.pendentes.some((p) => p.tmpId === envio.tmpId)) {
        pendentes.atualizar(envio.tmpId, { situacao: "enviando", erro: null, conhecidas });
        return;
      }
      pendentes.adicionar({
        tmpId: envio.tmpId,
        conversaId: envio.conversaId,
        autor: AUTOR_DO_LADO[lado],
        autorNome: getSession()?.name ?? "",
        texto: envio.texto.trim(),
        arquivo: envio.arquivo,
        criadaEm: new Date().toISOString(),
        situacao: "enviando",
        erro: null,
        conhecidas,
      });
    },
    onSuccess: (mensagem, envio) => {
      anexarMensagemAoCache(queryClient, envio.conversaId, mensagem);
      usePendentesDoChat.getState().remover(envio.tmpId);
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversas });
    },
    onError: (erro, envio) => {
      usePendentesDoChat
        .getState()
        .atualizar(envio.tmpId, { situacao: "falhou", erro: erro instanceof Error ? erro.message : "Não foi possível enviar." });
    },
  });

  return {
    enviar(conversaId: string, texto: string, arquivo: File | null) {
      mutacao.mutate({ conversaId, texto, arquivo, tmpId: novoIdTemporario() });
    },
    reenviar(tmpId: string) {
      const p = usePendentesDoChat.getState().pendentes.find((x) => x.tmpId === tmpId);
      if (p) mutacao.mutate({ conversaId: p.conversaId, texto: p.texto, arquivo: p.arquivo, tmpId });
    },
    descartar(tmpId: string) {
      usePendentesDoChat.getState().remover(tmpId);
    },
  };
}

// ------------------------------------------------------------------ lida

/** Marca a conversa como lida pelo usuário e zera os contadores (lista, resumo, início dos pais). */
export function useLerConversa(lado: LadoDoChat) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversaId: string) =>
      chamarChat<void>(lado, `/conversas/${conversaId}/ler`, { method: "POST" }, "Não foi possível marcar como lida."),
    onSuccess: (_, conversaId) => {
      atualizarConversaNasListas(queryClient, conversaId, (c) => ({ ...c, naoLidas: 0 }));
      marcarComoLidasNoCache(queryClient, conversaId, AUTOR_DO_LADO[lado]);
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.resumo });
      void queryClient.invalidateQueries({ queryKey: CHAVE_DO_INICIO_DOS_PAIS });
    },
  });
}
