import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErroDaApi, precificacaoJson } from "./precificacao-api";

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

/** Como o custo de uma linha é dividido entre os alunos. */
export const BASES_DE_RATEIO = ["PorAluno", "PorHoraCrianca", "PorRefeicao", "PorAtividadeExtra"] as const;
export type BaseDeRateio = (typeof BASES_DE_RATEIO)[number];

export const ROTULO_DA_BASE: Record<BaseDeRateio, string> = {
  PorAluno: "Por aluno",
  PorHoraCrianca: "Por hora-criança",
  PorRefeicao: "Por refeição",
  PorAtividadeExtra: "Por atividade extra",
};

/** Uma frase para a pessoa leiga entender o que cada divisão faz. */
export const DICA_DA_BASE: Record<BaseDeRateio, string> = {
  PorAluno: "Administrativo: igual para todos.",
  PorHoraCrianca: "Aluguel e equipe: por hora que a criança fica.",
  PorRefeicao: "Alimentação: por refeição.",
  PorAtividadeExtra: "Atividades: só para quem tem.",
};

export function rotuloDaBase(base: string | null | undefined): string {
  return (ROTULO_DA_BASE as Record<string, string>)[base ?? ""] ?? "Por aluno";
}

/** Divisão sugerida para um custo novo, conforme o grupo. */
export function baseSugeridaDoGrupo(grupo: string): BaseDeRateio {
  switch (grupo) {
    case "Alimentacao":
      return "PorRefeicao";
    case "Pessoal":
    case "Ocupacao":
    case "Utilidades":
      return "PorHoraCrianca";
    default:
      return "PorAluno";
  }
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
  /** Ausente em servidor antigo: vale "por aluno". */
  baseDeRateio?: BaseDeRateio | string | null;
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

/** Um grupo de alunos do estudo: uma modalidade, ou o grupo "sem período informado". */
export interface ModalidadeDoEstudo {
  /** Id do alvo no estudo (é o que o PUT /modalidades espera). */
  id: string;
  /** Nulo no grupo "sem período". */
  modalidadeId?: string | null;
  nome: string;
  semPeriodo: boolean;
  aviso?: string | null;
  horasPorDia?: number | null;
  refeicoes?: number | null;
  extras?: boolean | null;
  alunosComExtras?: number | null;
  horasCriancaMes?: number | null;
  refeicoesMes?: number | null;
  alunos: number;
  capacidadeMeta: number;
  custoPorAluno?: number | null;
  mensalidadeEquilibrio?: number | null;
  precoSugerido?: number | null;
  mensalidadeAtualMedia?: number | null;
  diferencaPercentual?: number | null;
  foraDoAlvo: boolean;
  status: StatusDeNivelamento | string;
  mensalidadeDefinida?: number | null;
  mensalidadeFinal?: number | null;
  reajustePercentual?: number | null;
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
  /** Há 2 ou mais modalidades com alunos: o nivelamento passa a ser por modalidade. */
  nivelaPorModalidade: boolean;
  modalidades: ModalidadeDoEstudo[];
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
  /** Ausentes em servidor antigo e no aluno sem período. */
  modalidadeId?: string | null;
  modalidade?: string | null;
}

/** Resumo de uma modalidade no nivelamento e no painel do Início. */
export interface ResumoPorModalidade {
  modalidadeId?: string | null;
  nome: string;
  alunos?: number;
  foraDoAlvo?: number;
  impactoAnual?: number;
}

export interface Nivelamento {
  resumo: ResumoDoNivelamento;
  impactoAnual: number;
  itens: ItemDeNivelamento[];
  porModalidade: ResumoPorModalidade[];
}

export interface PainelDePrecificacao {
  estudoAtual?: { id: string; anoAlvo: number; status: StatusDoEstudo };
  mensalidadesForaDoAlvo: number;
  impactoAnual: number;
  mensalidadeAlvoMedia?: number;
  porModalidade?: ResumoPorModalidade[];
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
  /** Vazio mantém o que o servidor já tem. */
  baseDeRateio?: BaseDeRateio | string;
}

export interface ModalidadeParaSalvar {
  /** O id do alvo no estudo (ou o modalidadeId). */
  id: string;
  capacidadeMeta: number;
  mensalidadeDefinida?: number;
  reajustePercentual?: number;
}

export interface AlvoParaSalvar {
  id: string;
  capacidadeMeta: number;
  mensalidadeDefinida?: number;
}

export interface AprovarEstudo {
  aplicarReajusteGeral: boolean;
  aplicarPorTurma: boolean;
  aplicarPorModalidade: boolean;
}

// ------------------------------------------------------------------ modalidades

export type PeriodoDaModalidade = "Integral" | "MeioPeriodoManha" | "MeioPeriodoTarde" | "SeisHoras" | "OitoHoras" | "DezHoras";
export type OrientacaoDaModalidade = "Entrada" | "Saida";

export const PERIODOS_DA_MODALIDADE: PeriodoDaModalidade[] = [
  "Integral",
  "MeioPeriodoManha",
  "MeioPeriodoTarde",
  "SeisHoras",
  "OitoHoras",
  "DezHoras",
];

export const ROTULO_DO_PERIODO: Record<PeriodoDaModalidade, string> = {
  Integral: "Integral",
  MeioPeriodoManha: "Meio período manhã",
  MeioPeriodoTarde: "Meio período tarde",
  SeisHoras: "6 horas",
  OitoHoras: "8 horas",
  DezHoras: "10 horas",
};

export const ROTULO_DA_ORIENTACAO: Record<OrientacaoDaModalidade, string> = {
  Entrada: "Entrada fixa",
  Saida: "Saída fixa",
};

/** Só as cargas horárias têm um horário fixo (entrada ou saída). */
export const PERIODO_COM_ORIENTACAO: PeriodoDaModalidade[] = ["SeisHoras", "OitoHoras", "DezHoras"];

export function rotuloDoPeriodo(periodo: string): string {
  return (ROTULO_DO_PERIODO as Record<string, string>)[periodo] ?? periodo;
}

export interface Modalidade {
  id: string;
  nome: string;
  periodo: PeriodoDaModalidade;
  orientacao?: OrientacaoDaModalidade | null;
  horasPorDia: number;
  refeicoesIncluidas: number;
  atividadesExtrasIncluidas: boolean;
  ativa: boolean;
  ordem: number;
  criadoEm: string;
}

export interface ModalidadeParaCriar {
  nome: string;
  periodo: PeriodoDaModalidade;
  orientacao: OrientacaoDaModalidade | null;
  horasPorDia: number;
  refeicoesIncluidas: number;
  atividadesExtrasIncluidas: boolean;
  ativa?: boolean;
  ordem?: number;
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
    nivelaPorModalidade: d.nivelaPorModalidade ?? false,
    modalidades: d.modalidades ?? [],
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
      return { ...n, itens: n.itens ?? [], porModalidade: n.porModalidade ?? [] };
    },
  });
}

export function usePainelDePrecificacao(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "painel"],
    enabled: habilitado,
    staleTime: 60_000,
    queryFn: async () => {
      const p = await precificacaoJson<PainelDePrecificacao>("/painel", {}, "Não foi possível carregar a precificação.");
      return { ...p, porModalidade: p.porModalidade ?? [] };
    },
  });
}

export function useModalidades() {
  return useQuery({
    queryKey: [CHAVE, "modalidades"],
    staleTime: 30_000,
    queryFn: async () =>
      (await precificacaoJson<Modalidade[] | null>("/modalidades", {}, "Não foi possível carregar as modalidades.")) ?? [],
  });
}

// ------------------------------------------------------------------ escritas

/** Escrita que devolve o detalhe: grava no cache dele e refaz o que depende (lista, nivelamento, painel). */
function useEscritaDoDetalhe<V>(id: string, enviar: (v: V) => Promise<EstudoDetalhe>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviar,
    onSuccess: (detalhe) => {
      // Se o servidor não devolveu o detalhe, a tela busca o estudo de novo.
      if (detalhe?.id) queryClient.setQueryData([CHAVE, "detalhe", id], normalizarDetalhe(detalhe));
      else queryClient.invalidateQueries({ queryKey: [CHAVE, "detalhe", id] });
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

export function useDefinirModalidadesDoEstudo(id: string) {
  return useEscritaDoDetalhe(id, (modalidades: ModalidadeParaSalvar[]) =>
    precificacaoJson<EstudoDetalhe>(
      `/${id}/modalidades`,
      { method: "PUT", body: JSON.stringify(modalidades) },
      "Não foi possível salvar as modalidades."
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

// Modalidade mexe no cálculo de todo estudo: o que está em cache é refeito na próxima vez que abrir.
function useInvalidarPorModalidade() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [CHAVE, "modalidades"] });
    queryClient.invalidateQueries({ queryKey: [CHAVE, "detalhe"] });
    queryClient.invalidateQueries({ queryKey: [CHAVE, "nivelamento"] });
    queryClient.invalidateQueries({ queryKey: [CHAVE, "painel"] });
  };
}

export function useSalvarModalidade() {
  const invalidar = useInvalidarPorModalidade();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: ModalidadeParaCriar }) =>
      precificacaoJson<Modalidade>(
        id ? `/modalidades/${id}` : "/modalidades",
        { method: id ? "PUT" : "POST", body: JSON.stringify(dados) },
        "Não foi possível salvar a modalidade."
      ).catch((err: unknown) => {
        if (err instanceof ErroDaApi && err.status === 409) {
          throw new Error("Já existe uma modalidade com este período e esta orientação. Edite a que já existe.");
        }
        throw err;
      }),
    onSuccess: invalidar,
  });
}

export function useExcluirModalidade() {
  const invalidar = useInvalidarPorModalidade();
  return useMutation({
    mutationFn: (id: string) =>
      precificacaoJson<void>(`/modalidades/${id}`, { method: "DELETE" }, "Não foi possível excluir a modalidade.").catch(
        (err: unknown) => {
          if (err instanceof ErroDaApi && err.status === 409) {
            throw new Error(
              "Um estudo aprovado usa esta modalidade, então ela não pode ser excluída. Desative em vez de excluir."
            );
          }
          throw err;
        }
      ),
    onSuccess: invalidar,
  });
}
