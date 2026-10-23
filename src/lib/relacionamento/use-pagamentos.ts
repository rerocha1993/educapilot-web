import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StatusDaCobranca, ValorPagoDaCobranca } from "@/lib/finance/use-projetos";
import { invalidarFinanceiro } from "@/lib/finance/invalidar-financeiro";
import { consulta, relacionamentoJson } from "./api";
import {
  pagamentosDaFamilia,
  type PagamentosDaFamiliaCru,
  type PagamentosDaFamilia,
} from "./use-portal-pagamentos";

/**
 * Relacionamento, pagamentos — lado da escola (2026-10): cobranças avulsas, planos recorrentes e a
 * visão "por família" — /api/Relacionamento, área `pagamentos`. Tipado à mão, fetch cru (ver api.ts).
 *
 * Mesma regra dos outros hooks do módulo: o servidor omite o nulo, e os normalizadores devolvem
 * `null`. Datas são texto "yyyy-MM-dd"; o dia do vencimento nunca passa por Date.
 *
 * Carteira = uma conta do Financeiro com recebimento configurado (Asaas automático ou manual).
 * Toda cobrança cai numa carteira; no código ela é a `contaFinanceiraId`, na tela é "a conta".
 */

const CHAVE = "relacionamento";
const PAGAMENTOS = [CHAVE, "pagamentos"] as const;

// ------------------------------------------------------------------ vocabulário

export const STATUS_DA_COBRANCA: StatusDaCobranca[] = ["Pendente", "Vencida", "Paga", "Cancelada", "Estornada"];
export type OrigemDaCobranca = "Asaas" | "Manual";
export type TipoDaCobranca = "individual" | "recorrente";
/**
 * De onde a cobrança veio: cobrança avulsa da escola, pedido da loja, plano "Outro" (período
 * integral, transporte), mensalidade ou projeto/evento. Individual = escola + loja + projeto;
 * recorrente = plano + mensalidade.
 */
export type FonteDaCobranca = "escola" | "loja" | "plano" | "mensalidade" | "projeto";

export const ROTULO_DA_FONTE: Record<FonteDaCobranca, string> = {
  escola: "Escola",
  loja: "Loja",
  plano: "Outro plano",
  mensalidade: "Mensalidade",
  projeto: "Projeto",
};

function fonteDaCobranca(
  v: string | null | undefined,
  c: { planoId?: string | null; pedidoId?: string | null; projetoId?: string | null }
): FonteDaCobranca {
  if (v === "escola" || v === "loja" || v === "plano" || v === "mensalidade" || v === "projeto") return v;
  // Servidor antigo, sem `fonte`: deduz pelo que a cobrança carrega.
  if (c.projetoId) return "projeto";
  if (c.pedidoId) return "loja";
  if (c.planoId) return "plano";
  return "escola";
}
export type ProvedorDaCarteira = "asaas" | "manual";

/** Tamanhos de página oferecidos na lista de cobranças. */
export const TAMANHOS_DA_PAGINA = [25, 50, 100] as const;

function statusDaCobranca(v: string | null | undefined): StatusDaCobranca {
  return v === "Paga" || v === "Vencida" || v === "Cancelada" || v === "Estornada" ? v : "Pendente";
}

// ------------------------------------------------------------------ tipos

export interface Cobranca {
  id: string;
  nomeDoResponsavel: string;
  /** O servidor pode mandar Guid ou número; a tela só repassa. */
  guardianId: string;
  studentId: string | null;
  alunoNome: string | null;
  descricao: string;
  valor: number;
  /** yyyy-MM-dd */
  vencimento: string;
  status: StatusDaCobranca;
  origem: OrigemDaCobranca;
  plano: string | null;
  /** Conta do Financeiro em que a cobrança cai (a "carteira"); nulo nas cobranças antigas. */
  contaFinanceiraId: string | null;
  contaNome: string | null;
  tipo: TipoDaCobranca;
  fonte: FonteDaCobranca;
  planoId: string | null;
  /** Plano de mensalidade de um aluno (fonte "mensalidade"). */
  tuitionPlanId: string | null;
  pedidoId: string | null;
  /** Projeto ou evento que gerou a cobrança (fonte "projeto"); essas linhas são só de leitura aqui. */
  projetoId: string | null;
  projetoNome: string | null;
  asaasInvoiceUrl: string | null;
  pixCopiaECola: string | null;
  pixQrCodeBase64: string | null;
  boletoUrl: string | null;
  pagaEm: string | null;
  formaDePagamento: string | null;
  /** F5: o que a família pagou de fato (valor + juros + multa - desconto). Nulo enquanto não paga. */
  valorPago: number | null;
  juros: number;
  multa: number;
  desconto: number;
}

export interface FiltroDeCobrancas {
  status: StatusDaCobranca | null;
  classId: number | null;
  /** Vencimento a partir de (yyyy-MM-dd). */
  de: string;
  ate: string;
  origem: OrigemDaCobranca | null;
  /** Carteira (conta do Financeiro) em que a cobrança cai. */
  contaId: string | null;
  /** Responsável, aluno ou descrição. */
  busca: string;
  tipo: TipoDaCobranca | null;
  fonte: FonteDaCobranca | null;
  planoId: string | null;
}

/** Somas do filtro inteiro (todas as páginas). Cancelada e estornada ficam de fora. */
export interface TotaisDeCobrancas {
  valorTotal: number;
  quantidadeEmAberto: number;
  valorEmAberto: number;
  quantidadeVencidas: number;
  valorVencido: number;
  quantidadePagas: number;
  valorPago: number;
}

export interface PaginaDeCobrancas {
  itens: Cobranca[];
  total: number;
  /** Nulo quando a API ainda não devolve os totais. */
  totais: TotaisDeCobrancas | null;
  /** Começa em 1. */
  pagina: number;
  tamanho: number;
}

/** Uma conta do Financeiro que recebe das famílias: a "carteira" que a escola escolhe. */
export interface ContaParaCobranca {
  contaId: string;
  nome: string;
  banco: string;
  provedor: ProvedorDaCarteira;
  padraoParaCobrancas: boolean;
  padraoParaMensalidades: boolean;
  /** Só faz sentido no Asaas: a chave foi testada e funciona. */
  asaasOk: boolean;
}

export interface PeriodoDoResumo {
  /** Vencimento a partir de (yyyy-MM-dd). */
  de?: string;
  ate?: string;
  contaId?: string | null;
}

export interface ResumoDeCobrancas {
  emAberto: number;
  vencidas: number;
  pagasNoMes: number;
  valorEmAberto: number;
  valorPagoNoMes: number;
}

export interface ResponsavelPrevisto {
  guardianId: string;
  nome: string;
  alunos: string[];
  jaCobrado: boolean;
}

export interface Ignorada {
  nome: string;
  motivo: string;
}

export interface ResultadoDaGeracao {
  criadas: number;
  ignoradas: Ignorada[];
  /** Avisos do servidor, como "A conta X não gera link automático (recebimento manual)". */
  avisos: string[];
}

export interface GerarCobrancasAvulsas {
  descricao: string;
  valor: number;
  vencimento: string;
  classIds?: number[];
  guardianIds?: string[];
  studentIds?: number[];
  somenteResponsavelFinanceiro: boolean;
  gerarAsaas: boolean;
  /** Carteira da cobrança. Nulo = a padrão das cobranças. */
  contaFinanceiraId?: string | null;
}

export interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  diaVencimento: number;
  /** yyyy-MM-dd */
  inicio: string;
  fim: string | null;
  ativo: boolean;
  gerarCobrancaAsaas: boolean;
  contaFinanceiraId: string | null;
  contaNome: string | null;
  alunos: number;
  /** "mensalidade" e o plano unico da Mensalidade (cartao proprio na tela); "outro" sao os demais. */
  tipo: "mensalidade" | "outro";
}

export interface AlunoDoPlano {
  studentId: number;
  alunoNome: string;
  turma: string | null;
  guardianId: string | null;
  nomeDoResponsavel: string | null;
  ativo: boolean;
}

export interface PlanoDetalhe extends Omit<Plano, "alunos"> {
  alunos: AlunoDoPlano[];
}

export interface SalvarPlano {
  nome: string;
  descricao?: string;
  valor: number;
  diaVencimento: number;
  inicio: string;
  fim?: string;
  gerarCobrancaAsaas: boolean;
  /** Carteira das parcelas futuras. Nulo = a padrão das cobranças. */
  contaFinanceiraId?: string | null;
}

export interface ResultadoDoPlano {
  criadas: number;
  existentes: number;
  ignoradas: Ignorada[];
  /** Quando o servidor manda só a contagem, ela fica aqui. */
  totalDeIgnoradas: number;
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

type CobrancaCrua = Partial<Omit<Cobranca, "guardianId" | "studentId" | "status" | "origem" | "tipo" | "fonte">> & {
  guardianId?: string | number;
  studentId?: string | number | null;
  status?: string;
  origem?: string;
  tipo?: string;
  fonte?: string;
};

function cobranca(c: CobrancaCrua): Cobranca {
  const fonte = fonteDaCobranca(c.fonte, c);
  return {
    id: String(c.id ?? ""),
    nomeDoResponsavel: c.nomeDoResponsavel ?? "",
    guardianId: String(c.guardianId ?? ""),
    studentId: c.studentId === undefined || c.studentId === null ? null : String(c.studentId),
    alunoNome: c.alunoNome ?? null,
    descricao: c.descricao ?? "",
    valor: c.valor ?? 0,
    vencimento: dia(c.vencimento) ?? "",
    status: statusDaCobranca(c.status),
    origem: c.origem === "Asaas" ? "Asaas" : "Manual",
    plano: c.plano ?? null,
    contaFinanceiraId: c.contaFinanceiraId ?? null,
    contaNome: c.contaNome ?? null,
    tipo: c.tipo === "recorrente" || fonte === "plano" || fonte === "mensalidade" ? "recorrente" : "individual",
    fonte,
    planoId: c.planoId ?? null,
    tuitionPlanId: c.tuitionPlanId ?? null,
    pedidoId: c.pedidoId ?? null,
    projetoId: c.projetoId ?? null,
    projetoNome: c.projetoNome ?? null,
    asaasInvoiceUrl: c.asaasInvoiceUrl ?? null,
    pixCopiaECola: c.pixCopiaECola ?? null,
    pixQrCodeBase64: c.pixQrCodeBase64 ?? null,
    boletoUrl: c.boletoUrl ?? null,
    pagaEm: dia(c.pagaEm),
    formaDePagamento: c.formaDePagamento ?? null,
    valorPago: c.valorPago ?? null,
    juros: c.juros ?? 0,
    multa: c.multa ?? 0,
    desconto: c.desconto ?? 0,
  };
}

function ignoradas(lista: Partial<Ignorada>[] | null | undefined): Ignorada[] {
  return (lista ?? []).map((i) => ({ nome: i.nome ?? "", motivo: i.motivo ?? "" }));
}

type AlunoDoPlanoCru = Partial<Omit<AlunoDoPlano, "guardianId">> & { guardianId?: string | number | null };
type PlanoCru = Partial<Omit<Plano, "alunos" | "tipo">> & { alunos?: number | AlunoDoPlanoCru[]; tipo?: string | number | null };

function tipoDoPlano(tipo: string | number | null | undefined): "mensalidade" | "outro" {
  return tipo === 1 || String(tipo ?? "").toLowerCase() === "mensalidade" ? "mensalidade" : "outro";
}

function plano(p: PlanoCru): Plano {
  return {
    id: String(p.id ?? ""),
    nome: p.nome ?? "",
    descricao: p.descricao ?? null,
    valor: p.valor ?? 0,
    diaVencimento: p.diaVencimento ?? 1,
    inicio: dia(p.inicio) ?? "",
    fim: dia(p.fim),
    ativo: p.ativo ?? true,
    gerarCobrancaAsaas: p.gerarCobrancaAsaas ?? false,
    contaFinanceiraId: p.contaFinanceiraId ?? null,
    contaNome: p.contaNome ?? null,
    alunos: typeof p.alunos === "number" ? p.alunos : (p.alunos?.length ?? 0),
    tipo: tipoDoPlano(p.tipo),
  };
}

function planoDetalhe(p: PlanoCru): PlanoDetalhe {
  const alunos: AlunoDoPlano[] = Array.isArray(p.alunos)
    ? p.alunos.map((a) => ({
        studentId: a.studentId ?? 0,
        alunoNome: a.alunoNome ?? "",
        turma: a.turma ?? null,
        guardianId: a.guardianId === undefined || a.guardianId === null ? null : String(a.guardianId),
        nomeDoResponsavel: a.nomeDoResponsavel ?? null,
        ativo: a.ativo ?? true,
      }))
    : [];
  return { ...plano({ ...p, alunos: alunos.length }), alunos };
}

// ------------------------------------------------------------------ cobranças

/** Carteiras que a escola pode escolher ao cobrar. Vazio: nenhuma conta recebe ainda. */
export function useContasParaCobranca() {
  return useQuery({
    queryKey: [...PAGAMENTOS, "cobrancas", "contas"],
    staleTime: 60_000,
    queryFn: async (): Promise<ContaParaCobranca[]> => {
      const lista = await relacionamentoJson<(Partial<Omit<ContaParaCobranca, "contaId">> & { contaId?: string | number })[] | null>(
        "/cobrancas/contas",
        {},
        "Não foi possível carregar as contas que recebem pagamentos."
      );
      return (lista ?? []).map((c) => ({
        contaId: String(c.contaId ?? ""),
        nome: c.nome ?? "",
        banco: c.banco ?? "",
        provedor: c.provedor === "asaas" ? "asaas" : "manual",
        padraoParaCobrancas: c.padraoParaCobrancas ?? false,
        padraoParaMensalidades: c.padraoParaMensalidades ?? false,
        asaasOk: c.asaasOk ?? false,
      }));
    },
  });
}

/** Uma página de cobranças, filtrada e paginada no servidor (ordem: vencimento, da mais recente). */
export function useCobrancasDaEscola(filtro: FiltroDeCobrancas, pagina: number, tamanho: number) {
  return useQuery({
    queryKey: [
      ...PAGAMENTOS,
      "cobrancas",
      "lista",
      filtro.status,
      filtro.classId,
      filtro.de,
      filtro.ate,
      filtro.origem,
      filtro.contaId,
      filtro.busca,
      filtro.tipo,
      filtro.fonte,
      filtro.planoId,
      pagina,
      tamanho,
    ],
    staleTime: 15_000,
    // Trocar de página ou de filtro mantém a lista anterior na tela até a nova chegar.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PaginaDeCobrancas> => {
      const r = await relacionamentoJson<{
        itens?: CobrancaCrua[] | null;
        total?: number;
        pagina?: number;
        tamanho?: number;
        totais?: Partial<TotaisDeCobrancas> | null;
      } | null>(
        `/cobrancas${consulta({
          status: filtro.status,
          classId: filtro.classId,
          de: filtro.de,
          ate: filtro.ate,
          origem: filtro.origem,
          contaId: filtro.contaId,
          busca: filtro.busca.trim(),
          tipo: filtro.tipo,
          fonte: filtro.fonte,
          planoId: filtro.planoId,
          pagina,
          tamanho,
        })}`,
        {},
        "Não foi possível carregar as cobranças."
      );
      const itens = (r?.itens ?? []).map(cobranca);
      const t = r?.totais;
      return {
        itens,
        total: r?.total ?? itens.length,
        totais: t
          ? {
              valorTotal: t.valorTotal ?? 0,
              quantidadeEmAberto: t.quantidadeEmAberto ?? 0,
              valorEmAberto: t.valorEmAberto ?? 0,
              quantidadeVencidas: t.quantidadeVencidas ?? 0,
              valorVencido: t.valorVencido ?? 0,
              quantidadePagas: t.quantidadePagas ?? 0,
              valorPago: t.valorPago ?? 0,
            }
          : null,
        pagina: r?.pagina ?? pagina,
        tamanho: r?.tamanho ?? tamanho,
      };
    },
  });
}

/**
 * Resumo do topo. Com `de`/`ate` (vencimento) segue o período; sem eles, o mês e o ano dados.
 * `contaId` restringe a uma carteira.
 */
export function useResumoDeCobrancas(mes: number, ano: number, periodo: PeriodoDoResumo = {}) {
  const { de = "", ate = "", contaId = null } = periodo;
  const porPeriodo = de !== "" || ate !== "";
  return useQuery({
    queryKey: [...PAGAMENTOS, "cobrancas", "resumo", mes, ano, de, ate, contaId],
    staleTime: 15_000,
    queryFn: async (): Promise<ResumoDeCobrancas> => {
      const r = await relacionamentoJson<Partial<ResumoDeCobrancas> | null>(
        `/cobrancas/resumo${consulta(porPeriodo ? { de, ate, contaId } : { mes, ano, contaId })}`,
        {},
        "Não foi possível carregar o resumo."
      );
      return {
        emAberto: r?.emAberto ?? 0,
        vencidas: r?.vencidas ?? 0,
        pagasNoMes: r?.pagasNoMes ?? 0,
        valorEmAberto: r?.valorEmAberto ?? 0,
        valorPagoNoMes: r?.valorPagoNoMes ?? 0,
      };
    },
  });
}

/** Quem receberia a cobrança, para as turmas ou alunos escolhidos. Sem nenhum, a escola toda. */
export function usePublicoPrevistoDaEscola(classIds: number[], studentIds: number[], habilitado: boolean) {
  const turmas = [...classIds].sort((a, b) => a - b);
  const alunos = [...studentIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: [...PAGAMENTOS, "publico", turmas, alunos],
    enabled: habilitado,
    queryFn: async (): Promise<ResponsavelPrevisto[]> => {
      const lista = await relacionamentoJson<
        (Partial<Omit<ResponsavelPrevisto, "guardianId">> & { guardianId?: string | number })[] | null
      >(
        `/cobrancas/publico-previsto${consulta({
          classIds: turmas.join(","),
          studentIds: alunos.join(","),
        })}`,
        {},
        "Não foi possível montar o público das cobranças."
      );
      return (lista ?? []).map((r) => ({
        guardianId: String(r.guardianId ?? ""),
        nome: r.nome ?? "",
        alunos: r.alunos ?? [],
        jaCobrado: r.jaCobrado ?? false,
      }));
    },
  });
}

/** Cobrança nova, paga ou cancelada mexe na lista, no resumo, na visão por família e nos planos. */
function useInvalidarPagamentos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PAGAMENTOS });
}

export function useGerarCobrancasAvulsas() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: async (dados: GerarCobrancasAvulsas): Promise<ResultadoDaGeracao> => {
      const r = await relacionamentoJson<{
        criadas?: number;
        ignoradas?: Partial<Ignorada>[];
        avisos?: string[] | null;
        aviso?: string | null;
      } | null>(
        "/cobrancas/gerar",
        { method: "POST", body: JSON.stringify({ ...dados, contaFinanceiraId: dados.contaFinanceiraId ?? null }) },
        "Não foi possível gerar as cobranças."
      );
      return {
        criadas: r?.criadas ?? 0,
        ignoradas: ignoradas(r?.ignoradas),
        avisos: [...(r?.avisos ?? []), ...(r?.aviso ? [r.aviso] : [])].filter(Boolean),
      };
    },
    onSuccess: invalidar,
  });
}

export function useMarcarCobrancaPaga() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      formaDePagamento,
      contaFinanceiraId,
      ...encargos
    }: {
      id: string;
      data: string;
      formaDePagamento: string;
      /** Em qual conta o dinheiro caiu. Nulo = a conta da cobrança. */
      contaFinanceiraId?: string | null;
    } & ValorPagoDaCobranca) =>
      relacionamentoJson<void>(
        `/cobrancas/${id}/marcar-paga`,
        {
          method: "POST",
          body: JSON.stringify({ data, formaDePagamento, contaFinanceiraId: contaFinanceiraId ?? null, ...encargos }),
        },
        "Não foi possível marcar a cobrança como paga."
      ),
    // Baixa a cobrança e a receita ligada: a lista, o resumo, as receitas e o caixa mudam juntos.
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

export function useCancelarCobrancaDaEscola() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/cobrancas/${id}/cancelar`, { method: "POST" }, "Não foi possível cancelar a cobrança."),
    onSuccess: invalidar,
  });
}

// ------------------------------------------------------------------ planos

export function usePlanos() {
  return useQuery({
    queryKey: [...PAGAMENTOS, "planos", "lista"],
    staleTime: 15_000,
    queryFn: async (): Promise<Plano[]> => {
      const lista = await relacionamentoJson<PlanoCru[] | null>("/planos", {}, "Não foi possível carregar os planos.");
      // A Mensalidade vem na mesma lista (plano do tipo mensalidade), mas tem cartao e dialogos
      // proprios na tela: aqui ficam so os planos "Outro".
      return (lista ?? []).map(plano).filter((p) => p.tipo !== "mensalidade");
    },
  });
}

/** O plano Mensalidade em si (um por escola), para editar a carteira dele; null enquanto nao existe. */
export function usePlanoDaMensalidade() {
  return useQuery({
    queryKey: [...PAGAMENTOS, "planos", "mensalidade"],
    staleTime: 15_000,
    queryFn: async (): Promise<Plano | null> => {
      const lista = await relacionamentoJson<PlanoCru[] | null>("/planos", {}, "Não foi possível carregar os planos.");
      return (lista ?? []).map(plano).find((p) => p.tipo === "mensalidade") ?? null;
    },
  });
}

export function usePlano(id: string | null) {
  return useQuery({
    queryKey: [...PAGAMENTOS, "planos", "detalhe", id],
    enabled: !!id,
    queryFn: async () =>
      planoDetalhe((await relacionamentoJson<PlanoCru | null>(`/planos/${id}`, {}, "Não foi possível abrir o plano.")) ?? {}),
  });
}

export function useCriarPlano() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: async (dados: SalvarPlano & { studentIds: number[] }): Promise<Plano> =>
      plano(
        (await relacionamentoJson<PlanoCru | null>(
          "/planos",
          { method: "POST", body: JSON.stringify({ ...dados, contaFinanceiraId: dados.contaFinanceiraId ?? null }) },
          "Não foi possível criar o plano."
        )) ?? {}
      ),
    onSuccess: invalidar,
  });
}

export function useEditarPlano() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: SalvarPlano }) =>
      relacionamentoJson<void>(
        `/planos/${id}`,
        { method: "PUT", body: JSON.stringify({ ...dados, contaFinanceiraId: dados.contaFinanceiraId ?? null }) },
        "Não foi possível salvar o plano."
      ),
    onSuccess: invalidar,
  });
}

/** Troca a lista de alunos do plano pela enviada. */
export function useDefinirAlunosDoPlano() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: ({ id, studentIds }: { id: string; studentIds: number[] }) =>
      relacionamentoJson<void>(
        `/planos/${id}/alunos`,
        { method: "POST", body: JSON.stringify({ studentIds }) },
        "Não foi possível salvar os alunos do plano."
      ),
    onSuccess: invalidar,
  });
}

export function useAlternarPlano() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: ({ id, ativar }: { id: string; ativar: boolean }) =>
      relacionamentoJson<void>(
        `/planos/${id}/${ativar ? "ativar" : "desativar"}`,
        { method: "POST" },
        ativar ? "Não foi possível ativar o plano." : "Não foi possível desativar o plano."
      ),
    onSuccess: invalidar,
  });
}

export function useGerarCobrancasDoPlano() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: async ({ id, ano, mes }: { id: string; ano: number; mes: number }): Promise<ResultadoDoPlano> => {
      const r = await relacionamentoJson<{
        criadas?: number;
        existentes?: number;
        ignoradas?: number | Partial<Ignorada>[];
      } | null>(
        `/planos/${id}/gerar${consulta({ ano, mes })}`,
        { method: "POST" },
        "Não foi possível gerar as cobranças do plano."
      );
      const lista = Array.isArray(r?.ignoradas) ? ignoradas(r.ignoradas) : [];
      return {
        criadas: r?.criadas ?? 0,
        existentes: r?.existentes ?? 0,
        ignoradas: lista,
        totalDeIgnoradas: typeof r?.ignoradas === "number" ? r.ignoradas : lista.length,
      };
    },
    onSuccess: invalidar,
  });
}

// ------------------------------------------------------------------ por família

/** O que a família vê no portal: o mesmo corpo de /api/Responsavel/pagamentos. */
export function usePagamentosDaFamiliaNaEscola(guardianId: string | null) {
  return useQuery({
    queryKey: [...PAGAMENTOS, "familia", guardianId],
    enabled: !!guardianId,
    queryFn: async (): Promise<PagamentosDaFamilia> =>
      pagamentosDaFamilia(
        await relacionamentoJson<PagamentosDaFamiliaCru | null>(
          `/familias/${encodeURIComponent(guardianId ?? "")}/pagamentos`,
          {},
          "Não foi possível carregar os pagamentos da família."
        )
      ),
  });
}


// ------------------------------------------------------------------ mensalidade

/** Um aluno na mensalidade: o plano dele (valor, dia, vigência, reajuste). */
export interface AlunoDaMensalidade {
  tuitionPlanId: string | null;
  studentId: number;
  alunoNome: string;
  turma: string | null;
  guardianId: string | null;
  nomeDoResponsavel: string | null;
  valorMensal: number;
  diaVencimento: number;
  /** yyyy-MM-dd */
  dataInicio: string;
  dataFim: string | null;
  /** Reajuste combinado com a família (%). Nulo = vale o percentual da escola. */
  percentualReajuste: number | null;
  ativo: boolean;
  gerarCobrancaAsaas: boolean;
}

export interface Mensalidades {
  quantidadeDeAlunos: number;
  quantidadeAtivos: number;
  valorMaisComum: number | null;
  diaVencimentoMaisComum: number | null;
  /** Conta em que as mensalidades caem (a padrão das mensalidades). */
  contaFinanceiraId: string | null;
  contaNome: string | null;
  gerarCobrancaAsaasPadrao: boolean;
  /** Próximo mês a gerar, "AAAA-MM". */
  proximaCompetencia: string;
  alunos: AlunoDaMensalidade[];
}

export interface SalvarAlunoDaMensalidade {
  studentId: number;
  guardianId?: string | null;
  valorMensal: number;
  diaVencimento: number;
  dataInicio: string;
  dataFim?: string | null;
  percentualReajuste?: number | null;
  gerarCobrancaAsaas: boolean;
  /** true reativa quem tinha saido da mensalidade; sem o campo o backend nao reativa. */
  ativo?: boolean | null;
}

export interface ResultadoDaGeracaoMensal {
  criadas: number;
  existentes: number;
  ignoradas: Ignorada[];
  totalDeIgnoradas: number;
  avisos: string[];
}

type AlunoDaMensalidadeCru = Partial<Omit<AlunoDaMensalidade, "guardianId" | "tuitionPlanId">> & {
  guardianId?: string | number | null;
  tuitionPlanId?: string | number | null;
  /** Nome atual no backend (Limpeza 1); tuitionPlanId e o nome antigo. */
  planoAlunoId?: string | number | null;
};
type MensalidadesCru = Partial<Omit<Mensalidades, "alunos" | "contaFinanceiraId">> & {
  contaFinanceiraId?: string | number | null;
  alunos?: AlunoDaMensalidadeCru[] | null;
};

function competenciaDeHoje(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function mensalidades(m: MensalidadesCru | null | undefined): Mensalidades {
  const alunos: AlunoDaMensalidade[] = (m?.alunos ?? []).map((a) => ({
    tuitionPlanId: (() => { const id = a.planoAlunoId ?? a.tuitionPlanId; return id === undefined || id === null ? null : String(id); })(),
    studentId: a.studentId ?? 0,
    alunoNome: a.alunoNome ?? "",
    turma: a.turma ?? null,
    guardianId: a.guardianId === undefined || a.guardianId === null ? null : String(a.guardianId),
    nomeDoResponsavel: a.nomeDoResponsavel ?? null,
    valorMensal: a.valorMensal ?? 0,
    diaVencimento: a.diaVencimento ?? 10,
    dataInicio: dia(a.dataInicio) ?? "",
    dataFim: dia(a.dataFim),
    percentualReajuste: a.percentualReajuste ?? null,
    ativo: a.ativo ?? true,
    gerarCobrancaAsaas: a.gerarCobrancaAsaas ?? false,
  }));
  return {
    quantidadeDeAlunos: m?.quantidadeDeAlunos ?? alunos.length,
    quantidadeAtivos: m?.quantidadeAtivos ?? alunos.filter((a) => a.ativo).length,
    valorMaisComum: m?.valorMaisComum ?? null,
    diaVencimentoMaisComum: m?.diaVencimentoMaisComum ?? null,
    contaFinanceiraId:
      m?.contaFinanceiraId === undefined || m.contaFinanceiraId === null ? null : String(m.contaFinanceiraId),
    contaNome: m?.contaNome ?? null,
    gerarCobrancaAsaasPadrao: m?.gerarCobrancaAsaasPadrao ?? false,
    proximaCompetencia: m?.proximaCompetencia ?? competenciaDeHoje(),
    alunos,
  };
}

/** A mensalidade da escola: o resumo e os alunos com valor, dia e vigência. */
export function useMensalidades() {
  return useQuery({
    queryKey: [...PAGAMENTOS, "mensalidades"],
    staleTime: 15_000,
    queryFn: async (): Promise<Mensalidades> =>
      mensalidades(
        await relacionamentoJson<MensalidadesCru | null>(
          "/mensalidades",
          {},
          "Não foi possível carregar as mensalidades."
        )
      ),
  });
}

/** Grava (inclui ou atualiza) os alunos enviados, um plano de mensalidade por aluno. */
export function useSalvarAlunosDaMensalidade() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: async (alunos: SalvarAlunoDaMensalidade[]): Promise<Mensalidades> =>
      mensalidades(
        await relacionamentoJson<MensalidadesCru | null>(
          "/mensalidades/alunos",
          {
            method: "PUT",
            body: JSON.stringify({
              alunos: alunos.map((a) => ({
                ...a,
                guardianId: a.guardianId ?? null,
                dataFim: a.dataFim ?? null,
                percentualReajuste: a.percentualReajuste ?? null,
              })),
            }),
          },
          "Não foi possível salvar as mensalidades dos alunos."
        )
      ),
    onSuccess: invalidar,
  });
}

/** Tira o aluno da mensalidade (desativa o plano dele). As parcelas já geradas continuam. */
export function useRemoverAlunoDaMensalidade() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: (studentId: number) =>
      relacionamentoJson<void>(
        `/mensalidades/alunos/${studentId}`,
        { method: "DELETE" },
        "Não foi possível tirar o aluno da mensalidade."
      ),
    onSuccess: invalidar,
  });
}

/** Gera as parcelas do mês. Quem já tem a parcela daquele mês não recebe outra. */
export function useGerarMensalidades() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: async ({ ano, mes }: { ano: number; mes: number }): Promise<ResultadoDaGeracaoMensal> => {
      const r = await relacionamentoJson<{
        criadas?: number;
        existentes?: number;
        ignoradas?: number | Partial<Ignorada>[] | null;
        avisos?: string[] | null;
      } | null>(
        `/mensalidades/gerar${consulta({ ano, mes })}`,
        { method: "POST" },
        "Não foi possível gerar as parcelas da mensalidade."
      );
      const lista = Array.isArray(r?.ignoradas) ? ignoradas(r.ignoradas) : [];
      return {
        criadas: r?.criadas ?? 0,
        existentes: r?.existentes ?? 0,
        ignoradas: lista,
        totalDeIgnoradas: typeof r?.ignoradas === "number" ? r.ignoradas : lista.length,
        avisos: (r?.avisos ?? []).filter(Boolean),
      };
    },
    onSuccess: invalidar,
  });
}

// ------------------------------------------------------------------ inadimplência

export interface CobrancaEmAtraso extends Cobranca {
  diasAtraso: number;
}

export interface FamiliaInadimplente {
  guardianId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  totalVencido: number;
  quantidade: number;
  itens: CobrancaEmAtraso[];
}

export interface InadimplenciaUnificada {
  totalVencido: number;
  quantidade: number;
  familias: FamiliaInadimplente[];
}

export interface FiltroDeInadimplencia {
  contaId: string | null;
  fonte: FonteDaCobranca | null;
  classId: number | null;
  busca: string;
  /** Vencimento a partir de / até (yyyy-MM-dd). */
  de: string;
  ate: string;
}

/** Quem está devendo, agrupado por família: cobranças vencidas e não pagas de todas as fontes. */
export function useInadimplenciaUnificada(filtro: FiltroDeInadimplencia) {
  return useQuery({
    queryKey: [
      ...PAGAMENTOS,
      "inadimplencia",
      filtro.contaId,
      filtro.fonte,
      filtro.classId,
      filtro.busca,
      filtro.de,
      filtro.ate,
    ],
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<InadimplenciaUnificada> => {
      const r = await relacionamentoJson<{
        totalVencido?: number;
        quantidade?: number;
        familias?:
          | (Partial<Omit<FamiliaInadimplente, "guardianId" | "itens">> & {
              guardianId?: string | number;
              itens?: (CobrancaCrua & { diasAtraso?: number })[] | null;
            })[]
          | null;
      } | null>(
        `/cobrancas/inadimplencia${consulta({
          contaId: filtro.contaId,
          fonte: filtro.fonte,
          classId: filtro.classId,
          busca: filtro.busca.trim(),
          de: filtro.de,
          ate: filtro.ate,
        })}`,
        {},
        "Não foi possível carregar a inadimplência."
      );
      const familias: FamiliaInadimplente[] = (r?.familias ?? []).map((f) => {
        const itens: CobrancaEmAtraso[] = (f.itens ?? []).map((i) => ({ ...cobranca(i), diasAtraso: i.diasAtraso ?? 0 }));
        return {
          guardianId: String(f.guardianId ?? ""),
          nome: f.nome ?? "",
          email: f.email ?? null,
          telefone: f.telefone ?? null,
          totalVencido: f.totalVencido ?? itens.reduce((soma, i) => soma + i.valor, 0),
          quantidade: f.quantidade ?? itens.length,
          itens,
        };
      });
      return {
        totalVencido: r?.totalVencido ?? familias.reduce((soma, f) => soma + f.totalVencido, 0),
        quantidade: r?.quantidade ?? familias.reduce((soma, f) => soma + f.quantidade, 0),
        familias,
      };
    },
  });
}
