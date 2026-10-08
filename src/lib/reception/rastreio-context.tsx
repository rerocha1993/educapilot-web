"use client";

import { createContext, useContext } from "react";

import type { useRastreioTrajeto } from "./use-rastreio-trajeto";

/**
 * O rastreio do "Estou a caminho" vive no layout do site do responsável, e não na tela da
 * Portaria: com as abas do rodapé, trocar de aba desmontaria a tela e desligaria o GPS no meio do
 * caminho. Aqui as telas só leem.
 */
export type Rastreio = ReturnType<typeof useRastreioTrajeto>;

export const RastreioContext = createContext<Rastreio | null>(null);

export function useRastreio(): Rastreio {
  const rastreio = useContext(RastreioContext);
  if (!rastreio) throw new Error("useRastreio precisa estar dentro do layout do responsável.");
  return rastreio;
}
