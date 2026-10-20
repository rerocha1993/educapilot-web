import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mensagemDeErro, rhFetch, rhJson } from "./api";

/**
 * Parecer de permanência (2026-10) — /api/Rh/desempenho/funcionarios/{id}/parecer, /decisoes, /planos.
 * Contrato: docs/reunioes/PARECER.md do core. Tudo da gestão (área rh:desempenho), menos o plano em "Meu desempenho".
 * A API omite os campos nulos: aqui eles são opcionais e se testam com `== null`.
 */

const CHAVE = "rh-desempenho";

export const RECOMENDACOES = ["Manter", "Acompanhar", "PlanoDeMelhoria", "AvaliarDesligamento"] as const;
export const ROTULO_DA_RECOMENDACAO: Record<string, string> = {
  Manter: "Manter",
  Acompanhar: "Acompanhar",
  PlanoDeMelhoria: "Plano de melhoria",
  AvaliarDesligamento: "Avaliar desligamento",
};

export const DECISOES = ["Manter", "Acompanhar", "PlanoDeMelhoria", "Desligar"] as const;
export type TipoDeDecisao = (typeof DECISOES)[number];
export const ROTULO_DA_DECISAO: Record<string, string> = {
  Manter: "Manter",
  Acompanhar: "Acompanhar",
  PlanoDeMelhoria: "Plano de melhoria",
  Desligar: "Desligar",
};

/** A decisão que corresponde a cada recomendação (a "pré-selecionada" no diálogo). */
export const DECISAO_DA_RECOMENDACAO: Record<string, TipoDeDecisao> = {
  Manter: "Manter",
  Acompanhar: "Acompanhar",
  PlanoDeMelhoria: "PlanoDeMelhoria",
  AvaliarDesligamento: "Desligar",
};

export const STATUS_DO_PLANO = ["EmAndamento", "Cumprido", "NaoCumprido", "Cancelado"] as const;
export const ROTULO_DO_STATUS_DO_PLANO: Record<string, string> = {
  EmAndamento: "Em andamento",
  Cumprido: "Cumprido",
  NaoCumprido: "Não cumprido",
  Cancelado: "Cancelado",
};

/** Mínimos do contrato (PARECER.md, "Decisão registrada"). */
export const MINIMO_DA_JUSTIFICATIVA = 20;
export const MINIMO_DA_JUSTIFICATIVA_AO_DISCORDAR = 60;
export const DIAS_ATE_REVISAO: Record<string, number> = { Acompanhar: 30, PlanoDeMelhoria: 90 };
export const DIAS_DO_PRAZO_DO_PLANO = 60;

// ------------------------------------------------------------------ tipos

export interface MotivoDoParecer {
  regra: string;
  texto: string;
  peso: "alto" | "medio" | "baixo" | string;
}

export interface ProvaDoParecer {
  tipo: "NotaMensal" | "Advertencia" | "ComponenteBaixo" | "Reuniao" | "Plano" | string;
  data?: string | null;
  titulo: string;
  detalhe?: string | null;
}

export interface PlanoResumo {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  objetivo: string;
  encerradoEm?: string | null;
  notaNoInicio?: number | null;
  notaNoFim?: number | null;
}

export interface DecisaoDePermanencia {
  id: string;
  data: string;
  decisao: string;
  recomendacaoDoSistema: string;
  concordaComParecer: boolean;
  justificativa: string;
  proximaRevisaoEm?: string | null;
  planoId?: string | null;
  decididoPorNome?: string | null;
  criadoEm?: string | null;
}

export interface Parecer {
  recomendacao: string;
  poucoHistorico: boolean;
  notaAtual?: number | null;
  faixaAtual?: string | null;
  mediaSeisMeses?: number | null;
  tendencia?: number | null;
  mesesSeguidosEmAtencao?: number | null;
  motivos: MotivoDoParecer[];
  provas: ProvaDoParecer[];
  planoEmAndamento?: PlanoResumo | null;
  ultimaDecisao?: DecisaoDePermanencia | null;
  revisaoVencida: boolean;
}

export interface MetaDoPlano {
  id: string;
  descricao: string;
  componente?: string | null;
  notaAlvo?: number | null;
  ordem?: number;
  /** Nota atual do componente (só nas metas com componente). */
  notaAtual?: number | null;
  /** 0–100; se o servidor não mandar, a tela calcula de notaAtual × notaAlvo. */
  progresso?: number | null;
}

export interface AcompanhamentoDoPlano {
  id: string;
  data: string;
  texto: string;
  registradoPorNome?: string | null;
}

export interface PlanoDeMelhoria extends PlanoResumo {
  funcionarioId?: string;
  resultado?: string | null;
  metas: MetaDoPlano[];
  acompanhamentos: AcompanhamentoDoPlano[];
}

export interface MetaParaCriar {
  descricao: string;
  componente?: string;
  notaAlvo?: number;
  criarCard?: boolean;
}

export interface PedidoDeDecisao {
  decisao: TipoDeDecisao;
  justificativa: string;
  proximaRevisaoEm?: string;
  confirmo?: boolean;
  plano?: { objetivo: string; fim: string; metas: MetaParaCriar[] };
}

// ------------------------------------------------------------------ leitura

export function useParecer(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "parecer", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<Parecer>(`/desempenho/funcionarios/${funcionarioId}/parecer`, {}, "Não foi possível carregar o parecer."),
  });
}

export function useDecisoes(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "decisoes", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<DecisaoDePermanencia[]>(
        `/desempenho/funcionarios/${funcionarioId}/decisoes`,
        {},
        "Não foi possível carregar as decisões."
      ),
  });
}

/** Planos do funcionário (a ordem é a do servidor). */
export function usePlanos(funcionarioId: string) {
  return useQuery({
    queryKey: [CHAVE, "planos", funcionarioId],
    enabled: !!funcionarioId,
    queryFn: () =>
      rhJson<PlanoDeMelhoria[]>(
        `/desempenho/funcionarios/${funcionarioId}/planos`,
        {},
        "Não foi possível carregar os planos de melhoria."
      ),
  });
}

/** O plano da própria pessoa em "Meu desempenho": sem plano (204/404) é só `null`. */
export function useMeuPlano(habilitado = true) {
  return useQuery({
    queryKey: ["rh-meu-desempenho", "plano"],
    enabled: habilitado,
    queryFn: async (): Promise<PlanoDeMelhoria | null> => {
      const res = await rhFetch("/meu-desempenho/plano");
      if (res.status === 204 || res.status === 404) return null;
      if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível carregar o seu plano de melhoria."));
      return ((await res.json().catch(() => null)) as PlanoDeMelhoria | null) ?? null;
    },
  });
}

// ------------------------------------------------------------------ escrita

export function useRegistrarDecisao(funcionarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pedido: PedidoDeDecisao) =>
      rhJson<DecisaoDePermanencia>(
        `/desempenho/funcionarios/${funcionarioId}/decisoes`,
        { method: "POST", body: JSON.stringify(pedido) },
        "Não foi possível registrar a decisão."
      ),
    // Parecer, decisões, planos, linha do tempo e a equipe (selo, revisão vencida) mudam juntos.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useRegistrarAcompanhamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planoId, texto }: { planoId: string; texto: string }) =>
      rhJson<AcompanhamentoDoPlano>(
        `/desempenho/planos/${planoId}/acompanhamentos`,
        { method: "POST", body: JSON.stringify({ texto }) },
        "Não foi possível registrar o acompanhamento."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useEncerrarPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planoId, status, resultado }: { planoId: string; status: string; resultado: string }) =>
      rhJson<PlanoDeMelhoria>(
        `/desempenho/planos/${planoId}/encerrar`,
        { method: "POST", body: JSON.stringify({ status, resultado }) },
        "Não foi possível encerrar o plano."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ apoio

/** "aaaa-mm-dd" + dias, sem fuso (conta em UTC). */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Progresso de uma meta em 0–100: o do servidor, ou nota atual ÷ alvo; `null` quando não dá para medir. */
export function progressoDaMeta(m: MetaDoPlano): number | null {
  if (m.progresso != null) return Math.max(0, Math.min(100, m.progresso));
  if (m.notaAlvo != null && m.notaAlvo > 0 && m.notaAtual != null) return Math.max(0, Math.min(100, (m.notaAtual / m.notaAlvo) * 100));
  return null;
}
