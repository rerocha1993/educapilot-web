import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { abrirArquivoEmNovaAba, financeiroEnviarArquivo, financeiroJson } from "./financeiro-api";
import { invalidarFinanceiro } from "./invalidar-financeiro";

// ExpenseType: Custo=1, Despesa=2, Investimento=3
export const EXPENSE_CATEGORIES = [
  { value: 1, label: "Custo" },
  { value: 2, label: "Despesa" },
  { value: 3, label: "Investimento" },
] as const;

export interface ExpenseDto {
  id: string;
  nome: string;
  tipo: string | null;
  subcategoria: string | null;
  descricao: string | null;
  categoria: number;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  statusPagamento: string; // "Pendente" | "Pago" | "Vencido" (volta como Vencido ao reabrir uma despesa atrasada)
  centroCusto: string | null;
  competenciaMes: number;
  competenciaAno: number;

  // Fase 1 do financeiro: conta, plano de contas e centro de custo cadastrados.
  bancoContaId?: string | null;
  categoriaFinanceiraId?: string | null;
  centroDeCustoId?: string | null;

  /**
   * Tem comprovante anexado (foto ou PDF). Campo novo da fase W1: enquanto a API não o devolver,
   * vem ausente e a tela só mostra "Anexar comprovante".
   */
  temComprovante?: boolean | null;

  // F4 (2026-10): série "repete todo mês". Parcela 3 de 12 = numeroDaParcela 3, totalDeParcelas 12.
  recorrente?: boolean;
  serieId?: string | null;
  numeroDaParcela?: number | null;
  totalDeParcelas?: number | null;

  metodoPagamento?: string | null;
  fornecedorNome?: string | null;
  fornecedorDocumento?: string | null;
  observacoes?: string | null;

  // F5 (2026-10): baixa com valor real. valorPago é nulo enquanto em aberto.
  valorPago?: number | null;
  juros?: number | null;
  multa?: number | null;
  desconto?: number | null;
  /** noDia, antecipado ou atrasado; nulo em aberto. */
  situacaoDoPagamento?: "noDia" | "antecipado" | "atrasado" | null;
  diasDeAtraso?: number | null;
}

/** Parcela de uma série (a despesa "repete todo mês"). */
export function ehParcelaDeSerie(e: ExpenseDto): boolean {
  return !!e.serieId && (e.totalDeParcelas ?? 0) > 1;
}

export function useExpensesByMonth(month: number, year: number) {
  return useQuery({
    queryKey: ["expenses", month, year],
    queryFn: async () => {
      const result = await financeApi.GET("/api/Expenses", { params: { query: { month, year } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar as despesas.");
      return (data ?? []) as unknown as ExpenseDto[];
    },
  });
}

export interface CreateExpenseInput {
  nome: string;
  descricao?: string | null;
  categoria: number;
  subcategoria?: string | null;
  tipo?: string | null;
  valor: number;
  dataVencimento: string;
  centroCusto?: string | null;
  competenciaMes: number;
  competenciaAno: number;

  // Fase 1 do financeiro: conta, plano de contas e centro de custo cadastrados.
  bancoContaId?: string | null;
  categoriaFinanceiraId?: string | null;
  centroDeCustoId?: string | null;

  // O PUT substitui estes campos: ao editar, a tela devolve o que já estava gravado.
  metodoPagamento?: string | null;
  fornecedorNome?: string | null;
  fornecedorDocumento?: string | null;
  observacoes?: string | null;

  /** F4: cria a despesa em N parcelas mensais (2 a 60). Ausente cria uma só. */
  repetirPorMeses?: number;
}

/** O que a criação devolve: a primeira parcela e, quando repete, todas. */
export interface DespesaCriada {
  id: string;
  serieId?: string | null;
  parcelas: string[];
}

// As rotas novas (F4 e F5) ainda não estão nos tipos gerados do Swagger: fetch cru, no mesmo
// caminho dos comprovantes. Os erros 400, 404 e 409 chegam com `message`, que o Error carrega.

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      financeiroJson<DespesaCriada>(
        "/api/Expenses",
        { method: "POST", body: JSON.stringify({ ...input, moeda: "BRL", statusPagamento: "Pendente" }) },
        "Não foi possível criar a despesa."
      ),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

/** Quais parcelas de uma série a edição ou a exclusão alcança. */
export type EscopoDaSerie = "esta" | "seguintes";

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, escopo, dados }: { id: string; escopo: EscopoDaSerie; dados: CreateExpenseInput }) =>
      financeiroJson<ExpenseDto>(
        `/api/Expenses/${id}?escopo=${escopo}`,
        { method: "PUT", body: JSON.stringify({ ...dados, moeda: "BRL" }) },
        "Não foi possível salvar a despesa."
      ),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, escopo }: { id: string; escopo: EscopoDaSerie }) =>
      financeiroJson<{ excluidas: number }>(
        `/api/Expenses/${id}?escopo=${escopo}`,
        { method: "DELETE" },
        "Não foi possível excluir a despesa."
      ),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

/** Corpo de POST /api/Expenses/{id}/baixar. A divisão vai explícita quando o valor pago difere. */
export interface BaixaDaDespesa {
  /** aaaa-mm-dd; não pode ser futura. */
  dataPagamento: string;
  valorPago?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceiraId?: string;
  metodoPagamento?: string;
  observacao?: string;
}

export function useBaixarDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...baixa }: BaixaDaDespesa & { id: string }) =>
      financeiroJson<ExpenseDto>(
        `/api/Expenses/${id}/baixar`,
        { method: "POST", body: JSON.stringify(baixa) },
        "Não foi possível registrar o pagamento."
      ),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

export function useReabrirDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      financeiroJson<ExpenseDto>(`/api/Expenses/${id}/reabrir`, { method: "POST" }, "Não foi possível reabrir a despesa."),
    onSuccess: () => invalidarFinanceiro(queryClient),
  });
}

/** Anexa (ou troca) o comprovante de uma despesa: foto ou PDF, em multipart no campo `arquivo`. */
export function useAnexarComprovanteDaDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
      financeiroEnviarArquivo<void>(
        `/api/Expenses/${id}/comprovante`,
        arquivo,
        "Não foi possível anexar o comprovante."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

/** Abre o comprovante da despesa numa aba nova (a aba abre no clique; ver abrirArquivoEmNovaAba). */
export function abrirComprovanteDaDespesa(id: string, nomeDoArquivo: string, janela?: Window | null) {
  return abrirArquivoEmNovaAba(
    `/api/Expenses/${id}/comprovante`,
    nomeDoArquivo,
    janela,
    "Não foi possível abrir o comprovante."
  );
}
