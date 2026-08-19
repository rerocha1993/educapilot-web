import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// GET /api/Materials não documenta a resposta no Swagger (mesmo padrão de sempre)
// — tipado à mão a partir de EducaPilot.Domain/.../Entities/Material.cs. Backend
// só tem esse único endpoint de leitura, sem POST/PUT/DELETE — catálogo somente
// leitura mesmo, não é lacuna de implementação.
export interface MaterialDto {
  id: string;
  name: string;
  type: string;
  availableQuantity: number;
}

export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const result = await tasksApi.GET("/api/Materials");
      const data = unwrapApiResponse(result, "Não foi possível carregar os materiais.");
      return (data ?? []) as unknown as MaterialDto[];
    },
  });
}
