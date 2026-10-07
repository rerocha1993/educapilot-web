import { useEffect, useSyncExternalStore } from "react";
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

import { getToken } from "@/lib/auth/session";
import {
  anexarMensagemAoCache,
  atualizarConversaNasListas,
  AUTOR_DO_LADO,
  CHAVES_DO_CHAT,
  CHAVE_DO_INICIO_DOS_PAIS,
  normalizarConversa,
  normalizarMensagem,
  type ConversaCrua,
  type LadoDoChat,
  type MensagemCrua,
} from "./chat-comum";

/**
 * Chat em tempo real (SignalR).
 *
 * Uma conexão só por sessão, aberta quando alguém precisa dela (o shell da escola ou o portal dos
 * pais, e cada conversa aberta) e fechada quando ninguém mais precisa ou ao sair. A reconexão é
 * automática; se ela desistir, uma nova tentativa roda de tempos em tempos. Enquanto a conexão
 * não está de pé, as consultas abertas voltam a perguntar ao servidor a cada 15 s
 * (`intervaloDeReserva`): a tela nunca fica parada, só deixa de ser instantânea.
 *
 * O JWT vai por `accessTokenFactory` (WebSocket não manda cabeçalho; o SignalR põe o token na
 * query string, e o servidor precisa lê-lo no caminho do hub).
 */

/** Caminho do hub no servidor (confirmar com o backend; fica aqui para trocar num lugar só). */
export const ROTA_DO_HUB_DO_CHAT = "/api/hubs/chat";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/** Intervalo de atualização das consultas abertas enquanto o tempo real está fora do ar. */
const INTERVALO_DE_RESERVA = 15_000;
/** Folga antes de fechar a conexão quando ninguém a usa (troca de tela, StrictMode). */
const FOLGA_PARA_FECHAR = 5_000;
const ESPERA_DA_NOVA_TENTATIVA = [5_000, 15_000, 30_000, 60_000];

export type EstadoDoChat = "conectado" | "conectando" | "desconectado";

interface EventosDoChat {
  mensagemNova: { conversaId: string; mensagem: MensagemCrua };
  conversaAtualizada: { conversa: ConversaCrua };
}

type Ouvinte<E extends keyof EventosDoChat> = (payload: EventosDoChat[E]) => void;

let conexao: HubConnection | null = null;
let estado: EstadoDoChat = "desconectado";
let usuarios = 0;
let temporizadorDeParada: ReturnType<typeof setTimeout> | null = null;
let temporizadorDeNovaTentativa: ReturnType<typeof setTimeout> | null = null;
let tentativas = 0;

const ouvintesDoEstado = new Set<() => void>();
const ouvintes = {
  mensagemNova: new Set<Ouvinte<"mensagemNova">>(),
  conversaAtualizada: new Set<Ouvinte<"conversaAtualizada">>(),
};
/** Conversas em que a tela entrou: o servidor perde o grupo ao reconectar, então entramos de novo. */
const conversasAbertas = new Map<string, number>();

function definirEstado(novo: EstadoDoChat) {
  if (novo === estado) return;
  estado = novo;
  ouvintesDoEstado.forEach((f) => f());
}

async function entrarNasConversas(c: HubConnection) {
  for (const id of conversasAbertas.keys()) {
    try {
      await c.invoke("EntrarNaConversa", id);
    } catch {
      // sem permissão ou conversa apagada: a tela segue só com a lista
    }
  }
}

function criarConexao(): HubConnection {
  const c = new HubConnectionBuilder()
    .withUrl(`${baseUrl}${ROTA_DO_HUB_DO_CHAT}`, {
      accessTokenFactory: () => getToken() ?? "",
      // O login é por Bearer, não por cookie: sem credenciais, o servidor não precisa liberar CORS com cookies.
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 20_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build();

  c.on("mensagemNova", (payload: EventosDoChat["mensagemNova"]) => {
    for (const f of ouvintes.mensagemNova) f(payload);
  });
  c.on("conversaAtualizada", (payload: EventosDoChat["conversaAtualizada"]) => {
    for (const f of ouvintes.conversaAtualizada) f(payload);
  });

  c.onreconnecting(() => definirEstado("conectando"));
  c.onreconnected(() => {
    void entrarNasConversas(c).then(() => definirEstado("conectado"));
  });
  c.onclose(() => {
    definirEstado("desconectado");
    agendarNovaTentativa();
  });
  return c;
}

function agendarNovaTentativa() {
  if (usuarios === 0 || temporizadorDeNovaTentativa) return;
  const espera = ESPERA_DA_NOVA_TENTATIVA[Math.min(tentativas, ESPERA_DA_NOVA_TENTATIVA.length - 1)];
  tentativas += 1;
  temporizadorDeNovaTentativa = setTimeout(() => {
    temporizadorDeNovaTentativa = null;
    void conectar();
  }, espera);
}

async function conectar() {
  if (typeof window === "undefined" || !getToken()) return;
  conexao ??= criarConexao();
  const c = conexao;
  if (c.state !== HubConnectionState.Disconnected) return;

  definirEstado("conectando");
  try {
    await c.start();
    if (conexao !== c) return;
    tentativas = 0;
    await entrarNasConversas(c);
    definirEstado("conectado");
  } catch {
    if (conexao !== c) return;
    definirEstado("desconectado");
    agendarNovaTentativa();
  }
}

/**
 * Fecha a conexão e esquece as conversas abertas. Chamar ao sair da conta: o token vai embora e a
 * conexão não pode continuar com ele.
 */
export async function desconectarChat(): Promise<void> {
  if (temporizadorDeParada) clearTimeout(temporizadorDeParada);
  if (temporizadorDeNovaTentativa) clearTimeout(temporizadorDeNovaTentativa);
  temporizadorDeParada = null;
  temporizadorDeNovaTentativa = null;
  tentativas = 0;
  usuarios = 0;
  conversasAbertas.clear();

  const c = conexao;
  conexao = null;
  definirEstado("desconectado");
  if (c) {
    try {
      await c.stop();
    } catch {
      // já estava fechada
    }
  }
}

/** Declara que alguém precisa da conexão. Devolve a função que solta. Abre a conexão na primeira. */
export function adquirirChat(): () => void {
  usuarios += 1;
  if (temporizadorDeParada) {
    clearTimeout(temporizadorDeParada);
    temporizadorDeParada = null;
  }
  void conectar();

  let solto = false;
  return () => {
    if (solto) return;
    solto = true;
    usuarios = Math.max(0, usuarios - 1);
    if (usuarios > 0 || temporizadorDeParada) return;
    temporizadorDeParada = setTimeout(() => {
      temporizadorDeParada = null;
      if (usuarios === 0) void desconectarChat();
    }, FOLGA_PARA_FECHAR);
  };
}

/** Escuta um evento do hub. Devolve a função que para de escutar. */
export function aoReceber<E extends keyof EventosDoChat>(evento: E, tratador: Ouvinte<E>): () => void {
  const grupo = ouvintes[evento] as Set<Ouvinte<E>>;
  grupo.add(tratador);
  return () => {
    grupo.delete(tratador);
  };
}

/**
 * Entra no grupo da conversa para receber `mensagemNova` dela. Devolve a função que sai (só do
 * nosso controle: o grupo no servidor acaba junto com a conexão).
 */
export function entrarNaConversa(conversaId: string): () => void {
  conversasAbertas.set(conversaId, (conversasAbertas.get(conversaId) ?? 0) + 1);
  if (conexao?.state === HubConnectionState.Connected) {
    conexao.invoke("EntrarNaConversa", conversaId).catch(() => {});
  }

  return () => {
    const restantes = (conversasAbertas.get(conversaId) ?? 1) - 1;
    if (restantes <= 0) conversasAbertas.delete(conversaId);
    else conversasAbertas.set(conversaId, restantes);
  };
}

function assinarEstado(aoMudar: () => void): () => void {
  ouvintesDoEstado.add(aoMudar);
  return () => {
    ouvintesDoEstado.delete(aoMudar);
  };
}

/** Estado da conexão, para a tela. No servidor (SSR) é sempre "desconectado". */
export function useEstadoDoChat(): EstadoDoChat {
  return useSyncExternalStore(
    assinarEstado,
    () => estado,
    () => "desconectado"
  );
}

/**
 * Valor de `refetchInterval` das consultas do chat: nada com o tempo real de pé; 15 s sem ele.
 * `false` é o jeito do TanStack de dizer "sem polling".
 */
export function useIntervaloDeReserva(): number | false {
  return useEstadoDoChat() === "conectado" ? false : INTERVALO_DE_RESERVA;
}

/** Mantém a conexão aberta enquanto a tela estiver montada. */
export function useConexaoDoChat(habilitada = true) {
  useEffect(() => {
    if (!habilitada) return;
    return adquirirChat();
  }, [habilitada]);
}

/** Entra na conversa aberta para receber as mensagens dela na hora. */
export function useEntrarNaConversa(conversaId: string) {
  useConexaoDoChat(!!conversaId);

  // A reconexão (e o início, se a conexão ainda estiver abrindo) refaz a entrada sozinha:
  // `entrarNasConversas` percorre as conversas registradas aqui.
  useEffect(() => {
    if (!conversaId) return;
    return entrarNaConversa(conversaId);
  }, [conversaId]);
}

/**
 * Liga o tempo real ao TanStack Query. Monte uma vez por sessão (o shell da escola, o portal dos
 * pais).
 *
 * - `mensagemNova`: anexa à conversa em cache (sem duplicar por id) e invalida a lista e o resumo.
 * - `conversaAtualizada`: troca a conversa nas listas; se nenhuma a tinha, invalida (conversa nova).
 * - Ao (re)conectar: invalida o chat inteiro, porque o que veio durante a queda não chegou.
 */
export function useChatTempoReal(lado: LadoDoChat, habilitado: boolean) {
  const queryClient = useQueryClient();
  useConexaoDoChat(habilitado);
  const conectado = useEstadoDoChat() === "conectado";

  useEffect(() => {
    if (!habilitado) return;

    const meuAutor = AUTOR_DO_LADO[lado];

    const sairMensagem = aoReceber("mensagemNova", ({ conversaId, mensagem }) => {
      if (!conversaId || !mensagem) return;
      const nova = normalizarMensagem(mensagem);
      anexarMensagemAoCache(queryClient, conversaId, nova);
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversas });
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.resumo });
      if (nova.autor !== meuAutor) void queryClient.invalidateQueries({ queryKey: CHAVE_DO_INICIO_DOS_PAIS });
    });

    const sairConversa = aoReceber("conversaAtualizada", ({ conversa }) => {
      if (!conversa) return;
      const atualizada = normalizarConversa(conversa);
      if (!atualizada.id) return;

      queryClient.setQueryData(CHAVES_DO_CHAT.conversa(atualizada.id), (antiga: unknown) =>
        antiga ? atualizada : antiga
      );
      const achou = atualizarConversaNasListas(queryClient, atualizada.id, () => atualizada);
      if (!achou) void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.conversas });
      void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.resumo });
      void queryClient.invalidateQueries({ queryKey: CHAVE_DO_INICIO_DOS_PAIS });
    });

    return () => {
      sairMensagem();
      sairConversa();
    };
  }, [habilitado, lado, queryClient]);

  useEffect(() => {
    if (!habilitado || !conectado) return;
    void queryClient.invalidateQueries({ queryKey: CHAVES_DO_CHAT.tudo });
    void queryClient.invalidateQueries({ queryKey: CHAVE_DO_INICIO_DOS_PAIS });
  }, [habilitado, conectado, queryClient]);
}
