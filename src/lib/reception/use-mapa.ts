import { useQuery } from "@tanstack/react-query";
import { portariaJson } from "./api";

export type Finalidade = "Entrega" | "Retirada";
export type SituacaoTrajeto = "ACaminho" | "Chegando" | "Chegou";

export interface EscolaNoMapa {
  nome: string;
  /** Sem coordenada enquanto o endereço da escola não foi preenchido (ou não foi achado). */
  latitude?: number | null;
  longitude?: number | null;
  raioChegandoMetros: number;
  raioChegouMetros: number;
}

export interface TrajetoNoMapa {
  id: string;
  responsavelNome: string;
  alunos: string[];
  finalidade: Finalidade;
  situacao: SituacaoTrajeto;
  latitude?: number | null;
  longitude?: number | null;
  precisaoMetros?: number | null;
  distanciaMetros?: number | null;
  /** UTC. */
  iniciadoEm: string;
  atualizadoEm: string;
  chegouEm?: string | null;
}

export interface MapaPortaria {
  escola: EscolaNoMapa;
  trajetos: TrajetoNoMapa[];
}

export function useMapaPortaria() {
  return useQuery({
    queryKey: ["portaria", "mapa"],
    // Quem está a caminho anda: 10 s é o mesmo passo com que o celular do responsável manda a posição.
    refetchInterval: 10_000,
    queryFn: () => portariaJson<MapaPortaria>("/mapa", {}, "Não foi possível carregar o mapa."),
  });
}
