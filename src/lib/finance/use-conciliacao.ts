import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

/**
 * Conciliação bancária — fase 2 do financeiro.
 *
 * `fetch` cru porque as rotas são novas e ainda não estão nos tipos gerados do Swagger. A
 * importação sobe um arquivo, então vai como FormData e sem Content-Type: quem monta o limite
 * do multipart é o próprio navegador.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type SituacaoDoMovimento = 1 | 2 | 3;

export const SITUACAO = {
  pendente: 1 as SituacaoDoMovimento,
  conciliado: 2 as SituacaoDoMovimento,
  ignorado: 3 as SituacaoDoMovimento,
};

export interface SugestaoDeLancamento {
  id: string;
  tipo: "Receita" | "Despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  pagamento?: string | null;
  categoria?: string | null;
  diasDeDiferenca: number;
}

export interface MovimentoDoExtrato {
  id: string;
  contaId: string;
  contaNome?: string | null;
  data: string;
  valor: number;
  descricao: string;
  situacao: SituacaoDoMovimento;
  receitaId?: string | null;
  despesaId?: string | null;
  lancamentoDescricao?: string | null;
  sugestoes: SugestaoDeLancamento[];
  regraId?: string | null;
  regraNome?: string | null;
  regraCategoriaId?: string | null;
  regraCategoriaNome?: string | null;
}

export interface PainelDaConciliacao {
  contaId: string;
  contaNome: string;
  pendentes: number;
  conciliados: number;
  ignorados: number;
  saldoDoSistema: number;
  saldoDoBanco?: number | null;
  dataDoSaldoDoBanco?: string | null;
  divergencia?: number | null;
  ultimaImportacao?: string | null;
  movimentos: MovimentoDoExtrato[];
}

export interface ResultadoDaImportacao {
  importacaoId: string;
  linhasLidas: number;
  linhasNovas: number;
  jaExistiam: number;
  conciliadasSozinhas: number;
  lancadasPorRegra: number;
  pendentes: number;
  periodoInicio?: string | null;
  periodoFim?: string | null;
  saldoDoBanco?: number | null;
  aviso?: string | null;
}

export interface RegraDeConciliacao {
  id: string;
  contem: string;
  tipo: "Receita" | "Despesa";
  categoriaFinanceiraId?: string | null;
  categoriaNome?: string | null;
  centroDeCustoId?: string | null;
  lancarAutomaticamente: boolean;
  ativa: boolean;
  ordem: number;
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/finance/conciliacao${caminho}`, {
    ...init,
    headers: {
      ...(init?.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
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

export function usePainelDaConciliacao(contaId: string | null, situacao?: SituacaoDoMovimento) {
  return useQuery({
    queryKey: ["finance", "conciliacao", contaId, situacao ?? null],
    enabled: !!contaId,
    queryFn: () =>
      chamar<PainelDaConciliacao>(
        `/${contaId}${situacao ? `?situacao=${situacao}` : ""}`
      ),
  });
}

export function useImportarExtrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contaId, arquivo }: { contaId: string; arquivo: File }) => {
      const corpo = new FormData();
      corpo.append("arquivo", arquivo);
      return chamar<ResultadoDaImportacao>(`/${contaId}/importar`, { method: "POST", body: corpo });
    },
    onSuccess: () => {
      // A importação pode ter dado baixa em lançamentos: receitas, despesas e saldos mudam junto.
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

function useAcaoNoMovimento<TVariaveis>(
  executar: (variaveis: TVariaveis) => Promise<void>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useConciliar() {
  return useAcaoNoMovimento(({ id, tipo, lancamentoId }: { id: string; tipo: string; lancamentoId: string }) =>
    chamar<void>(`/movimentos/${id}/conciliar`, {
      method: "POST",
      body: JSON.stringify({ tipo, lancamentoId }),
    })
  );
}

export function useIgnorarMovimento() {
  return useAcaoNoMovimento((id: string) => chamar<void>(`/movimentos/${id}/ignorar`, { method: "POST" }));
}

export function useDesfazerConciliacao() {
  return useAcaoNoMovimento((id: string) => chamar<void>(`/movimentos/${id}/desfazer`, { method: "POST" }));
}

export function useLancarDoExtrato() {
  return useAcaoNoMovimento(
    ({ id, ...dados }: { id: string; descricao?: string | null; categoriaFinanceiraId?: string | null; centroDeCustoId?: string | null }) =>
      chamar<void>(`/movimentos/${id}/lancar`, { method: "POST", body: JSON.stringify(dados) })
  );
}

export function useRegrasDeConciliacao() {
  return useQuery({
    queryKey: ["finance", "regras-conciliacao"],
    queryFn: () => chamar<RegraDeConciliacao[]>("/regras"),
  });
}

export function useSalvarRegraDeConciliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: Partial<RegraDeConciliacao> }) =>
      chamar<RegraDeConciliacao>(id ? `/regras/${id}` : "/regras", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useExcluirRegraDeConciliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/regras/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}
