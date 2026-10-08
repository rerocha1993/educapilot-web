import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMasterToken } from "@/lib/auth/master-session";

/**
 * Uso de IA por escola (painel Master): quanto cada escola gastou da conta da Anthropic no mês, o limite de
 * respostas que o Master define, a cotação do dólar e a conferência com a fatura. As rotas são só do Master e
 * ficam fora do OpenAPI gerado, por isso o fetch cru (mesmo padrão de use-storage).
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type AoEstourarOLimite = "PassarParaEquipe" | "Continuar";

export interface UsoDeIaTotal {
  respostas: number;
  testes: number;
  paraAEquipe: number;
  tokensDeEntrada: number;
  tokensDeSaida: number;
  tokensDeCacheEscritos: number;
  tokensDeCacheLidos: number;
  custoUsd: number;
  custoBrl: number | null;
  /** Algum modelo usado não tem preço configurado: o custo não o inclui. */
  custoIncompleto: boolean;
  modelosSemPreco: string[];
  familiasAtendidas: number;
  custoPorFamiliaUsd: number | null;
  custoPorFamiliaBrl: number | null;
}

export interface UsoDeIaEscola extends UsoDeIaTotal {
  tenantId: string;
  nome: string;
  /** Nulo: usa o padrão da plataforma. Zero: sem limite. */
  limiteProprio: number | null;
  /** O limite que vale de fato. Nulo: sem limite. */
  limiteEfetivo: number | null;
  limiteEhPadrao: boolean;
  aoEstourarOLimite: AoEstourarOLimite;
  percentualDoLimite: number | null;
  excedente: number;
  avisoDe80Enviado: boolean;
  avisoDe100Enviado: boolean;
}

export interface UsoDeIaDoMes {
  mes: string;
  cotacao: number | null;
  cotacaoAtualizadaEm: string | null;
  limitePadrao: number;
  total: UsoDeIaTotal;
  escolas: UsoDeIaEscola[];
}

export interface UsoDeIaPorFinalidade extends UsoDeIaTotal {
  finalidade: string;
  chamadas: number;
}

export interface UsoDeIaPorDia extends UsoDeIaTotal {
  /** AAAA-MM-DD, dia de Brasília. */
  dia: string;
}

export interface UsoDeIaDetalhe {
  escola: UsoDeIaEscola;
  porFinalidade: UsoDeIaPorFinalidade[];
  porDia: UsoDeIaPorDia[];
}

export interface ConferenciaDaFatura {
  configurada: boolean;
  mensagem: string | null;
  mes: string;
  custoDaAnthropicUsd: number | null;
  custoDoEducaPilotUsd: number | null;
  diferencaUsd: number | null;
  diferencaPercentual: number | null;
  diferencaBrl: number | null;
  observacao: string | null;
}

export interface SalvarLimiteDeIa {
  /** Nulo: usar o padrão. Zero: sem limite. */
  limiteMensalDeRespostas: number | null;
  aoEstourarOLimite: AoEstourarOLimite;
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getMasterToken();
  const res = await fetch(`${API}/api/admin/uso-de-ia${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    const mensagem =
      (corpo as { message?: string; Message?: string } | null)?.message ??
      (corpo as { Message?: string } | null)?.Message ??
      `Não foi possível concluir (${res.status}).`;
    throw new Error(mensagem);
  }
  return (await res.json()) as T;
}

export function useUsoDeIaDoMes(mes: string) {
  return useQuery({
    queryKey: ["master", "uso-de-ia", mes],
    queryFn: () => chamar<UsoDeIaDoMes>(`?mes=${encodeURIComponent(mes)}`),
  });
}

export function useUsoDeIaDaEscola(tenantId: string | null, mes: string) {
  return useQuery({
    queryKey: ["master", "uso-de-ia", "escola", tenantId, mes],
    enabled: tenantId !== null,
    queryFn: () => chamar<UsoDeIaDetalhe>(`/escolas/${tenantId}?mes=${encodeURIComponent(mes)}`),
  });
}

export function useConferenciaDaFatura(mes: string) {
  return useQuery({
    queryKey: ["master", "uso-de-ia", "conferencia", mes],
    queryFn: () => chamar<ConferenciaDaFatura>(`/conferencia?mes=${encodeURIComponent(mes)}`),
    // A Anthropic pede no máximo uma consulta por minuto: nada de refazer sozinho.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSalvarLimiteDeIa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, ...dados }: SalvarLimiteDeIa & { tenantId: string }) =>
      chamar<UsoDeIaEscola>(`/escolas/${tenantId}/limite`, { method: "PUT", body: JSON.stringify(dados) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "uso-de-ia"] }),
  });
}

export function useSalvarCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valor: number) => chamar<UsoDeIaDoMes>("/cotacao", { method: "PUT", body: JSON.stringify({ valor }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "uso-de-ia"] }),
  });
}
