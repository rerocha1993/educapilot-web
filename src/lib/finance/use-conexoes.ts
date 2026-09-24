import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";
import type { ResultadoDaImportacao } from "@/lib/finance/use-conciliacao";

/**
 * Contas ligadas a uma origem que entrega o extrato sozinha — fase 4 do financeiro.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface ProvedorDisponivel {
  codigo: string;
  nome: string;
  explicacao: string;
  disponivel: boolean;
  motivoDaIndisponibilidade?: string | null;
}

export interface ConexaoBancaria {
  id: string;
  contaId: string;
  contaNome: string;
  provedor: string;
  provedorNome: string;
  ativa: boolean;
  sincronizarAutomaticamente: boolean;
  ultimaSincronizacao?: string | null;
  ultimasLinhas: number;
  ultimoErro?: string | null;
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/finance/conexoes${caminho}`, {
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

export function useConexoes() {
  return useQuery({
    queryKey: ["finance", "conexoes"],
    queryFn: () => chamar<ConexaoBancaria[]>(""),
  });
}

export function useProvedoresDeExtrato() {
  return useQuery({
    queryKey: ["finance", "provedores-extrato"],
    queryFn: () => chamar<ProvedorDisponivel[]>("/provedores"),
  });
}

export function useConectarConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: { contaId: string; provedor: string; identificadorExterno?: string | null }) =>
      chamar<ConexaoBancaria>("", { method: "POST", body: JSON.stringify(dados) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useDesconectarConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<void>(`/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useAlternarSincronizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, automatico }: { id: string; automatico: boolean }) =>
      chamar<void>(`/${id}/automatico`, { method: "PUT", body: JSON.stringify({ automatico }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useSincronizarAgora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chamar<ResultadoDaImportacao>(`/${id}/sincronizar`, { method: "POST" }),
    onSuccess: () => {
      // A sincronização pode ter dado baixa em lançamentos, igual à importação de arquivo.
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
