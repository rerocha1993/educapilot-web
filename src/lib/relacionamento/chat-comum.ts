import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { formatarData, formatarHora } from "@/lib/format/date";
import { responsavelJson } from "@/lib/reception/api-responsavel";
import { consulta, relacionamentoJson } from "./api";

/**
 * Peças do chat que servem aos dois lados (escola em /api/Relacionamento/chat, pais em
 * /api/Responsavel/chat): tipos, normalização, chaves de cache, o transporte e as mensagens que
 * ainda estão "enviando".
 *
 * O servidor omite nulos: tudo que é opcional passa pelos normalizadores abaixo.
 */

export type LadoDoChat = "escola" | "familia";
export type AutorDoChat = "Escola" | "Familia";
export type SituacaoDaConversa = "Aberta" | "Arquivada";

/** Quem é "eu" em cada lado: a bolha à direita é sempre a do próprio lado. */
export const AUTOR_DO_LADO: Record<LadoDoChat, AutorDoChat> = { escola: "Escola", familia: "Familia" };

export const TAMANHO_DA_PAGINA_DO_CHAT = 50;

// ------------------------------------------------------------------ tipos

export interface AnexoDoChat {
  nome: string;
  contentType: string;
  temMiniatura: boolean;
}

export interface MensagemDoChat {
  id: string;
  autor: AutorDoChat;
  autorNome: string;
  texto: string;
  anexo: AnexoDoChat | null;
  /** Instante UTC, do jeito que o servidor mandou (serve de cursor `antesDe`). */
  enviadaEm: string;
  /** Para mensagem de quem está vendo: o outro lado leu. Para a do outro lado: eu já li. */
  lida: boolean;
}

export interface ConversaDoChat {
  id: string;
  studentId: number;
  alunoNome: string;
  turma: string | null;
  classId: number | null;
  /** Só a escola recebe os nomes dos responsáveis. */
  responsaveis: string[];
  assunto: string | null;
  status: SituacaoDaConversa;
  ultimaMensagemEm: string | null;
  ultimaMensagemResumo: string | null;
  ultimaMensagemAutor: AutorDoChat | null;
  naoLidas: number;
}

export interface PaginaDeMensagens {
  /** Em ordem cronológica (a mais antiga primeiro). */
  itens: MensagemDoChat[];
  temMais: boolean;
}

export interface ResumoDoChat {
  conversasNaoLidas: number;
  mensagensNaoLidas: number;
}

export type MensagemCrua = Partial<Omit<MensagemDoChat, "anexo">> & { anexo?: Partial<AnexoDoChat> | null };
export type ConversaCrua = Partial<ConversaDoChat>;

function autor(valor: string | null | undefined): AutorDoChat {
  return valor === "Familia" ? "Familia" : "Escola";
}

export function normalizarMensagem(m: MensagemCrua): MensagemDoChat {
  return {
    id: String(m.id ?? ""),
    autor: autor(m.autor),
    autorNome: m.autorNome ?? "",
    texto: m.texto ?? "",
    anexo: m.anexo
      ? {
          nome: m.anexo.nome ?? "Arquivo",
          contentType: m.anexo.contentType ?? "",
          temMiniatura: m.anexo.temMiniatura ?? false,
        }
      : null,
    enviadaEm: m.enviadaEm ?? "",
    lida: m.lida ?? false,
  };
}

export function normalizarConversa(c: ConversaCrua): ConversaDoChat {
  return {
    id: String(c.id ?? ""),
    studentId: c.studentId ?? 0,
    alunoNome: c.alunoNome ?? "",
    turma: c.turma ?? null,
    classId: c.classId ?? null,
    responsaveis: c.responsaveis ?? [],
    assunto: c.assunto?.trim() ? c.assunto : null,
    status: c.status === "Arquivada" ? "Arquivada" : "Aberta",
    ultimaMensagemEm: c.ultimaMensagemEm ?? null,
    ultimaMensagemResumo: c.ultimaMensagemResumo ?? null,
    ultimaMensagemAutor: c.ultimaMensagemAutor ? autor(c.ultimaMensagemAutor) : null,
    naoLidas: c.naoLidas ?? 0,
  };
}

export function normalizarResumo(r: Partial<ResumoDoChat> | null | undefined): ResumoDoChat {
  return { conversasNaoLidas: r?.conversasNaoLidas ?? 0, mensagensNaoLidas: r?.mensagensNaoLidas ?? 0 };
}

const emOrdem = (a: MensagemDoChat, b: MensagemDoChat) => Date.parse(a.enviadaEm) - Date.parse(b.enviadaEm);

// ------------------------------------------------------------------ chaves de cache

/** Cache do portal dos pais que carrega `mensagensNaoLidas` (GET /inicio). */
export const CHAVE_DO_INICIO_DOS_PAIS = ["responsavel", "portal", "inicio"] as const;

export const CHAVES_DO_CHAT = {
  tudo: ["chat"] as const,
  /** Prefixo de todas as listas de conversa, dos dois lados. */
  conversas: ["chat", "conversas"] as const,
  mensagens: (conversaId: string) => ["chat", "mensagens", conversaId] as const,
  conversa: (conversaId: string) => ["chat", "conversa", conversaId] as const,
  resumo: ["chat", "resumo"] as const,
};

// ------------------------------------------------------------------ transporte

/** Chamada JSON ao chat do lado certo; `caminho` começa depois de /chat. */
export function chamarChat<T>(lado: LadoDoChat, caminho: string, init: RequestInit, falha: string): Promise<T> {
  return lado === "escola"
    ? relacionamentoJson<T>(`/chat${caminho}`, init, falha)
    : responsavelJson<T>(`/chat${caminho}`, init, falha);
}

export async function buscarMensagens(
  lado: LadoDoChat,
  conversaId: string,
  antesDe: string | undefined
): Promise<PaginaDeMensagens> {
  const r = await chamarChat<{ itens?: MensagemCrua[]; temMais?: boolean } | null>(
    lado,
    `/conversas/${conversaId}/mensagens${consulta({ antesDe, tamanho: TAMANHO_DA_PAGINA_DO_CHAT })}`,
    {},
    "Não foi possível carregar as mensagens."
  );
  return { itens: (r?.itens ?? []).map(normalizarMensagem).sort(emOrdem), temMais: r?.temMais ?? false };
}

// ------------------------------------------------------------------ cache das mensagens

/** As páginas, da mais nova (índice 0) para a mais antiga. */
export type MensagensEmCache = InfiniteData<PaginaDeMensagens, string | undefined>;

/** Todas as mensagens carregadas, sem repetição e em ordem cronológica. */
export function achatarMensagens(dados: { pages: PaginaDeMensagens[] } | undefined): MensagemDoChat[] {
  const porId = new Map<string, MensagemDoChat>();
  for (const pagina of dados?.pages ?? []) for (const m of pagina.itens) porId.set(m.id, m);
  return [...porId.values()].sort(emOrdem);
}

/** Põe a mensagem na página mais nova, sem duplicar (o servidor repete o que o POST já devolveu). */
export function anexarMensagemAoCache(queryClient: QueryClient, conversaId: string, mensagem: MensagemDoChat) {
  queryClient.setQueryData<MensagensEmCache>(CHAVES_DO_CHAT.mensagens(conversaId), (atual) => {
    const primeira = atual?.pages[0];
    if (!atual || !primeira) return atual;

    const jaTem = atual.pages.some((p) => p.itens.some((m) => m.id === mensagem.id));
    if (jaTem) {
      return {
        ...atual,
        pages: atual.pages.map((p) => ({ ...p, itens: p.itens.map((m) => (m.id === mensagem.id ? mensagem : m)) })),
      };
    }
    return { ...atual, pages: [{ ...primeira, itens: [...primeira.itens, mensagem] }, ...atual.pages.slice(1)] };
  });
}

/** Marca como lidas, no cache, as mensagens que o outro lado mandou. */
export function marcarComoLidasNoCache(queryClient: QueryClient, conversaId: string, meuAutor: AutorDoChat) {
  queryClient.setQueryData<MensagensEmCache>(CHAVES_DO_CHAT.mensagens(conversaId), (atual) =>
    atual
      ? {
          ...atual,
          pages: atual.pages.map((p) => ({
            ...p,
            itens: p.itens.map((m) => (m.autor !== meuAutor && !m.lida ? { ...m, lida: true } : m)),
          })),
        }
      : atual
  );
}

/** Troca a conversa nas listas em que ela já está. Devolve se achou em alguma. */
export function atualizarConversaNasListas(
  queryClient: QueryClient,
  conversaId: string,
  atualizar: (c: ConversaDoChat) => ConversaDoChat
): boolean {
  let achou = false;
  queryClient.setQueriesData<ConversaDoChat[]>({ queryKey: CHAVES_DO_CHAT.conversas }, (lista) => {
    if (!Array.isArray(lista) || !lista.some((c) => c.id === conversaId)) return lista;
    achou = true;
    return lista.map((c) => (c.id === conversaId ? atualizar(c) : c));
  });
  return achou;
}

// ------------------------------------------------------------------ mensagens "enviando"

/**
 * Mensagem que o usuário mandou e o servidor ainda não confirmou.
 *
 * Fica fora do cache do TanStack de propósito: uma atualização da lista (o polling, a reconexão)
 * troca o cache inteiro pelo que o servidor tem, e a mensagem em trânsito sumiria da tela.
 */
export interface MensagemPendente {
  tmpId: string;
  conversaId: string;
  autor: AutorDoChat;
  autorNome: string;
  texto: string;
  arquivo: File | null;
  criadaEm: string;
  situacao: "enviando" | "falhou";
  erro: string | null;
  /** Ids que o cache já tinha ao enviar: quem chegar depois, igual a esta, é ela mesma. */
  conhecidas: string[];
}

interface EstadoDosPendentes {
  pendentes: MensagemPendente[];
  adicionar: (p: MensagemPendente) => void;
  atualizar: (tmpId: string, parte: Partial<MensagemPendente>) => void;
  remover: (tmpId: string) => void;
}

export const usePendentesDoChat = create<EstadoDosPendentes>((set) => ({
  pendentes: [],
  adicionar: (p) => set((s) => ({ pendentes: [...s.pendentes.filter((x) => x.tmpId !== p.tmpId), p] })),
  atualizar: (tmpId, parte) =>
    set((s) => ({ pendentes: s.pendentes.map((x) => (x.tmpId === tmpId ? { ...x, ...parte } : x)) })),
  remover: (tmpId) => set((s) => ({ pendentes: s.pendentes.filter((x) => x.tmpId !== tmpId) })),
}));

export function novoIdTemporario(): string {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** O que a bolha precisa: a mensagem, com a situação quando ainda não é do servidor. */
export interface MensagemNaTela extends MensagemDoChat {
  situacao?: "enviando" | "falhou";
  tmpId?: string;
  erro?: string | null;
}

/** A mesma mensagem que o servidor já devolveu (chegou pelo tempo real antes da resposta do POST). */
function jaChegou(p: MensagemPendente, doServidor: MensagemDoChat[]): boolean {
  const conhecidas = new Set(p.conhecidas);
  return doServidor.some(
    (m) =>
      !conhecidas.has(m.id) &&
      m.autor === p.autor &&
      m.texto.trim() === p.texto.trim() &&
      (p.arquivo !== null) === (m.anexo !== null)
  );
}

/** Mensagens do servidor mais as em trânsito desta conversa, em ordem cronológica. */
export function mesclarComPendentes(doServidor: MensagemDoChat[], pendentes: MensagemPendente[]): MensagemNaTela[] {
  const emTransito: MensagemNaTela[] = pendentes
    .filter((p) => p.situacao === "falhou" || !jaChegou(p, doServidor))
    .map((p) => ({
      id: p.tmpId,
      tmpId: p.tmpId,
      autor: p.autor,
      autorNome: p.autorNome,
      texto: p.texto,
      anexo: p.arquivo ? { nome: p.arquivo.name, contentType: p.arquivo.type, temMiniatura: false } : null,
      enviadaEm: p.criadaEm,
      lida: false,
      situacao: p.situacao,
      erro: p.erro,
    }));
  return [...doServidor, ...emTransito];
}

// ------------------------------------------------------------------ apresentação

/** "14:32" se for de hoje, "dd/MM" nos outros dias. Para a lista de conversas. */
export function rotuloDaUltimaMensagem(instante: string | null): string {
  if (!instante) return "";
  const dia = formatarData(instante);
  if (dia === formatarData(new Date())) return formatarHora(instante);
  return dia.slice(0, 5);
}

/** "Hoje", "Ontem" ou "dd/MM/yyyy". Para o separador de dias dentro da conversa. */
export function rotuloDoDia(instante: string): string {
  const dia = formatarData(instante);
  if (dia === formatarData(new Date())) return "Hoje";
  if (dia === formatarData(new Date(Date.now() - 24 * 60 * 60 * 1000))) return "Ontem";
  return dia;
}
