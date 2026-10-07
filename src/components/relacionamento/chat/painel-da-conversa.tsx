"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Loader2, MessagesSquare, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { BolhaDaMensagem } from "@/components/relacionamento/chat/bolha-da-mensagem";
import { CaixaDeMensagem } from "@/components/relacionamento/chat/caixa-de-mensagem";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { abrirAnexoDoChat } from "@/lib/relacionamento/api";
import {
  achatarMensagens,
  AUTOR_DO_LADO,
  mesclarComPendentes,
  rotuloDoDia,
  usePendentesDoChat,
  type ConversaDoChat,
  type LadoDoChat,
  type MensagemNaTela,
} from "@/lib/relacionamento/chat-comum";
import { useEntrarNaConversa, useEstadoDoChat } from "@/lib/relacionamento/chat-tempo-real";
import { useEnviarMensagem, useLerConversa, useMensagensDaConversa } from "@/lib/relacionamento/use-chat-comum";
import { cn } from "@/lib/utils";

/** Distância do fim, em px, até onde a pessoa ainda "está no fim" e a conversa acompanha o que chega. */
const MARGEM_DO_FIM = 96;

type Item = { tipo: "dia"; chave: string; rotulo: string } | { tipo: "mensagem"; mensagem: MensagemNaTela };

/** Intercala as mensagens com um separador a cada dia. */
function comSeparadoresDeDia(mensagens: MensagemNaTela[]): Item[] {
  const itens: Item[] = [];
  let ultimoDia = "";
  for (const mensagem of mensagens) {
    const rotulo = rotuloDoDia(mensagem.enviadaEm);
    if (rotulo !== ultimoDia) {
      itens.push({ tipo: "dia", chave: `dia-${mensagem.id}`, rotulo });
      ultimoDia = rotulo;
    }
    itens.push({ tipo: "mensagem", mensagem });
  }
  return itens;
}

/**
 * A conversa aberta: cabeçalho, mensagens e caixa de texto. Serve aos dois lados.
 *
 * - Tempo real: entra no grupo da conversa e recebe `mensagemNova` (ver chat-tempo-real.ts).
 * - Rolagem: abre no fim; acompanha o que chega se a pessoa já está no fim; se ela subiu para ler,
 *   não puxa a tela e mostra "Novas mensagens". Ao subir até o topo, carrega as anteriores sem
 *   pular a posição.
 * - Lida: marca ao abrir e quando chega mensagem do outro lado com a aba visível.
 */
export function PainelDaConversa({
  lado,
  conversaId,
  conversa,
  carregandoConversa,
  erroDaConversa,
  voltarHref,
  voltarSempre = false,
  acoes,
  aviso,
  somenteLeitura = false,
}: {
  lado: LadoDoChat;
  conversaId: string;
  conversa: ConversaDoChat | undefined;
  carregandoConversa: boolean;
  erroDaConversa: boolean;
  voltarHref: string;
  /** Mostra a seta de voltar também no computador (no portal dos pais ela é sempre necessária). */
  voltarSempre?: boolean;
  /** Botões à direita do cabeçalho (arquivar, reabrir). */
  acoes?: ReactNode;
  /** Faixa entre as mensagens e a caixa de texto (conversa arquivada). */
  aviso?: ReactNode;
  /** Esconde a caixa de texto. */
  somenteLeitura?: boolean;
}) {
  const meuAutor = AUTOR_DO_LADO[lado];
  const estado = useEstadoDoChat();
  useEntrarNaConversa(conversaId);

  const mensagensQuery = useMensagensDaConversa(lado, conversaId);
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = mensagensQuery;
  const pendentesTodos = usePendentesDoChat((s) => s.pendentes);
  const { enviar, reenviar, descartar } = useEnviarMensagem(lado);
  const ler = useLerConversa(lado);

  const mensagens = useMemo(() => {
    const doServidor = achatarMensagens(data);
    const pendentes = pendentesTodos.filter((p) => p.conversaId === conversaId);
    return mesclarComPendentes(doServidor, pendentes);
  }, [data, pendentesTodos, conversaId]);
  const itens = useMemo(() => comSeparadoresDeDia(mensagens), [mensagens]);

  const primeiraId = mensagens[0]?.id;
  const ultima = mensagens[mensagens.length - 1];
  const ultimaId = ultima?.id;
  const ultimaEhMinha = ultima?.autor === meuAutor;

  // ---------------------------------------------------------------- rolagem

  const rolagem = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  /** Se a pessoa está perto do fim. Ref para a lógica de rolagem; o estado abaixo, só para desenhar o botão. */
  const noFim = useRef(true);
  const [noFimNaTela, setNoFimNaTela] = useState(true);
  /** Altura e posição antes de carregar as anteriores, para manter o que a pessoa está lendo no lugar. */
  const ancora = useRef<{ altura: number; topo: number; primeiraId: string | undefined } | null>(null);
  const [ultimaVistaId, setUltimaVistaId] = useState<string | undefined>(undefined);

  const irParaOFim = useCallback(() => {
    const el = rolagem.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const aoRolar = useCallback(() => {
    const el = rolagem.current;
    if (!el) return;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < MARGEM_DO_FIM;
    noFim.current = perto;
    setNoFimNaTela(perto);
    if (perto) setUltimaVistaId(ultimaId);
  }, [ultimaId]);

  const carregarAnteriores = useCallback(() => {
    const el = rolagem.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    ancora.current = { altura: el.scrollHeight, topo: el.scrollTop, primeiraId };
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, primeiraId]);

  // Depois de cada mudança na lista: ou mantém a posição (chegaram as anteriores) ou vai ao fim.
  useLayoutEffect(() => {
    const el = rolagem.current;
    if (!el) return;

    const guardada = ancora.current;
    if (guardada && primeiraId !== guardada.primeiraId) {
      el.scrollTop = el.scrollHeight - guardada.altura + guardada.topo;
      ancora.current = null;
      return;
    }
    if (noFim.current || ultimaEhMinha) el.scrollTop = el.scrollHeight;
  }, [primeiraId, ultimaId, ultimaEhMinha]);

  // As anteriores chegaram sem mudar a primeira (nada mais antigo): solta a âncora.
  useEffect(() => {
    if (!isFetchingNextPage) ancora.current = null;
  }, [isFetchingNextPage]);

  // Ao chegar ao topo, busca as anteriores.
  useEffect(() => {
    const alvo = topo.current;
    const raiz = rolagem.current;
    if (!alvo || !raiz || !hasNextPage) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) carregarAnteriores();
      },
      { root: raiz, rootMargin: "80px 0px 0px 0px" }
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [hasNextPage, carregarAnteriores, primeiraId]);

  const haNovasAbaixo = !!ultimaId && ultimaId !== ultimaVistaId && !noFimNaTela && !ultimaEhMinha;

  // ---------------------------------------------------------------- lida

  const ultimaNaoLidaDoOutro = useMemo(
    () => [...mensagens].reverse().find((m) => m.autor !== meuAutor && !m.lida && !m.situacao)?.id,
    [mensagens, meuAutor]
  );
  const ultimoPedidoDeLida = useRef<string | undefined>(undefined);
  const { mutate: marcarComoLida } = ler;

  useEffect(() => {
    if (!ultimaNaoLidaDoOutro) return;

    const marcar = () => {
      if (document.visibilityState !== "visible" || ultimoPedidoDeLida.current === ultimaNaoLidaDoOutro) return;
      ultimoPedidoDeLida.current = ultimaNaoLidaDoOutro;
      marcarComoLida(conversaId, {
        // Se falhar, deixa tentar de novo na próxima mensagem ou na volta à aba.
        onError: () => {
          ultimoPedidoDeLida.current = undefined;
        },
      });
    };

    marcar();
    document.addEventListener("visibilitychange", marcar);
    return () => document.removeEventListener("visibilitychange", marcar);
  }, [ultimaNaoLidaDoOutro, conversaId, marcarComoLida]);

  // ---------------------------------------------------------------- ações

  function abrirAnexo(mensagem: MensagemNaTela) {
    if (!mensagem.anexo) return;
    abrirAnexoDoChat(lado, mensagem.id, mensagem.anexo.nome).catch((e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o anexo.")
    );
  }

  const titulo = conversa?.alunoNome ?? (carregandoConversa ? "Carregando…" : "Conversa");
  const detalhe = [conversa?.turma, lado === "escola" ? conversa?.responsaveis.join(", ") : null]
    .filter((x): x is string => !!x)
    .join(" · ");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background md:overflow-hidden md:rounded-xl md:border md:border-border">
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 md:px-3 md:pt-2">
        <Link
          href={voltarHref}
          aria-label="Voltar para as conversas"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            !voltarSempre && "md:hidden"
          )}
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>

        <div className="min-w-0 flex-1 md:pl-1">
          <h2 className="truncate font-heading text-[16px] font-semibold tracking-[-.02em]">{titulo}</h2>
          {detalhe && <p className="truncate text-[12.5px] text-muted-foreground">{detalhe}</p>}
          {conversa?.assunto && <p className="truncate text-[12.5px] text-muted-foreground">Assunto: {conversa.assunto}</p>}
        </div>

        {acoes}
      </header>

      {estado === "desconectado" && (
        <p role="status" className="flex items-center gap-1.5 bg-muted px-3 py-1 text-[12px] text-muted-foreground">
          <WifiOff aria-hidden className="size-3.5" /> Sem conexão em tempo real. A conversa se atualiza a cada 15 segundos.
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={rolagem}
          onScroll={aoRolar}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Mensagens da conversa"
          className="h-full overflow-y-auto overscroll-contain px-3 py-3"
        >
          <div ref={topo} aria-hidden className="h-px" />

          {isLoading && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-14 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
            </div>
          )}

          {isError && !data && (
            <div role="alert" className="flex flex-col items-start gap-1 rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
              <p>Não foi possível carregar as mensagens.</p>
              <button type="button" onClick={() => refetch()} className="min-h-11 font-semibold underline md:min-h-0">
                Tentar de novo
              </button>
            </div>
          )}

          {erroDaConversa && !conversa && !isLoading && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              Não foi possível carregar os dados da conversa.
            </p>
          )}

          {hasNextPage && (
            <div className="mb-3 flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={carregarAnteriores} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {isFetchingNextPage ? "Carregando…" : "Carregar mensagens anteriores"}
              </Button>
            </div>
          )}

          {data && mensagens.length === 0 && (
            <EstadoVazio
              icone={<MessagesSquare />}
              titulo="Nenhuma mensagem ainda"
              texto={lado === "escola" ? "Escreva a primeira mensagem para a família." : "Quando a escola escrever, a mensagem aparece aqui."}
              className="my-4"
            />
          )}

          <ol className="flex flex-col gap-2.5">
            {itens.map((item) =>
              item.tipo === "dia" ? (
                <li key={item.chave} className="my-1 self-center rounded-full bg-muted px-3 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
                  {item.rotulo}
                </li>
              ) : (
                <BolhaDaMensagem
                  key={item.mensagem.id}
                  mensagem={item.mensagem}
                  lado={lado}
                  aoAbrirAnexo={abrirAnexo}
                  aoReenviar={reenviar}
                  aoDescartar={descartar}
                />
              )
            )}
          </ol>
        </div>

        {haNovasAbaixo && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={irParaOFim}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
          >
            <ArrowDown aria-hidden /> Novas mensagens
          </Button>
        )}
      </div>

      {aviso}

      {!somenteLeitura && (
        <CaixaDeMensagem
          aoEnviar={(texto, arquivo) => enviar(conversaId, texto, arquivo)}
          comCamera={lado === "familia"}
          desabilitada={!conversa && carregandoConversa}
        />
      )}
    </div>
  );
}
