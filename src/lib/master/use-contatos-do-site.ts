import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMasterToken } from "@/lib/auth/master-session";

/**
 * Contatos do site (painel Master): as pessoas que se cadastraram para receber o guia gratuito em
 * educa-pilot.com/ebook. As rotas são só do Master e ficam fora do OpenAPI gerado, por isso o fetch cru
 * (mesmo padrão de use-uso-de-ia e use-storage).
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type SituacaoDoContato = "novo" | "contatado" | "demonstracao" | "cliente" | "descartado";

export const SITUACOES: { valor: SituacaoDoContato; rotulo: string }[] = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "contatado", rotulo: "Contatado" },
  { valor: "demonstracao", rotulo: "Demonstração marcada" },
  { valor: "cliente", rotulo: "Cliente" },
  { valor: "descartado", rotulo: "Descartado" },
];

export interface ContatoDoSite {
  id: string;
  criadoEm: string;
  nome: string;
  email: string;
  whatsApp: string | null;
  escola: string | null;
  cargo: string | null;
  faixaDeAlunos: string | null;
  origem: string | null;
  situacao: SituacaoDoContato;
  observacao: string | null;
  /** Pontuação do diagnóstico, de 0 a 20. Nulo: ainda não fez. */
  notaDiagnostico: number | null;
  areasFracas: string[];
  licoesConcluidas: number;
  totalLicoes: number;
  ultimoAcessoEm: string | null;
  /** Nulo: a equipe ainda não abriu este contato. */
  vistoEm: string | null;
  consentimentoEm: string | null;
  versaoPolitica: string | null;
}

export interface ListaDeContatos {
  total: number;
  itens: ContatoDoSite[];
}

export interface FiltroDeContatos {
  busca: string;
  situacao: SituacaoDoContato | "";
  pagina: number;
  tamanho: number;
}

export interface SalvarContato {
  situacao: SituacaoDoContato;
  observacao: string;
}

async function erroDaResposta(res: Response): Promise<Error> {
  const corpo = await res.json().catch(() => null);
  const mensagem =
    (corpo as { erro?: string } | null)?.erro ??
    (corpo as { message?: string; Message?: string } | null)?.message ??
    (corpo as { Message?: string } | null)?.Message ??
    `Não foi possível concluir (${res.status}).`;
  return new Error(mensagem);
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getMasterToken();
  const res = await fetch(`${API}/api/admin/contatos-do-site${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw await erroDaResposta(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Quantos contatos a equipe ainda não abriu (o selo no menu). Reconsulta a cada minuto. */
export function useContatosNovos(habilitado = true) {
  return useQuery({
    queryKey: ["master", "contatos-do-site", "novos"],
    enabled: habilitado,
    queryFn: () => chamar<{ quantidade: number }>("/novos"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useContatosDoSite(filtro: FiltroDeContatos) {
  return useQuery({
    queryKey: ["master", "contatos-do-site", "lista", filtro],
    queryFn: () => {
      const q = new URLSearchParams({
        busca: filtro.busca,
        situacao: filtro.situacao,
        pagina: String(filtro.pagina),
        tamanho: String(filtro.tamanho),
      });
      return chamar<ListaDeContatos>(`?${q.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

function useInvalidarContatos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["master", "contatos-do-site"] });
}

export function useMarcarContatoComoVisto() {
  const invalidar = useInvalidarContatos();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/${encodeURIComponent(id)}/visto`, { method: "POST" }),
    onSuccess: invalidar,
  });
}

export function useSalvarContato() {
  const invalidar = useInvalidarContatos();
  return useMutation({
    mutationFn: ({ id, ...corpo }: SalvarContato & { id: string }) =>
      chamar<void>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(corpo) }),
    onSuccess: invalidar,
  });
}

export function useExcluirContato() {
  const invalidar = useInvalidarContatos();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidar,
  });
}

/** Baixa a planilha com todos os contatos: o endpoint exige o cabeçalho Authorization, então não dá para ser um link. */
export async function baixarPlanilhaDeContatos(): Promise<void> {
  const token = getMasterToken();
  const res = await fetch(`${API}/api/admin/contatos-do-site/exportar`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw await erroDaResposta(res);

  // O nome vem do servidor quando ele manda (Content-Disposition); senão, um padrão com a data de hoje.
  const disposicao = res.headers.get("Content-Disposition") ?? "";
  const nomeDoServidor = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicao)?.[1];
  const nome = nomeDoServidor ? decodeURIComponent(nomeDoServidor) : `contatos-do-site-${new Date().toISOString().slice(0, 10)}.csv`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
