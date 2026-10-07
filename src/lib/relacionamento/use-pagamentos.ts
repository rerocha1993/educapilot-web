import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StatusDaCobranca } from "@/lib/finance/use-projetos";
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
 */

const CHAVE = "relacionamento";
const PAGAMENTOS = [CHAVE, "pagamentos"] as const;

// ------------------------------------------------------------------ vocabulário

export const STATUS_DA_COBRANCA: StatusDaCobranca[] = ["Pendente", "Vencida", "Paga", "Cancelada"];
export type OrigemDaCobranca = "Asaas" | "Manual";

function statusDaCobranca(v: string | null | undefined): StatusDaCobranca {
  return v === "Paga" || v === "Vencida" || v === "Cancelada" ? v : "Pendente";
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
  pedidoId: string | null;
  asaasInvoiceUrl: string | null;
  pixCopiaECola: string | null;
  /** O resumo da escola não manda o QR; se o servidor passar a mandar, a tela já o mostra. */
  pixQrCodeBase64: string | null;
  boletoUrl: string | null;
  pagaEm: string | null;
  formaDePagamento: string | null;
}

export interface FiltroDeCobrancas {
  status: StatusDaCobranca | null;
  classId: number | null;
  /** Vencimento a partir de (yyyy-MM-dd). */
  de: string;
  ate: string;
  origem: OrigemDaCobranca | null;
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
  alunos: number;
}

export interface AlunoDoPlano {
  studentId: number;
  nome: string;
  turma: string | null;
  guardianNome: string | null;
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

type CobrancaCrua = Partial<Omit<Cobranca, "guardianId" | "studentId" | "status" | "origem">> & {
  guardianId?: string | number;
  studentId?: string | number | null;
  status?: string;
  origem?: string;
};

function cobranca(c: CobrancaCrua): Cobranca {
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
    pedidoId: c.pedidoId ?? null,
    asaasInvoiceUrl: c.asaasInvoiceUrl ?? null,
    pixCopiaECola: c.pixCopiaECola ?? null,
    pixQrCodeBase64: c.pixQrCodeBase64 ?? null,
    boletoUrl: c.boletoUrl ?? null,
    pagaEm: dia(c.pagaEm),
    formaDePagamento: c.formaDePagamento ?? null,
  };
}

function ignoradas(lista: Partial<Ignorada>[] | null | undefined): Ignorada[] {
  return (lista ?? []).map((i) => ({ nome: i.nome ?? "", motivo: i.motivo ?? "" }));
}

type PlanoCru = Partial<Omit<Plano, "alunos">> & { alunos?: number | Partial<AlunoDoPlano>[] };

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
    alunos: typeof p.alunos === "number" ? p.alunos : (p.alunos?.length ?? 0),
  };
}

function planoDetalhe(p: PlanoCru): PlanoDetalhe {
  const alunos = Array.isArray(p.alunos)
    ? p.alunos.map((a) => ({
        studentId: a.studentId ?? 0,
        nome: a.nome ?? "",
        turma: a.turma ?? null,
        guardianNome: a.guardianNome ?? null,
        ativo: a.ativo ?? true,
      }))
    : [];
  return { ...plano({ ...p, alunos: alunos.length }), alunos };
}

// ------------------------------------------------------------------ cobranças

export function useCobrancasDaEscola(filtro: FiltroDeCobrancas) {
  return useQuery({
    queryKey: [...PAGAMENTOS, "cobrancas", "lista", filtro.status, filtro.classId, filtro.de, filtro.ate, filtro.origem],
    staleTime: 15_000,
    queryFn: async (): Promise<Cobranca[]> => {
      const lista = await relacionamentoJson<CobrancaCrua[] | null>(
        `/cobrancas${consulta({
          status: filtro.status,
          classId: filtro.classId,
          de: filtro.de,
          ate: filtro.ate,
          origem: filtro.origem,
        })}`,
        {},
        "Não foi possível carregar as cobranças."
      );
      return (lista ?? []).map(cobranca);
    },
  });
}

export function useResumoDeCobrancas(mes: number, ano: number) {
  return useQuery({
    queryKey: [...PAGAMENTOS, "cobrancas", "resumo", mes, ano],
    staleTime: 15_000,
    queryFn: async (): Promise<ResumoDeCobrancas> => {
      const r = await relacionamentoJson<Partial<ResumoDeCobrancas> | null>(
        `/cobrancas/resumo${consulta({ mes, ano })}`,
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
      const r = await relacionamentoJson<{ criadas?: number; ignoradas?: Partial<Ignorada>[] } | null>(
        "/cobrancas/gerar",
        { method: "POST", body: JSON.stringify(dados) },
        "Não foi possível gerar as cobranças."
      );
      return { criadas: r?.criadas ?? 0, ignoradas: ignoradas(r?.ignoradas) };
    },
    onSuccess: invalidar,
  });
}

export function useMarcarCobrancaPaga() {
  const invalidar = useInvalidarPagamentos();
  return useMutation({
    mutationFn: ({ id, data, formaDePagamento }: { id: string; data: string; formaDePagamento: string }) =>
      relacionamentoJson<void>(
        `/cobrancas/${id}/marcar-paga`,
        { method: "POST", body: JSON.stringify({ data, formaDePagamento }) },
        "Não foi possível marcar a cobrança como paga."
      ),
    onSuccess: invalidar,
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
      return (lista ?? []).map(plano);
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
          { method: "POST", body: JSON.stringify(dados) },
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
        { method: "PUT", body: JSON.stringify(dados) },
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
