import { useQuery } from "@tanstack/react-query";

import { mensagemDeErro, rhFetch } from "./api";
import { lerComoDataUrl } from "./ponto-do-aparelho";

/**
 * Foto de uma batida de ponto. O endpoint exige o Bearer, então <img src> não serve: busca com
 * fetch e guarda como "data:" no cache da consulta. Data URL em vez de URL.createObjectURL porque
 * não há o que revogar depois — a foto some do cache sozinha, junto com a consulta.
 *
 * `caminho` é relativo a /api/Rh, por exemplo "/meu-ponto/marcacoes/{id}/foto" ou
 * "/ponto/marcacoes/{id}/foto?miniatura=true". Nulo desliga a consulta.
 */
export function useFotoDoPonto(caminho: string | null) {
  return useQuery({
    queryKey: ["rh", "foto-do-ponto", caminho],
    enabled: !!caminho,
    retry: false,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const res = await rhFetch(caminho as string);
      if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível carregar a foto."));
      return lerComoDataUrl(await res.blob());
    },
  });
}

export const caminhoDaFotoDoFuncionario = (marcacaoId: string) => `/meu-ponto/marcacoes/${marcacaoId}/foto`;

export const caminhoDaFotoDaGestao = (marcacaoId: string, miniatura = false) =>
  `/ponto/marcacoes/${marcacaoId}/foto${miniatura ? "?miniatura=true" : ""}`;
