import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatarSoData } from "@/lib/format/date";
import { projetosEnviarArquivo, projetosJson } from "./projetos-api";

/**
 * Projetos (2026-10): orçamento, execução e cobrança de uma festa — /api/Projetos, área `projetos`
 * do Financeiro (professor recebe 403). Tipado à mão, com fetch cru.
 *
 * Campos nulos não vêm no JSON, por isso os opcionais são `?`. Percentuais são "12.5" para 12,5%.
 * Datas só-dia (`dataDoEvento`, `vencimento`) ficam como texto "yyyy-MM-dd"; as de criação e
 * aprovação são instantes ISO.
 */

const CHAVE = "projetos";

export type StatusDoProjeto = "Orcamento" | "Planejamento" | "Encerrado";

export const ROTULO_DO_STATUS: Record<StatusDoProjeto, string> = {
  Orcamento: "Orçamento",
  Planejamento: "Planejamento",
  Encerrado: "Encerrado",
};

export function rotuloDoStatus(status: string): string {
  return (ROTULO_DO_STATUS as Record<string, string>)[status] ?? status;
}

/**
 * Em que número o valor por participante se apoia: as famílias ou os alunos das turmas, uma
 * estimativa digitada (festa aberta à comunidade) ou nenhuma (só controle de gastos, sem cobrança).
 */
export type BaseDeParticipantes = "Familias" | "Alunos" | "Estimativa" | "SemCobranca";

/** Os campos de data e de participantes que a lista e o detalhe do projeto têm em comum. */
export interface QuemEQuando {
  /** "yyyy-MM-dd". Igual a `dataInicio`; fica por compatibilidade com a API antiga. */
  dataDoEvento?: string;
  dataInicio?: string;
  /** Sem fim, o projeto é de um dia só. */
  dataFim?: string;
  baseDeParticipantes?: BaseDeParticipantes;
  estimativaDeParticipantes?: number;
  /** O número efetivo da base. Com `SemCobranca` vem 0. */
  numeroDeParticipantes?: number;
  /** Igual a `numeroDeParticipantes`; fica por compatibilidade. */
  numeroDeFamilias: number;
}

export interface TurmaDoProjeto {
  classId: number;
  nome: string;
}

export interface ProjetoResumo extends QuemEQuando {
  id: string;
  nome: string;
  status: StatusDoProjeto;
  custoTotal: number;
  valorPorFamilia: number;
  gasto: number;
  arrecadado: number;
  aReceber: number;
  saldo: number;
  turmas: TurmaDoProjeto[];
  criadoEm: string;
}

export interface ItemDoOrcamento {
  id: string;
  descricao: string;
  grupo?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  comprado: boolean;
  expenseId?: string;
  ordem: number;
  observacao?: string;
}

export interface OrcamentoDoProjeto {
  custoTotal: number;
  valorSugeridoPorFamilia: number;
  valorPorFamilia: number;
  receitaPrevista: number;
  resultadoPrevisto: number;
  margemPrevistaPercentual: number;
}

export interface ResumoDasCobrancas {
  total: number;
  pagas: number;
  pendentes: number;
  vencidas: number;
  canceladas: number;
}

export interface ExecucaoDoProjeto {
  gasto: number;
  arrecadado: number;
  aReceber: number;
  saldo: number;
  margemRealPercentual?: number;
  percentualDoOrcamento: number;
  cobrancas: ResumoDasCobrancas;
  alertas: string[];
}

export interface ProjetoDetalhe extends QuemEQuando {
  id: string;
  nome: string;
  descricao?: string;
  status: StatusDoProjeto;
  margemDesejadaPercentual: number;
  valorPorFamiliaDefinido?: number;
  centroDeCustoId?: string;
  contaFinanceiraId?: string;
  turmas: TurmaDoProjeto[];
  itens: ItemDoOrcamento[];
  orcamento: OrcamentoDoProjeto;
  execucao: ExecucaoDoProjeto;
  comprovantes: { pendentes: number; confirmados: number };
  criadoEm: string;
  aprovadoEm?: string;
  encerradoEm?: string;
}

export interface DespesaDoProjeto {
  expenseId: string;
  descricao: string;
  fornecedor?: string;
  valor: number;
  data: string;
  comprovanteId?: string;
}

// ------------------------------------------------------------------ comprovantes

export type StatusDoComprovante = "Pendente" | "Lido" | "LeituraIndisponivel" | "Confirmado" | "Rejeitado";

export const ROTULO_DO_COMPROVANTE: Record<StatusDoComprovante, string> = {
  Pendente: "Aguardando leitura",
  Lido: "Lido, confira",
  LeituraIndisponivel: "Preencha à mão",
  Confirmado: "Confirmado",
  Rejeitado: "Rejeitado",
};

export interface ItemLido {
  descricao: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
}

export interface Comprovante {
  id: string;
  status: StatusDoComprovante;
  valorLido?: number;
  dataLida?: string;
  fornecedorLido?: string;
  itensLidos?: ItemLido[];
  /** 0 a 1 ou 0 a 100: a tela normaliza (ver `confiancaEmPercentual`). */
  confiancaLida?: number;
  erroDaLeitura?: string;
  arquivoNome: string;
  enviadoEm: string;
  expenseId?: string;
}

export interface LeituraAutomatica {
  disponivel: boolean;
  modelo?: string;
}

/** A confiança pode vir como fração (0,92) ou como percentual (92): ambos viram 0 a 100. */
export function confiancaEmPercentual(c: number | null | undefined): number | null {
  if (c === null || c === undefined) return null;
  return Math.max(0, Math.min(100, c <= 1 ? c * 100 : c));
}

// ------------------------------------------------------------------ cobranças

export type StatusDaCobranca = "Pendente" | "Paga" | "Vencida" | "Cancelada" | "Estornada";

export const ROTULO_DA_COBRANCA: Record<StatusDaCobranca, string> = {
  Pendente: "Pendente",
  Paga: "Paga",
  Vencida: "Vencida",
  Cancelada: "Cancelada",
  Estornada: "Estornada",
};

export interface ResponsavelPrevisto {
  guardianId: number | string;
  nome: string;
  alunos: string[];
  jaCobrado: boolean;
}

export interface CobrancaDoProjeto {
  id: string;
  nomeDoResponsavel: string;
  guardianId: number | string;
  studentId?: number | string;
  alunoNome?: string;
  valor: number;
  vencimento: string;
  status: StatusDaCobranca;
  origem: "Asaas" | "Manual";
  asaasInvoiceUrl?: string;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  pagaEm?: string;
  formaDePagamento?: string;
  // F5: o que a família pagou de fato. Só vêm quando o servidor os manda para a cobrança de projeto.
  valorPago?: number | null;
  juros?: number;
  multa?: number;
  desconto?: number;
}

/**
 * F5: o que a família pagou de fato ao marcar a cobrança como paga. Com diferença, a divisão em
 * juros, multa e desconto vai explícita e precisa fechar: valorPago = valor + juros + multa - desconto.
 */
export interface ValorPagoDaCobranca {
  valorPago?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
}

export interface ResultadoDaGeracao {
  criadas: number;
  ignoradas: { nome: string; motivo: string }[];
}

// ------------------------------------------------------------------ corpos de envio

/** Corpo do POST. O `numeroDeFamilias` não é mais enviado: o número vem da base. */
export interface NovoProjeto {
  nome: string;
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  margemDesejadaPercentual?: number;
  baseDeParticipantes: BaseDeParticipantes;
  /** Só com `Estimativa` (pelo menos 1). */
  estimativaDeParticipantes?: number;
  contaFinanceiraId?: string;
  classIds?: number[];
}

/** Corpo do PUT: o conjunto todo dos dados gerais. */
export interface DadosDoProjeto {
  nome: string;
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  margemDesejadaPercentual: number;
  baseDeParticipantes: BaseDeParticipantes;
  estimativaDeParticipantes?: number;
  contaFinanceiraId?: string;
  classIds: number[];
  valorPorFamiliaDefinido?: number;
}

export interface ItemParaSalvar {
  id?: string;
  descricao: string;
  grupo?: string;
  quantidade: number;
  valorUnitario: number;
  comprado: boolean;
  ordem: number;
  observacao?: string;
}

export interface ConfirmacaoDoComprovante {
  valor: number;
  data: string;
  descricao: string;
  categoriaFinanceiraId?: string;
  itemDoOrcamentoId?: string;
}

export interface GerarCobrancas {
  valor: number;
  vencimento: string;
  classIds?: number[];
  guardianIds?: (number | string)[];
  somenteResponsavelFinanceiro: boolean;
  descricao?: string;
}

/** A base do projeto; resposta de uma API sem o campo conta como "Famílias" (o que valia antes). */
export function baseDoProjeto(p: Pick<QuemEQuando, "baseDeParticipantes">): BaseDeParticipantes {
  return p.baseDeParticipantes ?? "Familias";
}

/** O número efetivo de participantes, com o campo antigo como reserva. */
export function numeroDeParticipantes(p: QuemEQuando): number {
  return p.numeroDeParticipantes ?? p.numeroDeFamilias ?? 0;
}

function contar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Quem participa, em poucas palavras: "38 famílias", "52 alunos", "Estimativa: 80", "Sem cobrança". */
export function descricaoDaBase(p: QuemEQuando): string {
  const base = baseDoProjeto(p);
  const n = numeroDeParticipantes(p);
  if (base === "Alunos") return contar(n, "aluno", "alunos");
  if (base === "Estimativa") return `Estimativa: ${p.estimativaDeParticipantes ?? n}`;
  if (base === "SemCobranca") return "Sem cobrança";
  return contar(n, "família", "famílias");
}

/** "por família" só quando a base é Famílias; nas outras, "por participante". */
export function porParticipante(p: Pick<QuemEQuando, "baseDeParticipantes">): string {
  return baseDoProjeto(p) === "Familias" ? "por família" : "por participante";
}

export function valorPorParticipante(p: Pick<QuemEQuando, "baseDeParticipantes">): string {
  return baseDoProjeto(p) === "Familias" ? "Valor por família" : "Valor por participante";
}

/**
 * O período do projeto: "10 a 12/11/2026" (mesmo mês), "28/10 a 02/11/2026", "10/11/2026" (um dia
 * só) ou nulo sem data. As datas são "yyyy-MM-dd" e não passam por fuso.
 */
export function periodoDoProjeto(p: QuemEQuando): string | null {
  const inicio = (p.dataInicio ?? p.dataDoEvento)?.slice(0, 10);
  if (!inicio) return null;
  const fim = p.dataFim?.slice(0, 10);
  if (!fim || fim === inicio) return formatarSoData(inicio);

  const [ai, mi, di] = inicio.split("-");
  const [af, mf, df] = fim.split("-");
  if (ai === af && mi === mf) return `${di} a ${df}/${mf}/${af}`;
  if (ai === af) return `${di}/${mi} a ${df}/${mf}/${af}`;
  return `${formatarSoData(inicio)} a ${formatarSoData(fim)}`;
}

/** Os dados gerais como o servidor os tem hoje, no formato do PUT (para mudar só uma parte). */
export function dadosDoProjeto(p: ProjetoDetalhe): DadosDoProjeto {
  const base = baseDoProjeto(p);
  return {
    nome: p.nome,
    descricao: p.descricao,
    dataInicio: (p.dataInicio ?? p.dataDoEvento)?.slice(0, 10),
    dataFim: p.dataFim?.slice(0, 10),
    margemDesejadaPercentual: p.margemDesejadaPercentual,
    baseDeParticipantes: base,
    estimativaDeParticipantes:
      base === "Estimativa" ? (p.estimativaDeParticipantes ?? numeroDeParticipantes(p)) : undefined,
    contaFinanceiraId: p.contaFinanceiraId,
    classIds: p.turmas.map((t) => t.classId),
    valorPorFamiliaDefinido: p.valorPorFamiliaDefinido,
  };
}

// ------------------------------------------------------------------ leituras

export function useProjetos(status: StatusDoProjeto | null, ano: number | null) {
  return useQuery({
    queryKey: [CHAVE, "lista", status, ano],
    staleTime: 30_000,
    queryFn: async () => {
      const filtros = new URLSearchParams();
      if (status) filtros.set("status", status);
      if (ano) filtros.set("ano", String(ano));
      const consulta = filtros.toString();
      return (
        (await projetosJson<ProjetoResumo[] | null>(
          consulta ? `?${consulta}` : "",
          {},
          "Não foi possível carregar os projetos."
        )) ?? []
      ).map((p) => ({ ...p, turmas: p.turmas ?? [] }));
    },
  });
}

function normalizarDetalhe(d: ProjetoDetalhe): ProjetoDetalhe {
  return {
    ...d,
    turmas: d.turmas ?? [],
    itens: [...(d.itens ?? [])].sort((a, b) => a.ordem - b.ordem),
    execucao: { ...d.execucao, alertas: d.execucao?.alertas ?? [] },
  };
}

export function useProjeto(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "detalhe", id],
    enabled: !!id,
    // Sem refetch ao voltar para a aba: a tela guarda edições ainda não salvas.
    refetchOnWindowFocus: false,
    queryFn: async () =>
      normalizarDetalhe(await projetosJson<ProjetoDetalhe>(`/${id}`, {}, "Não foi possível carregar o projeto.")),
  });
}

export function useDespesasDoProjeto(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "despesas", id],
    enabled: !!id,
    queryFn: async () =>
      (await projetosJson<DespesaDoProjeto[] | null>(`/${id}/despesas`, {}, "Não foi possível carregar as despesas.")) ??
      [],
  });
}

export function useComprovantes(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "comprovantes", id],
    enabled: !!id,
    // O servidor lê o comprovante depois do envio: enquanto há um aguardando, olha de novo.
    refetchInterval: (consulta) => (consulta.state.data?.some((c) => c.status === "Pendente") ? 4000 : false),
    queryFn: async () =>
      (
        (await projetosJson<Comprovante[] | null>(
          `/${id}/comprovantes`,
          {},
          "Não foi possível carregar os comprovantes."
        )) ?? []
      ).map((c) => ({ ...c, itensLidos: c.itensLidos ?? [] })),
  });
}

export function useLeituraAutomatica() {
  return useQuery({
    queryKey: [CHAVE, "leitura-automatica"],
    staleTime: 10 * 60_000,
    queryFn: () =>
      projetosJson<LeituraAutomatica>("/leitura-automatica", {}, "Não foi possível consultar a leitura automática."),
  });
}

export function usePublicoPrevisto(id: string, classIds: number[], habilitado: boolean) {
  const turmas = [...classIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: [CHAVE, "publico", id, turmas],
    enabled: habilitado,
    queryFn: async () => {
      const consulta = turmas.length > 0 ? `?classIds=${turmas.join(",")}` : "";
      return (
        (await projetosJson<ResponsavelPrevisto[] | null>(
          `/${id}/cobrancas/publico-previsto${consulta}`,
          {},
          "Não foi possível montar o público das cobranças."
        )) ?? []
      ).map((r) => ({ ...r, alunos: r.alunos ?? [] }));
    },
  });
}

export interface ParticipantesDasTurmas {
  familias: number;
  alunos: number;
}

/**
 * Quantas famílias e quantos alunos as turmas têm (sem turmas, a escola toda). A consulta espera
 * 300 ms depois da última marcação, para não disparar uma a cada clique; enquanto espera ou busca,
 * `contando` é verdadeiro e `data` ainda traz a contagem anterior.
 */
export function useParticipantesDasTurmas(classIds: number[]) {
  const chave = useMemo(() => [...new Set(classIds)].sort((a, b) => a - b).join(","), [classIds]);
  const [esperada, setEsperada] = useState(chave);

  useEffect(() => {
    const t = setTimeout(() => setEsperada(chave), 300);
    return () => clearTimeout(t);
  }, [chave]);

  const ids = esperada ? esperada.split(",").map(Number) : [];
  const consulta = useQuery({
    queryKey: ["finance", "projetos", "participantes", ids],
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: () =>
      projetosJson<ParticipantesDasTurmas>(
        `/participantes${ids.length > 0 ? `?classIds=${ids.join(",")}` : ""}`,
        {},
        "Não foi possível contar os participantes."
      ),
  });

  return {
    data: consulta.data,
    contando: chave !== esperada || consulta.isFetching,
    isError: consulta.isError && !consulta.data,
  };
}

export function useCobrancas(id: string | null) {
  return useQuery({
    queryKey: [CHAVE, "cobrancas", id],
    enabled: !!id,
    queryFn: async () =>
      (await projetosJson<CobrancaDoProjeto[] | null>(
        `/${id}/cobrancas`,
        {},
        "Não foi possível carregar as cobranças."
      )) ?? [],
  });
}

// ------------------------------------------------------------------ escritas

/** A resposta de uma escrita é o detalhe do projeto (as de comprovante e cobrança não são). */
function ehDetalhe(resposta: unknown): resposta is ProjetoDetalhe {
  return !!resposta && typeof resposta === "object" && "itens" in resposta && "orcamento" in resposta;
}

/**
 * Tudo o que o projeto mostra (detalhe, lista, despesas, comprovantes, cobranças) depende do
 * resto: depois de qualquer escrita refaz o que está na tela. O detalhe devolvido entra no cache
 * na hora, para a tela não piscar com o número antigo.
 */
function useEscrita<V, R = ProjetoDetalhe | void>(id: string | null, enviar: (v: V) => Promise<R>, financeiro = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviar,
    onSuccess: async (resposta) => {
      if (id && ehDetalhe(resposta)) {
        queryClient.setQueryData([CHAVE, "detalhe", id], normalizarDetalhe(resposta));
      }
      if (financeiro) {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["revenues"] });
        queryClient.invalidateQueries({ queryKey: ["finance"] });
      }
      await queryClient.invalidateQueries({ queryKey: [CHAVE] });
    },
  });
}

export function useCriarProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: NovoProjeto) =>
      projetosJson<ProjetoDetalhe>("", { method: "POST", body: JSON.stringify(dados) }, "Não foi possível criar o projeto."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useSalvarDados(id: string) {
  return useEscrita(id, (dados: DadosDoProjeto) =>
    projetosJson<ProjetoDetalhe>(
      `/${id}`,
      { method: "PUT", body: JSON.stringify(dados) },
      "Não foi possível salvar os dados do projeto."
    )
  );
}

export function useSalvarItens(id: string) {
  return useEscrita(id, (itens: ItemParaSalvar[]) =>
    projetosJson<ProjetoDetalhe>(
      `/${id}/itens`,
      { method: "PUT", body: JSON.stringify(itens) },
      "Não foi possível salvar os itens do orçamento."
    )
  );
}

export function useAprovarProjeto(id: string) {
  return useEscrita<void>(id, () =>
    projetosJson<ProjetoDetalhe>(`/${id}/aprovar`, { method: "POST" }, "Não foi possível aprovar o projeto.")
  );
}

export function useEncerrarProjeto(id: string) {
  return useEscrita<void>(id, () =>
    projetosJson<ProjetoDetalhe>(`/${id}/encerrar`, { method: "POST" }, "Não foi possível encerrar o projeto.")
  );
}

export function useExcluirProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      projetosJson<void>(`/${id}`, { method: "DELETE" }, "Não foi possível excluir o projeto."),
    onSuccess: () => {
      // O detalhe do excluído não é refeito: a tela ainda montada o buscaria de novo e levaria 404.
      queryClient.invalidateQueries({ queryKey: [CHAVE, "lista"] });
    },
  });
}

export function useEnviarComprovante(id: string) {
  return useEscrita(id, (arquivo: File) =>
    projetosEnviarArquivo<Comprovante>(`/${id}/comprovantes`, arquivo, "Não foi possível enviar o comprovante.")
  );
}

export function useReler(id: string) {
  return useEscrita(id, (comprovanteId: string) =>
    projetosJson<Comprovante>(
      `/comprovantes/${comprovanteId}/reler`,
      { method: "POST" },
      "Não foi possível reler o comprovante."
    )
  );
}

export function useConfirmarComprovante(id: string) {
  return useEscrita(
    id,
    ({ comprovanteId, dados }: { comprovanteId: string; dados: ConfirmacaoDoComprovante }) =>
      projetosJson<Comprovante>(
        `/comprovantes/${comprovanteId}/confirmar`,
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível confirmar o comprovante."
      ),
    true
  );
}

export function useRejeitarComprovante(id: string) {
  return useEscrita(id, (comprovanteId: string) =>
    projetosJson<Comprovante>(
      `/comprovantes/${comprovanteId}/rejeitar`,
      { method: "POST" },
      "Não foi possível rejeitar o comprovante."
    )
  );
}

export function useGerarCobrancas(id: string) {
  return useEscrita(
    id,
    (dados: GerarCobrancas) =>
      projetosJson<ResultadoDaGeracao>(
        `/${id}/cobrancas/gerar`,
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível gerar as cobranças."
      ),
    true
  );
}

export function useMarcarPaga(id: string) {
  return useEscrita(
    id,
    ({
      cobrancaId,
      data,
      formaDePagamento,
      ...encargos
    }: { cobrancaId: string; data: string; formaDePagamento: string } & ValorPagoDaCobranca) =>
      projetosJson<CobrancaDoProjeto>(
        `/cobrancas/${cobrancaId}/marcar-paga`,
        { method: "POST", body: JSON.stringify({ data, formaDePagamento, ...encargos }) },
        "Não foi possível marcar a cobrança como paga."
      ),
    true
  );
}

export function useCancelarCobranca(id: string) {
  return useEscrita(
    id,
    (cobrancaId: string) =>
      projetosJson<CobrancaDoProjeto>(
        `/cobrancas/${cobrancaId}/cancelar`,
        { method: "POST" },
        "Não foi possível cancelar a cobrança."
      ),
    true
  );
}
