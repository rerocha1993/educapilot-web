import { useMutation, useQuery } from "@tanstack/react-query";
import { mensagemDeErro } from "./api";
import { responsavelJson } from "./api-responsavel";
import type { EscolaNoMapa, Finalidade, SituacaoTrajeto } from "./use-mapa";

// Site do responsável: painel dos filhos e o "Estou a caminho" que alimenta o mapa da Portaria.

export interface AlunoDoResponsavel {
  studentId: number;
  nome: string;
  turmaNome?: string | null;
  /** "HH:mm". */
  entradaPrevista?: string | null;
  saidaPrevista?: string | null;
  /** UTC, de hoje. */
  chegadaEm?: string | null;
  saidaEm?: string | null;
}

export interface TrajetoDoResponsavel {
  id: string;
  finalidade: Finalidade;
  situacao: SituacaoTrajeto;
  latitude?: number | null;
  longitude?: number | null;
  precisaoMetros?: number | null;
  distanciaMetros?: number | null;
  iniciadoEm: string;
  atualizadoEm: string;
  chegouEm?: string | null;
  /** Nomes dos filhos cuja chegada foi registrada nesta chamada. */
  chegadasRegistradas?: string[];
}

export interface PainelDoResponsavel {
  nome: string;
  escola: EscolaNoMapa;
  alunos: AlunoDoResponsavel[];
  trajetoAtivo?: TrajetoDoResponsavel | null;
}

export const CHAVE_PAINEL = ["responsavel", "painel"];

export function usePainelDoResponsavel(enabled: boolean) {
  return useQuery({
    queryKey: CHAVE_PAINEL,
    enabled,
    // A chegada e a saída dos filhos mudam do lado da escola; um minuto basta para a tela não mentir.
    refetchInterval: 60_000,
    queryFn: () => responsavelJson<PainelDoResponsavel>("/painel", {}, "Não foi possível carregar seus dados."),
  });
}

export function iniciarTrajeto(dispositivoId: string) {
  return responsavelJson<TrajetoDoResponsavel>(
    "/trajetos",
    { method: "POST", body: JSON.stringify({ dispositivoId }) },
    "Não foi possível avisar a escola."
  );
}

export function enviarPosicao(id: string, posicao: { latitude: number; longitude: number; precisaoMetros: number }) {
  return responsavelJson<TrajetoDoResponsavel>(
    `/trajetos/${id}/posicao`,
    { method: "POST", body: JSON.stringify(posicao) },
    "Não foi possível enviar sua localização."
  );
}

export function encerrarTrajeto(id: string) {
  return responsavelJson<void>(`/trajetos/${id}/encerrar`, { method: "POST" }, "Não foi possível encerrar.");
}

export function useDefinirSenhaResponsavel() {
  return useMutation({
    mutationFn: async (dados: { token: string; senha: string; confirmacaoSenha: string }) => {
      // Sem sessão: quem chega aqui ainda não tem senha. fetch direto para não mandar token velho.
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";
      const res = await fetch(`${base}/api/Responsavel/definir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível criar a senha."));
      return (await res.json()) as { email: string };
    },
  });
}
