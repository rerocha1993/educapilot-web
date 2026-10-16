import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mensagemDeErro, rhFetch, rhJson } from "./api";
import type { Avaliacao, AvaliacaoResumo, Ciclo, NotaDeDesempenho, Resposta } from "./use-desempenho";

/**
 * "Meu desempenho" — o autoatendimento do funcionário, /api/Rh/meu-desempenho. Sem área: vale para qualquer login com
 * ficha de funcionário ligada (professor inclusive), como o meu-ponto. O servidor só devolve o que é DELE: a nota e os
 * componentes, as avaliações do gestor que a gestão compartilhou e as autoavaliações. Nunca dado de outra pessoa.
 */

const CHAVE = ["rh-meu-desempenho"] as const;

export interface MeuDesempenho {
  funcionarioId: string;
  nome: string;
  cicloAberto: Ciclo | null;
  minhaAutoavaliacao: AvaliacaoResumo | null;
  nota: NotaDeDesempenho | null;
  avaliacoes: AvaliacaoResumo[];
  apoioADecisao: string;
}

type Resultado = { status: "ok"; dados: MeuDesempenho } | { status: "sem-ficha"; mensagem: string };

async function buscar(): Promise<Resultado> {
  const res = await rhFetch("/meu-desempenho");
  if (res.status === 404) {
    return { status: "sem-ficha", mensagem: await mensagemDeErro(res, "Seu usuário ainda não está ligado a uma ficha de funcionário.") };
  }
  if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível carregar o seu desempenho."));
  return { status: "ok", dados: (await res.json()) as MeuDesempenho };
}

export function useMeuDesempenho() {
  return useQuery({ queryKey: CHAVE, queryFn: buscar });
}

/** O atalho do menu só existe para quem tem ficha de funcionário (e não é responsável). */
export function useMeuDesempenhoDisponivel(habilitado = true): boolean {
  const { data } = useQuery({
    queryKey: CHAVE,
    queryFn: buscar,
    enabled: habilitado,
    retry: false,
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    select: (r) => r.status === "ok",
  });
  return data === true;
}

export function useMinhaAvaliacao(id: string) {
  return useQuery({
    queryKey: [...CHAVE, "avaliacao", id],
    enabled: !!id,
    queryFn: () => rhJson<Avaliacao>(`/meu-desempenho/avaliacoes/${id}`, {}, "Não foi possível carregar a avaliação."),
  });
}

export function useIniciarAutoavaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rhJson<Avaliacao>("/meu-desempenho/autoavaliacao", { method: "POST" }, "Não foi possível abrir a autoavaliação."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Salvamento do rascunho: não invalida nada, para a tela não piscar a cada autosave. */
export function useSalvarAutoavaliacao() {
  return useMutation({
    mutationFn: ({ id, respostas }: { id: string; respostas: Resposta[] }) =>
      rhJson<Avaliacao>(
        `/meu-desempenho/autoavaliacao/${id}`,
        { method: "PUT", body: JSON.stringify({ respostas }) },
        "Não foi possível salvar o rascunho."
      ),
  });
}

export function useConcluirAutoavaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<Avaliacao>(`/meu-desempenho/autoavaliacao/${id}/concluir`, { method: "POST" }, "Não foi possível concluir a autoavaliação."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Direito à revisão (LGPD, art. 20): registra a contestação ou observação do funcionário numa avaliação dele. */
export function useContestar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) =>
      rhJson<Avaliacao>(
        `/meu-desempenho/avaliacoes/${id}/contestacao`,
        { method: "POST", body: JSON.stringify({ texto }) },
        "Não foi possível registrar a contestação."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}
