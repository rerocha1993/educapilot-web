import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMasterToken } from "@/lib/auth/master-session";

/**
 * Migração dos arquivos (fotos, anexos do RH, recibos, comprovantes) do disco do servidor para o
 * Azure Blob — etapa B0. As rotas são só do Master e ficam fora do OpenAPI gerado, por isso o fetch cru.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface StatusDoStorage {
  provider: string;
  raizLocal: string | null;
  raizLocalExiste: boolean;
  container: string | null;
  blobConfigurado: boolean;
  avisoDoBlob?: string | null;
  arquivosNoDisco: number;
  bytesNoDisco: number;
}

export interface ErroDeArquivo {
  caminho: string;
  erro: string;
}

export interface ResultadoDaMigracao {
  total: number;
  copiados: number;
  ignorados: number;
  erros: ErroDeArquivo[];
  bytes: number;
  duracaoMs: number;
  erroGeral?: string | null;
}

export interface ProgressoDaMigracao {
  id: string;
  estado: string | number;
  iniciadoEmUtc: string;
  terminouEmUtc?: string | null;
  total: number;
  processados: number;
  copiados: number;
  ignorados: number;
  comErro: number;
  bytes: number;
  resultado?: ResultadoDaMigracao | null;
  erro?: string | null;
}

/** O job terminou quando tem data de término (o estado chega como texto ou número, conforme o serializador). */
export function migracaoEmAndamento(p: ProgressoDaMigracao | undefined): boolean {
  return p !== undefined && !p.terminouEmUtc;
}

export interface ResultadoDaConferencia {
  noDisco: number;
  noBlob: number;
  faltando: string[];
  diferentes: string[];
  erroGeral?: string | null;
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getMasterToken();
  const res = await fetch(`${API}/api/admin/storage${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    const mensagem = (corpo as { message?: string; Message?: string } | null)?.message
      ?? (corpo as { Message?: string } | null)?.Message
      ?? `Não foi possível concluir (${res.status}).`;
    throw new Error(mensagem);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function useStatusDoStorage() {
  return useQuery({
    queryKey: ["master", "storage", "status"],
    queryFn: () => chamar<StatusDoStorage>("/status"),
  });
}

export function useIniciarMigracao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sobrescrever: boolean) =>
      chamar<{ id: string; acompanhar: string }>(`/migrar-para-blob?sobrescrever=${sobrescrever}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "storage"] }),
  });
}

/** Acompanha uma migração em andamento: consulta a cada 2 s até terminar. */
export function useProgressoDaMigracao(id: string | null) {
  return useQuery({
    queryKey: ["master", "storage", "migracao", id],
    enabled: id !== null,
    queryFn: () => chamar<ProgressoDaMigracao>(`/migrar-para-blob/${id}`),
    refetchInterval: (consulta) => (migracaoEmAndamento(consulta.state.data) ? 2000 : false),
  });
}

export function useConferirMigracao() {
  return useMutation({
    mutationFn: () => chamar<ResultadoDaConferencia>("/conferir", { method: "POST" }),
  });
}
