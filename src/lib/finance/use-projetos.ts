import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface TurmaDoProjeto {
  classId: number;
  nome: string;
}

export interface ProjetoResumo {
  id: string;
  nome: string;
  status: StatusDoProjeto;
  dataDoEvento?: string;
  custoTotal: number;
  valorPorFamilia: number;
  numeroDeFamilias: number;
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

export interface ProjetoDetalhe {
  id: string;
  nome: string;
  descricao?: string;
  dataDoEvento?: string;
  status: StatusDoProjeto;
  margemDesejadaPercentual: number;
  numeroDeFamilias: number;
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

export type StatusDaCobranca = "Pendente" | "Paga" | "Vencida" | "Cancelada";

export const ROTULO_DA_COBRANCA: Record<StatusDaCobranca, string> = {
  Pendente: "Pendente",
  Paga: "Paga",
  Vencida: "Vencida",
  Cancelada: "Cancelada",
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
}

export interface ResultadoDaGeracao {
  criadas: number;
  ignoradas: { nome: string; motivo: string }[];
}

// ------------------------------------------------------------------ corpos de envio

export interface NovoProjeto {
  nome: string;
  descricao?: string;
  dataDoEvento?: string;
  margemDesejadaPercentual?: number;
  numeroDeFamilias: number;
  contaFinanceiraId?: string;
  classIds?: number[];
}

export interface DadosDoProjeto {
  nome: string;
  descricao?: string;
  dataDoEvento?: string;
  margemDesejadaPercentual: number;
  numeroDeFamilias: number;
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

/** Os dados gerais como o servidor os tem hoje, no formato do PUT (para mudar só uma parte). */
export function dadosDoProjeto(p: ProjetoDetalhe): DadosDoProjeto {
  return {
    nome: p.nome,
    descricao: p.descricao,
    dataDoEvento: p.dataDoEvento,
    margemDesejadaPercentual: p.margemDesejadaPercentual,
    numeroDeFamilias: p.numeroDeFamilias,
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
    ({ cobrancaId, data, formaDePagamento }: { cobrancaId: string; data: string; formaDePagamento: string }) =>
      projetosJson<CobrancaDoProjeto>(
        `/cobrancas/${cobrancaId}/marcar-paga`,
        { method: "POST", body: JSON.stringify({ data, formaDePagamento }) },
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
