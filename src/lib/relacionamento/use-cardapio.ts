import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { relacionamentoJson } from "./api";
import { ETIQUETAS_DO_PRATO, posicaoDaRefeicao, posicaoDoDia } from "./cardapio-vocabulario";

/**
 * Cardápio semanal, pelo lado da escola (2026-10) — /api/Relacionamento/cardapio, área `cardapio`.
 *
 * Mesma regra dos outros hooks do módulo: o servidor omite o que é nulo, então tudo passa por
 * normalizadores. A semana é sempre a segunda-feira ("yyyy-MM-dd"). O cardápio é uma vitrine das
 * refeições: sem dado de aluno e sem restrição alimentar; as etiquetas são do prato.
 *
 * Quem escreve é quem não é professor; o servidor responde 403 ao professor, e a tela só não
 * oferece o que ele não pode.
 */

const RAIZ = ["relacionamento", "cardapio"] as const;

// ------------------------------------------------------------------ tipos

export type StatusDoCardapio = "Rascunho" | "Publicado";

const status = (v: string | null | undefined): StatusDoCardapio => (v === "Publicado" ? "Publicado" : "Rascunho");
const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

export interface PratoDoCardapio {
  dia: string;
  refeicao: string;
  descricao: string;
  etiquetas: string[];
}

export interface TurmaDoCardapio {
  classId: number;
  nome: string;
}

export interface CardapioResumo {
  id: string;
  semana: string;
  variacao: number;
  titulo: string | null;
  status: StatusDoCardapio;
  escolaToda: boolean;
  turmas: TurmaDoCardapio[];
  pratos: number;
  publicadoEm: string | null;
  atualizado: boolean;
}

export interface CardapioDetalhe {
  id: string;
  semana: string;
  variacao: number;
  titulo: string | null;
  observacao: string | null;
  status: StatusDoCardapio;
  escolaToda: boolean;
  turmas: TurmaDoCardapio[];
  itens: PratoDoCardapio[];
  publicadoEm: string | null;
  atualizado: boolean;
  atualizadoEm: string | null;
}

export interface ConfiguracaoDoCardapio {
  cafeDaManha: boolean;
  lancheDaManha: boolean;
  almoco: boolean;
  lancheDaTarde: boolean;
  jantar: boolean;
  mamadeira: boolean;
  papa: boolean;
  sabado: boolean;
  /** As refeições ligadas, na ordem do dia. */
  refeicoes: string[];
  /** Os dias da grade (segunda a sexta, e o sábado se ligado). */
  dias: string[];
}

export const CONFIGURACAO_PADRAO: ConfiguracaoDoCardapio = {
  cafeDaManha: true,
  lancheDaManha: true,
  almoco: true,
  lancheDaTarde: true,
  jantar: false,
  mamadeira: false,
  papa: false,
  sabado: false,
  refeicoes: ["CafeDaManha", "LancheDaManha", "Almoco", "LancheDaTarde"],
  dias: ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
};

export interface SemanaDoCardapio {
  semana: string;
  semanaAnterior: string;
  proximaSemana: string;
  cardapios: CardapioResumo[];
  configuracao: ConfiguracaoDoCardapio;
}

/** O que se envia ao salvar a grade inteira. */
export interface CardapioParaSalvar {
  semana: string;
  titulo: string;
  observacao: string;
  turmaIds: number[];
  itens: PratoDoCardapio[];
}

// ------------------------------------------------------------------ normalizadores

const ETIQUETAS_CONHECIDAS: readonly string[] = ETIQUETAS_DO_PRATO.map((e) => e.id);

export function pratos(brutos: Partial<PratoDoCardapio>[] | null | undefined): PratoDoCardapio[] {
  return (brutos ?? [])
    .map((p) => ({
      dia: p.dia ?? "",
      refeicao: p.refeicao ?? "",
      descricao: p.descricao ?? "",
      etiquetas: (p.etiquetas ?? []).filter((e) => ETIQUETAS_CONHECIDAS.includes(e)),
    }))
    .sort((a, b) => posicaoDoDia(a.dia) - posicaoDoDia(b.dia) || posicaoDaRefeicao(a.refeicao) - posicaoDaRefeicao(b.refeicao));
}

function turmas(brutas: Partial<TurmaDoCardapio>[] | null | undefined): TurmaDoCardapio[] {
  return (brutas ?? []).map((t) => ({ classId: t.classId ?? 0, nome: t.nome ?? "" }));
}

export function configuracao(c: Partial<ConfiguracaoDoCardapio> | null | undefined): ConfiguracaoDoCardapio {
  if (!c) return CONFIGURACAO_PADRAO;
  return {
    cafeDaManha: c.cafeDaManha ?? true,
    lancheDaManha: c.lancheDaManha ?? true,
    almoco: c.almoco ?? true,
    lancheDaTarde: c.lancheDaTarde ?? true,
    jantar: c.jantar ?? false,
    mamadeira: c.mamadeira ?? false,
    papa: c.papa ?? false,
    sabado: c.sabado ?? false,
    refeicoes: c.refeicoes ?? CONFIGURACAO_PADRAO.refeicoes,
    dias: c.dias ?? CONFIGURACAO_PADRAO.dias,
  };
}

function resumo(c: Partial<CardapioResumo>): CardapioResumo {
  return {
    id: c.id ?? "",
    semana: dia(c.semana),
    variacao: c.variacao ?? 1,
    titulo: c.titulo?.trim() ? c.titulo : null,
    status: status(c.status),
    escolaToda: c.escolaToda ?? true,
    turmas: turmas(c.turmas),
    pratos: c.pratos ?? 0,
    publicadoEm: c.publicadoEm ?? null,
    atualizado: c.atualizado ?? false,
  };
}

function detalhe(c: (Partial<Omit<CardapioDetalhe, "itens" | "turmas">> & { itens?: Partial<PratoDoCardapio>[]; turmas?: Partial<TurmaDoCardapio>[] }) | null | undefined): CardapioDetalhe {
  return {
    id: c?.id ?? "",
    semana: dia(c?.semana),
    variacao: c?.variacao ?? 1,
    titulo: c?.titulo?.trim() ? c.titulo : null,
    observacao: c?.observacao?.trim() ? c.observacao : null,
    status: status(c?.status),
    escolaToda: c?.escolaToda ?? true,
    turmas: turmas(c?.turmas),
    itens: pratos(c?.itens),
    publicadoEm: c?.publicadoEm ?? null,
    atualizado: c?.atualizado ?? false,
    atualizadoEm: c?.atualizadoEm ?? null,
  };
}

// ------------------------------------------------------------------ consultas

/** Os cardápios da semana (qualquer dia dela vale) e as refeições que a escola usa. */
export function useCardapiosDaSemana(semana: string, ativo = true) {
  return useQuery({
    queryKey: [...RAIZ, "semana", semana],
    enabled: ativo && !!semana,
    staleTime: 15_000,
    queryFn: async (): Promise<SemanaDoCardapio> => {
      const r = await relacionamentoJson<
        (Partial<Omit<SemanaDoCardapio, "cardapios" | "configuracao">> & { cardapios?: Partial<CardapioResumo>[]; configuracao?: Partial<ConfiguracaoDoCardapio> }) | null
      >(`/cardapio?semana=${encodeURIComponent(semana)}`, {}, "Não foi possível carregar o cardápio.");
      return {
        semana: dia(r?.semana) || semana,
        semanaAnterior: dia(r?.semanaAnterior),
        proximaSemana: dia(r?.proximaSemana),
        cardapios: (r?.cardapios ?? []).map(resumo),
        configuracao: configuracao(r?.configuracao),
      };
    },
  });
}

/** O cardápio inteiro, com a grade de pratos. */
export function useCardapio(id: string | null) {
  return useQuery({
    queryKey: [...RAIZ, "detalhe", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async () =>
      detalhe(await relacionamentoJson(`/cardapio/${id}`, {}, "Não foi possível carregar o cardápio.")),
  });
}

// ------------------------------------------------------------------ gravações

function corpo(dados: CardapioParaSalvar) {
  return JSON.stringify({
    semana: dados.semana,
    titulo: dados.titulo.trim() || null,
    observacao: dados.observacao.trim() || null,
    turmaIds: dados.turmaIds,
    // Célula sem prato não vai: o servidor apaga o que não vem.
    itens: dados.itens.filter((i) => i.descricao.trim()),
  });
}

/** Cria (sem `id`) ou substitui a grade inteira de um cardápio. */
export function useSalvarCardapio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: CardapioParaSalvar & { id?: string | null }) =>
      detalhe(
        await relacionamentoJson(
          id ? `/cardapio/${id}` : "/cardapio",
          { method: id ? "PUT" : "POST", body: corpo(dados) },
          "Não foi possível salvar o cardápio."
        )
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}

/** Copia os pratos para uma semana (e turmas), como rascunho. `turmaIds` nulo repete as turmas do original. */
export function useCopiarCardapio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, semana, turmaIds }: { id: string; semana: string; turmaIds: number[] | null }) =>
      detalhe(
        await relacionamentoJson(
          `/cardapio/${id}/copiar`,
          { method: "POST", body: JSON.stringify({ semana, turmaIds }) },
          "Não foi possível copiar o cardápio."
        )
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}

function useTransicao(caminho: "publicar" | "despublicar", falha: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      detalhe(await relacionamentoJson(`/cardapio/${id}/${caminho}`, { method: "POST" }, falha)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}

/** Rascunho para Publicado. O push às famílias sai só na primeira publicação. */
export const usePublicarCardapio = () => useTransicao("publicar", "Não foi possível publicar o cardápio.");

/** Tira das famílias (volta a Rascunho). */
export const useDespublicarCardapio = () => useTransicao("despublicar", "Não foi possível despublicar o cardápio.");

/** Só rascunho. */
export function useExcluirCardapio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/cardapio/${id}`, { method: "DELETE" }, "Não foi possível excluir o cardápio."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}

/** Liga e desliga as refeições da escola e o sábado. */
export function useSalvarConfiguracaoDoCardapio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (c: Pick<ConfiguracaoDoCardapio, "cafeDaManha" | "lancheDaManha" | "almoco" | "lancheDaTarde" | "jantar" | "mamadeira" | "papa" | "sabado">) =>
      configuracao(
        await relacionamentoJson<Partial<ConfiguracaoDoCardapio>>(
          "/cardapio/configuracao",
          { method: "PUT", body: JSON.stringify(c) },
          "Não foi possível salvar as refeições."
        )
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RAIZ }),
  });
}
