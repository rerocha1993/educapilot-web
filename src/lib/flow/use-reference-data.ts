import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface ReferenceOptionDto {
  id: string;
  label: string;
}

// As únicas 3 tabelas com implementação real hoje no backend (ver
// ReferenceDataRepository) — a lista "oficial" via GET meta/tabelas devolve
// exatamente essas mesmas 3, então buscamos direto aqui pra evitar 2 round-trips.
export const REFERENCE_TABLES = [
  { value: "alunos", label: "Alunos" },
  { value: "turmas", label: "Turmas" },
  { value: "usuarios", label: "Usuários" },
] as const;

export function useReferenceOptions(tabela: string | undefined) {
  return useQuery({
    queryKey: ["reference-data", tabela],
    enabled: !!tabela,
    queryFn: async () => {
      const result = await flowApi.GET("/api/ReferenceData/{tabela}", {
        params: { path: { tabela: tabela! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os dados de referência.");
      return (data ?? []) as unknown as ReferenceOptionDto[];
    },
  });
}
