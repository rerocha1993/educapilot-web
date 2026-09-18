import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/**
 * Resumo de qualquer formulário — GET /api/Flow/formularios/resumo.
 *
 * Nada aqui é de rematrícula: o backend olha os campos de cada formulário e só devolve dinheiro
 * quando existe campo de dinheiro, e turma quando existe campo de turma. Uma autorização de
 * passeio volta com envios e nada mais.
 *
 * Tipado à mão como os demais hooks; depois do deploy dá para regenerar os tipos do Swagger.
 */

export type PapelDoCampo = "valor" | "turma" | "opcao";

export interface CampoDoResumo {
  fieldId: string;
  rotulo: string;
  tipo: string;
  papel: PapelDoCampo;
}

export interface TurmaDoResumo {
  turma: string;
  quantidade: number;
}

export interface ResumoDeFormulario {
  formId: string;
  nome: string;
  tipo: string | null;
  totalEnvios: number;
  concluidos: number;
  aguardando: number;
  ultimoEnvioEm: string | null;
  temValor: boolean;
  somaValor: number | null;
  rotuloValor: string | null;
  temTurma: boolean;
  rotuloTurma: string | null;
  porTurma: TurmaDoResumo[];
  campos: CampoDoResumo[];
}

export interface ResumoCombinado {
  totalEnvios: number;
  concluidos: number;
  aguardando: number;
  temValor: boolean;
  somaValor: number | null;
  temTurma: boolean;
  porTurma: TurmaDoResumo[];
}

export interface ResumoDeFormularios {
  formularios: ResumoDeFormulario[];
  combinado: ResumoCombinado;
}

async function chamar<T>(caminho: string, init: RequestInit, falha: string): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}${caminho}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login?expirada=1");
    }
  }

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error((corpo as { message?: string } | null)?.message ?? falha);
  }

  return (await res.json()) as T;
}

/** Sem ids, o backend devolve os formulários com envios, do mais movimentado para o menos. */
export function useResumoDeFormularios(formIds?: string[]) {
  const ids = formIds ?? [];
  const query = ids.map((id) => `formIds=${encodeURIComponent(id)}`).join("&");

  return useQuery({
    queryKey: ["flow", "resumo-formularios", ids],
    staleTime: 60_000,
    queryFn: () =>
      chamar<ResumoDeFormularios>(
        `/api/Flow/formularios/resumo${query ? `?${query}` : ""}`,
        {},
        "Não foi possível carregar o resumo dos formulários."
      ),
  });
}

/** Formulários que esta pessoa escolheu ver no painel, na ordem dela. Vazio = nada escolhido. */
export function usePainelDeFormularios() {
  return useQuery({
    queryKey: ["flow", "painel-formularios"],
    staleTime: 5 * 60_000,
    queryFn: () =>
      chamar<string[]>(
        "/api/Flow/painel/formularios",
        {},
        "Não foi possível carregar os formulários do painel."
      ),
  });
}

export function useSalvarPainelDeFormularios() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formIds: string[]) =>
      chamar<string[]>(
        "/api/Flow/painel/formularios",
        { method: "PUT", body: JSON.stringify({ formIds }) },
        "Não foi possível salvar a escolha."
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow", "painel-formularios"] });
      queryClient.invalidateQueries({ queryKey: ["painel", "inicio"] });
    },
  });
}
