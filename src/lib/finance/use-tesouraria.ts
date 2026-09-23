import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

/**
 * Contas, plano de contas e fechamento do mês — fase 1 do financeiro.
 *
 * `fetch` cru porque as rotas são novas e ainda não estão nos tipos gerados do Swagger, mesmo
 * caminho já usado no Kanban e em contratos. A mensagem de erro do backend vai direto para a
 * tela: é ela que explica por que a conta não pode ser apagada ou o mês não pode ser fechado.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type TipoDaConta = 1 | 2 | 3 | 4;

export const TIPOS_DE_CONTA: { valor: TipoDaConta; rotulo: string }[] = [
  { valor: 1, rotulo: "Conta corrente" },
  { valor: 2, rotulo: "Poupança" },
  { valor: 3, rotulo: "Caixa (dinheiro)" },
  { valor: 4, rotulo: "Carteira digital" },
];

export interface SaldoDaConta {
  id: string;
  nome: string;
  banco: string;
  tipo: TipoDaConta;
  agencia?: string | null;
  numero?: string | null;
  ativa: boolean;
  padraoParaRecebimento: boolean;
  saldoInicial: number;
  dataDoSaldoInicial: string;
  recebido: number;
  pago: number;
  transferidoParaDentro: number;
  transferidoParaFora: number;
  saldoAtual: number;
  aReceber: number;
  aPagar: number;
}

export interface EntradaDeConta {
  nome: string;
  banco: string;
  tipo: TipoDaConta;
  agencia?: string | null;
  numero?: string | null;
  saldoInicial: number;
  dataDoSaldoInicial: string;
  ativa: boolean;
  padraoParaRecebimento: boolean;
  observacao?: string | null;
}

export interface Transferencia {
  id: string;
  contaOrigemId: string;
  contaDestinoId: string;
  contaOrigemNome?: string | null;
  contaDestinoNome?: string | null;
  valor: number;
  data: string;
  descricao?: string | null;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: "Receita" | "Despesa";
  codigo?: string | null;
  paiId?: string | null;
  paiNome?: string | null;
  ativa: boolean;
  ordem: number;
  lancamentos: number;
}

export interface CentroDeCusto {
  id: string;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  lancamentos: number;
}

export interface SaldoNoFechamento {
  contaId: string;
  nome: string;
  saldo: number;
}

export interface Fechamento {
  id: string;
  ano: number;
  mes: number;
  fechadoEm: string;
  fechadoPor?: string | null;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  observacao?: string | null;
  saldos: SaldoNoFechamento[];
}

export interface PreviaDoFechamento {
  ano: number;
  mes: number;
  jaFechado: boolean;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  receitasEmAberto: number;
  despesasEmAberto: number;
  valorEmAberto: number;
  semConta: number;
  semCategoria: number;
  saldos: SaldoNoFechamento[];
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/finance${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error((corpo as { message?: string } | null)?.message ?? "Não foi possível concluir a ação.");
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---------------------------------------------------------------- contas */

export function useContas(incluirInativas = false) {
  return useQuery({
    queryKey: ["finance", "contas", incluirInativas],
    queryFn: () => chamar<SaldoDaConta[]>(`/contas?incluirInativas=${incluirInativas}`),
  });
}

export function useSalvarConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: EntradaDeConta }) =>
      chamar<SaldoDaConta>(id ? `/contas/${id}` : "/contas", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "contas"] }),
  });
}

export function useExcluirConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/contas/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "contas"] }),
  });
}

export function useTransferencias() {
  return useQuery({
    queryKey: ["finance", "transferencias"],
    queryFn: () => chamar<Transferencia[]>("/contas/transferencias"),
  });
}

export function useTransferir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { contaOrigemId: string; contaDestinoId: string; valor: number; data: string; descricao?: string | null }) =>
      chamar<Transferencia>("/contas/transferencias", { method: "POST", body: JSON.stringify(dados) }),
    onSuccess: () => {
      // O saldo das duas contas muda junto com a transferência — invalida os dois.
      queryClient.invalidateQueries({ queryKey: ["finance", "transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "contas"] });
    },
  });
}

export function useExcluirTransferencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/contas/transferencias/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "contas"] });
    },
  });
}

/* -------------------------------------------------------- plano de contas */

export function useCategoriasFinanceiras(incluirInativas = false) {
  return useQuery({
    queryKey: ["finance", "plano-de-contas", incluirInativas],
    queryFn: () => chamar<CategoriaFinanceira[]>(`/plano-de-contas?incluirInativas=${incluirInativas}`),
  });
}

export function useSalvarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: Partial<CategoriaFinanceira> }) =>
      chamar<CategoriaFinanceira>(id ? `/plano-de-contas/${id}` : "/plano-de-contas", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "plano-de-contas"] }),
  });
}

export function useExcluirCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/plano-de-contas/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "plano-de-contas"] }),
  });
}

export function useCentrosDeCusto(incluirInativos = false) {
  return useQuery({
    queryKey: ["finance", "centros", incluirInativos],
    queryFn: () => chamar<CentroDeCusto[]>(`/plano-de-contas/centros?incluirInativos=${incluirInativos}`),
  });
}

export function useSalvarCentro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: Partial<CentroDeCusto> }) =>
      chamar<CentroDeCusto>(id ? `/plano-de-contas/centros/${id}` : "/plano-de-contas/centros", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "centros"] }),
  });
}

export function useExcluirCentro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/plano-de-contas/centros/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "centros"] }),
  });
}

/* ------------------------------------------------------------- fechamento */

export function useFechamentos(ano: number) {
  return useQuery({
    queryKey: ["finance", "fechamentos", ano],
    queryFn: () => chamar<Fechamento[]>(`/fechamento?ano=${ano}`),
  });
}

export function usePreviaDoFechamento(ano: number, mes: number) {
  return useQuery({
    queryKey: ["finance", "fechamento-previa", ano, mes],
    queryFn: () => chamar<PreviaDoFechamento>(`/fechamento/previa?ano=${ano}&mes=${mes}`),
  });
}

export function useFecharMes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { ano: number; mes: number; observacao?: string | null }) =>
      chamar<Fechamento>("/fechamento", { method: "POST", body: JSON.stringify(dados) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useReabrirMes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ano, mes }: { ano: number; mes: number }) =>
      chamar<void>(`/fechamento/${ano}/${mes}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

/** Baixa a planilha do mês. Não é useQuery: é um download, não um dado da tela. */
export async function baixarPlanilhaDoMes(ano: number, mes: number) {
  const token = getToken();
  const res = await fetch(`${API}/api/finance/fechamento/excel?ano=${ano}&mes=${mes}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Não foi possível gerar a planilha.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${ano}-${String(mes).padStart(2, "0")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
