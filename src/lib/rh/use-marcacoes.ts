import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rhJson } from "./api";
import { horaDe, type SituacaoDaBatida, type TipoDeBatida } from "./use-meu-ponto";

/**
 * Ponto pelo celular, lado da gestão — /api/Rh/ponto/marcacoes e /aparelhos (área `rh:ponto`).
 * Tipado à mão, como o resto do RH (ver use-rh.ts).
 *
 * Aprovar, recusar e ajustar também mudam o espelho do mês: as mutações invalidam todo o grupo
 * "rh" para a outra aba não ficar com número velho.
 */

const CHAVE = "rh";

// ------------------------------------------------------------------ tipos

export interface Marcacao {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipo: TipoDeBatida;
  /** yyyy-MM-dd */
  data: string;
  /** HH:mm */
  horaLocal: string;
  /** "Celular", "Ajuste", "Manual", "Importado"... o servidor decide. */
  origem: string;
  situacao: SituacaoDaBatida;
  motivos: string[];
  justificativa: string | null;
  distanciaDaEscolaMetros: number | null;
  dentroDaCerca: boolean | null;
  precisaoMetros: number | null;
  latitude: number | null;
  longitude: number | null;
  temFoto: boolean;
  aparelhoNome: string | null;
  nsr: string | null;
  observacaoDoGestor: string | null;
}

export interface FiltroDeMarcacoes {
  data?: string;
  de?: string;
  ate?: string;
  funcionarioId?: string | null;
  situacao?: SituacaoDaBatida | null;
  origem?: string | null;
}

export interface AparelhoDaGestao {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  nome: string;
  aprovado: boolean;
  ativo: boolean;
  /** Instante UTC. */
  primeiroUsoEm: string | null;
  ultimoUsoEm: string | null;
}

export interface PendenciasDoPonto {
  marcacoes: number;
  aparelhos: number;
}

export interface AjusteDeMarcacao {
  funcionarioId: string;
  tipo: TipoDeBatida;
  data: string;
  horaLocal: string;
  justificativa: string;
  marcacaoOriginalId?: string | null;
}

// ------------------------------------------------------------------ normalização

function busca(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [nome, valor] of Object.entries(params)) {
    if (valor) q.set(nome, valor);
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

const vazioParaNulo = (v: string | null | undefined) => (v && v.trim() ? v : null);

function marcacao(b: Partial<Marcacao> & { nsr?: unknown }): Marcacao {
  return {
    id: b.id ?? "",
    funcionarioId: b.funcionarioId ?? "",
    funcionarioNome: b.funcionarioNome ?? "",
    tipo: (b.tipo ?? "Entrada") as TipoDeBatida,
    data: (b.data ?? "").slice(0, 10),
    horaLocal: horaDe(b.horaLocal),
    origem: b.origem ?? "",
    situacao: (b.situacao ?? "Normal") as SituacaoDaBatida,
    motivos: b.motivos ?? [],
    justificativa: vazioParaNulo(b.justificativa),
    distanciaDaEscolaMetros: b.distanciaDaEscolaMetros ?? null,
    dentroDaCerca: b.dentroDaCerca ?? null,
    precisaoMetros: b.precisaoMetros ?? null,
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    temFoto: b.temFoto ?? false,
    aparelhoNome: vazioParaNulo(b.aparelhoNome),
    nsr: b.nsr === null || b.nsr === undefined || b.nsr === "" ? null : String(b.nsr),
    observacaoDoGestor: vazioParaNulo(b.observacaoDoGestor),
  };
}

// ------------------------------------------------------------------ marcações

export function useMarcacoes(filtro: FiltroDeMarcacoes, habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "marcacoes", filtro],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<(Partial<Marcacao> & { nsr?: unknown })[] | null>(
        `/ponto/marcacoes${busca({
          data: filtro.data,
          de: filtro.de,
          ate: filtro.ate,
          funcionarioId: filtro.funcionarioId,
          situacao: filtro.situacao,
          origem: filtro.origem,
        })}`,
        {},
        "Não foi possível carregar as batidas."
      );
      return (lista ?? [])
        .map(marcacao)
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) ||
            a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR") ||
            a.horaLocal.localeCompare(b.horaLocal)
        );
    },
  });
}

export function useAprovarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) =>
      rhJson<void>(
        `/ponto/marcacoes/${id}/aprovar`,
        { method: "POST", body: JSON.stringify({ observacao: observacao?.trim() || null }) },
        "Não foi possível aprovar a batida."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useRecusarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      rhJson<void>(
        `/ponto/marcacoes/${id}/recusar`,
        { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) },
        "Não foi possível recusar a batida."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useAjustarMarcacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: AjusteDeMarcacao) =>
      rhJson<void>(
        "/ponto/marcacoes/ajuste",
        {
          method: "POST",
          body: JSON.stringify({
            ...dados,
            justificativa: dados.justificativa.trim(),
            marcacaoOriginalId: dados.marcacaoOriginalId ?? null,
          }),
        },
        "Não foi possível lançar o ajuste."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ aparelhos

export function useAparelhosDoPonto(
  filtro: { pendentes?: boolean; funcionarioId?: string | null } = {},
  habilitado = true
) {
  return useQuery({
    queryKey: [CHAVE, "aparelhos-do-ponto", filtro],
    enabled: habilitado,
    staleTime: 15_000,
    queryFn: async () => {
      const lista = await rhJson<Partial<AparelhoDaGestao>[] | null>(
        `/ponto/aparelhos${busca({
          pendentes: filtro.pendentes ? "true" : null,
          funcionarioId: filtro.funcionarioId,
        })}`,
        {},
        "Não foi possível carregar os celulares."
      );
      return (lista ?? [])
        .map(
          (b): AparelhoDaGestao => ({
            id: b.id ?? "",
            funcionarioId: b.funcionarioId ?? "",
            funcionarioNome: b.funcionarioNome ?? "",
            nome: b.nome ?? "Celular",
            aprovado: b.aprovado ?? false,
            ativo: b.ativo ?? true,
            primeiroUsoEm: b.primeiroUsoEm ?? null,
            ultimoUsoEm: b.ultimoUsoEm ?? null,
          })
        )
        .sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome, "pt-BR"));
    },
  });
}

export function useAprovarAparelho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      rhJson<void>(`/ponto/aparelhos/${id}/aprovar`, { method: "POST" }, "Não foi possível aprovar o celular."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

export function useDesativarAparelho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      rhJson<void>(
        `/ponto/aparelhos/${id}/desativar`,
        { method: "POST", body: JSON.stringify({ motivo: motivo?.trim() || null }) },
        "Não foi possível desativar o celular."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  });
}

// ------------------------------------------------------------------ resumo de pendências

/**
 * Quantas batidas e celulares esperam a gestão. Alimenta o selo da aba Pendências e o "Precisa de
 * você" do Início. Falha ou sem a área: a consulta erra e a tela mostra como zero — um selo que
 * erra não deve derrubar a página.
 */
export function usePendenciasDoPonto(habilitado = true) {
  return useQuery({
    queryKey: [CHAVE, "pendencias-do-ponto"],
    enabled: habilitado,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const b = await rhJson<Partial<PendenciasDoPonto> | null>(
        "/ponto/pendencias/resumo",
        {},
        "Não foi possível carregar as pendências do ponto."
      );
      return { marcacoes: b?.marcacoes ?? 0, aparelhos: b?.aparelhos ?? 0 } satisfies PendenciasDoPonto;
    },
  });
}
