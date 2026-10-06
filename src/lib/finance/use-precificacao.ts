import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { precificacaoJson } from "./precificacao-api";

/**
 * Precificação (2026-10): calculadora de mensalidade do próximo ano — /api/Precificacao, área
 * `precificacao` do Financeiro (professor recebe 403). Tipado à mão, com fetch cru.
 *
 * Campos nulos não vêm no JSON, por isso os opcionais são `?`. Percentuais são "12.5" para 12,5%.
 * Datas de criação e aprovação são instantes ISO.
 */

const CHAVE = "precificacao";

export type StatusDoEstudo = "Rascunho" | "Aprovado";

export const GRUPOS_DE_CUSTO = [
  "Pessoal",
  "Ocupacao",
  "Utilidades",
  "Alimentacao",
  "Material",
  "Servicos",
  "Impostos",
  "Outros",
] as const;
export type GrupoDeCusto = (typeof GRUPOS_DE_CUSTO)[number];

export const ROTULO_DO_GRUPO: Record<GrupoDeCusto, string> = {
  Pessoal: "Pessoal",
  Ocupacao: "Ocupação",
  Utilidades: "Utilidades",
  Alimentacao: "Alimentação",
  Material: "Material",
  Servicos: "Serviços",
  Impostos: "Impostos",
  Outros: "Outros",
};

/** Grupo que a tela não conhece (versão nova do servidor) aparece pelo nome que veio. */
export function rotuloDoGrupo(grupo: string): string {
  return (ROTULO_DO_GRUPO as Record<string, string>)[grupo] ?? grupo;
}

export type OrigemDaLinha = "Automatica" | "Manual";

export type StatusDeNivelamento = "AbaixoDoCusto" | "AbaixoDoAlvo" | "NoAlvo" | "AcimaDoAlvo" | "SemBase";

export interface IndicesEconomicos {
  anoAlvo: number;
  selicMeta?: number;
  ipca12m?: number;
  focusIpca?: number;
  focusSelic?: number;
  sugestaoDeAumento: number;
  atualizadoEm?: string;
  fonte: string;
  /** Preenchido quando o Banco Central não respondeu; os números vêm ausentes. */
  erro?: string;
}

export interface EstudoResumo {
  id: string;
  anoAlvo: number;
  nome: string;
  status: StatusDoEstudo;
  criadoEm: string;
  aprovadoEm?: string;
  mensalidadeAlvoMedia: number;
  reajusteSugeridoGeral: number;
}

export interface LinhaDeCusto {
  id: string;
  nome: string;
  grupo: GrupoDeCusto | string;
  categoriaFinanceiraId?: string;
  valorMensalBase: number;
  origem: OrigemDaLinha;
  aumentoPercentual?: number;
  valorMensalProjetado: number;
  ordem: number;
  observacao?: string;
}

export interface AlvoDeMensalidade {
  id: string;
  classId?: string;
  nomeDaTurma: string;
  alunosAtuais: number;
  capacidadeMeta: number;
  mensalidadeAtualMedia: number;
  custoPorAluno: number;
  mensalidadeEquilibrio: number;
  mensalidadeAlvo: number;
  mensalidadeDefinida?: number;
  mensalidadeFinal: number;
  reajustePercentual?: number;
}

export interface ResultadoDoEstudo {
  custoMensalProjetado: number;
  custoAnual: number;
  alunosAtuais: number;
  alunosPrevistos: number;
  custoPorAlunoMes: number;
  mensalidadeEquilibrioMedia: number;
  mensalidadeAlvoMedia: number;
  pontoDeEquilibrioAlunos: number;
  reajusteSugeridoGeral: number;
  receitaPrevistaAnual: number;
  resultadoPrevisto: number;
  margemRealizadaPercentual: number;
}

export interface ResumoDoNivelamento {
  abaixoDoCusto: number;
  abaixoDoAlvo: number;
  noAlvo: number;
  acimaDoAlvo: number;
}

export interface EstudoDetalhe {
  id: string;
  anoAlvo: number;
  nome: string;
  status: StatusDoEstudo;
  margemDesejadaPercentual: number;
  retornoAnualDesejado: number;
  aumentoGeralPercentual: number;
  inadimplenciaPrevistaPercentual: number;
  metaDeOcupacaoPercentual: number;
  mesesLetivos: number;
  encargosSobreFolhaPercentual: number;
  indices?: Partial<IndicesEconomicos>;
  criadoEm: string;
  aprovadoEm?: string;
  reajusteAprovadoPercentual?: number;
  linhas: LinhaDeCusto[];
  alvos: AlvoDeMensalidade[];
  resultado: ResultadoDoEstudo;
  nivelamentoResumo: ResumoDoNivelamento & { impactoAnual: number };
}

export interface ItemDeNivelamento {
  tuitionPlanId: string;
  studentId: number | string;
  alunoNome: string;
  turma?: string;
  responsavelNome?: string;
  valorAtual: number;
  alvoDaTurma: number;
  equilibrioDaTurma: number;
  diferenca: number;
  status: StatusDeNivelamento | string;
}

export interface Nivelamento {
  resumo: ResumoDoNivelamento;
  impactoAnual: number;
  itens: ItemDeNivelamento[];
}

export interface PainelDePrecificacao {
  estudoAtual?: { id: string; anoAlvo: number; status: StatusDoEstudo };
  mensalidadesForaDoAlvo: number;
  impactoAnual: number;
  mensalidadeAlvoMedia?: number;
}

// ------------------------------------------------------------------ corpos de envio

export interface NovoEstudo {
  anoAlvo: number;
  nome?: string;
  baseadoEmEstudoId?: string;
}

export interface Premissas {
  nome: string;
  margemDesejadaPercentual: number;
  retornoAnualDesejado: number;
  aumentoGeralPercentual: number;
  inadimplenciaPrevistaPercentual: number;
  metaDeOcupacaoPercentual: number;
  mesesLetivos: number;
  encargosSobreFolhaPercentual: number;
}

export interface LinhaParaSalvar {
  id?: string;
  nome: string;
  grupo: string;
  valorMensalBase: number;
  aumentoPercentual?: number;
  ordem: number;
  observacao?: string;
}

export interface AlvoParaSalvar {
  id: string;
  capacidadeMeta: number;
  mensalidadeDefinida?: number;
}

export interface AprovarEstudo {
  aplicarReajusteGeral: boolean;
  aplicarPorTurma: boolean;
}

export function premissasDoEstudo(e: EstudoDetalhe): Premissas {
  return {
    nome: e.nome,
    margemDesejadaPercentual: e.margemDesejadaPercentual,
    retornoAnualDesejado: e.retornoAnualDesejado,
    aumentoGeralPercentual: e.aumentoGeralPercentual,
    inadimplenciaPrevistaPercentual: e.inadimplenciaPrevistaPercentual,
    metaDeOcupacaoPercentual: e.metaDeOcupacaoPercentual,
    mesesLetivos: e.mesesLetivos,
    encargosSobreFolhaPercentual: e.encargosSobreFolhaPercentual,
  };
}

// ------------------------------------------------------------------ leituras

export function useIndicesEconomicos(ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "indices", ano],
    enabled: ano !== null,
    staleTime: 10 * 60_000,
    queryFn: () =>
      precificacaoJson<IndicesEconomicos>(
        `/indices?ano=${ano}`,
        {},
        "Não foi possível consultar os índices do Banco Central."
      ),
  });
}

export function useEstudos() {
  return useQuery({
    queryKey: [CHAVE, "lista"],
    staleTime: 30_000,
    queryFn: async () =>
      (await precificacaoJson<EstudoResumo[] | null>("", {}, "Não foi possível carregar os estudos.")) ?? [],
  });
}

function normalizarDetalhe(d: EstudoDetalhe): EstudoDetalhe {
  return {
    ...d,
    linhas: [...(d.linhas ?? [])].sort((a, b) => a.ordem - b.ordem),
    alvos: d.alvos ?? [],
  };
}

export function useEstudo(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "detalhe", id],
    enabled: !!id,
    // Sem refetch ao voltar para a aba: a tela guarda edições ainda não salvas.
    refetchOnWindowFocus: false,
    queryFn: async () =>
      normalizarDetalhe(await precificacaoJson<EstudoDetalhe>(`/${id}`, {}, "Não foi possível carregar o estudo.")),
  });
}

export function useNivelamento(id: string | null, habilitado: boolean) {
  return useQuery({
    queryKey: [CHAVE, "nivelamento", id],
    enabled: !!id && habilitado,
    queryFn: async () => {
      const n = await precificacaoJson<Nivelamento>(`/${id}/nivelamento`, {}, "Não foi possível carregar o nivelamento.");
      return { ...n, itens: n.itens ?? [] };
    },
  });
}

export function usePainelDePrecificacao(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "painel"],
    enabled: habilitado,
    staleTime: 60_000,
    queryFn: () => precificacaoJson<PainelDePrecificacao>("/painel", {}, "Não foi possível carregar a precificação."),
  });
}

// ------------------------------------------------------------------ escritas

/** Escrita que devolve o detalhe: grava no cache dele e refaz o que depende (lista, nivelamento, painel). */
function useEscritaDoDetalhe<V>(id: string, enviar: (v: V) => Promise<EstudoDetalhe>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviar,
    onSuccess: (detalhe) => {
      queryClient.setQueryData([CHAVE, "detalhe", id], normalizarDetalhe(detalhe));
      queryClient.invalidateQueries({ queryKey: [CHAVE, "lista"] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "nivelamento", id] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "painel"] });
    },
  });
}

export function useCriarEstudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: NovoEstudo) =>
      precificacaoJson<EstudoDetalhe>(
        "",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível criar o estudo."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useSalvarPremissas(id: string) {
  return useEscritaDoDetalhe(id, (premissas: Premissas) =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}`,
      { method: "PUT", body: JSON.stringify(premissas) },
      "Não foi possível salvar as premissas."
    )
  );
}

export function useSalvarLinhas(id: string) {
  return useEscritaDoDetalhe(id, (linhas: LinhaParaSalvar[]) =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}/linhas`,
      { method: "PUT", body: JSON.stringify(linhas) },
      "Não foi possível salvar os custos."
    )
  );
}

export function useSalvarAlvos(id: string) {
  return useEscritaDoDetalhe(id, (alvos: AlvoParaSalvar[]) =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}/alvos`,
      { method: "PUT", body: JSON.stringify(alvos) },
      "Não foi possível salvar as turmas."
    )
  );
}

export function useRecalcularBase(id: string) {
  return useEscritaDoDetalhe<void>(id, () =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}/recalcular-base`,
      { method: "POST" },
      "Não foi possível recarregar a base automática."
    )
  );
}

export function useAprovarEstudo(id: string) {
  return useEscritaDoDetalhe(id, (opcoes: AprovarEstudo) =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}/aprovar`,
      { method: "POST", body: JSON.stringify(opcoes) },
      "Não foi possível aprovar o estudo."
    )
  );
}

export function useExcluirEstudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      precificacaoJson<void>(`/${id}`, { method: "DELETE" }, "Não foi possível excluir o estudo."),
    onSuccess: () => {
      // O detalhe do excluído não é refeito: a tela ainda montada o buscaria de novo e levaria 404.
      queryClient.invalidateQueries({ queryKey: [CHAVE, "lista"] });
      queryClient.invalidateQueries({ queryKey: [CHAVE, "painel"] });
    },
  });
}
