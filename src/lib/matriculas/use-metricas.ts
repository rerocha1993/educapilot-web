import { useQuery } from "@tanstack/react-query";
import { matriculasJson } from "./api";
import type { MetricasDoFunil, OrigemDoLead } from "./tipos";

export interface FiltroDasMetricas {
  /** "AAAA-MM-DD". Sem `de`, vale todo o histórico. */
  de: string | null;
  ate: string | null;
  origem: OrigemDoLead | null;
}

/** O Painel e as Métricas leem a mesma resposta; mudar de uma para a outra não busca de novo. */
export function useMetricas(filtro: FiltroDasMetricas) {
  return useQuery({
    queryKey: ["matriculas", "metricas", filtro.de, filtro.ate, filtro.origem],
    queryFn: () => {
      const q = new URLSearchParams();
      if (filtro.de) q.set("de", filtro.de);
      if (filtro.de && filtro.ate) q.set("ate", filtro.ate);
      if (filtro.origem) q.set("origem", filtro.origem);
      const texto = q.toString();
      return matriculasJson<MetricasDoFunil>(`/metricas${texto ? `?${texto}` : ""}`, {}, "Não foi possível carregar as métricas.");
    },
    // Relida a cada minuto: a fila e as listas são "agora", e a reunião costuma ficar com a tela aberta.
    refetchInterval: 60_000,
    placeholderData: (anterior) => anterior,
  });
}
