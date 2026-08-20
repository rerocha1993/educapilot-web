import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// GET /api/Student/by-class/{classId} não documenta a resposta no Swagger (mesmo
// padrão dos outros endpoints desta sessão) — array de Student, tipado a partir do
// components.schemas.Student real.
export interface StudentDto {
  id: number;
  fullName: string;
  birthDate: string;
  classId: number;
  createdAt: string;
  tenantId: string;
  // Saúde do aluno (R5) — adicionado 2026-08, não existia antes.
  allergies: string | null;
  continuousMedication: string | null;
  dietaryRestriction: string | null;
  healthInsurance: string | null;
}

// Novo (2026-08) — picker de aluno pro módulo Financeiro (Responsáveis/Mensalidades),
// que não navega por turma como o resto do Kernel. GET /api/Student pagina (page/
// pageSize) e devolve { items: [...] } — pageSize alto o bastante pra trazer a
// escola inteira numa página só (visto ~100 alunos no tenant de teste).
export function useAllStudents() {
  return useQuery({
    queryKey: ["students", "all"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/Student", { params: { query: { page: 1, pageSize: 1000 } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar os alunos.");
      const wrapped = data as unknown as { items?: StudentDto[] } | StudentDto[];
      return Array.isArray(wrapped) ? wrapped : (wrapped?.items ?? []);
    },
  });
}

export function useStudentsByClass(classId: number | null) {
  return useQuery({
    queryKey: ["students", "by-class", classId],
    queryFn: async () => {
      const result = await coreApi.GET("/api/Student/by-class/{classId}", {
        params: { path: { classId: classId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os alunos.");
      return (data ?? []) as unknown as StudentDto[];
    },
    enabled: classId !== null,
  });
}

export interface SaveStudentInput {
  id?: number;
  fullName: string;
  birthDate: string;
  classId: number;
  allergies?: string | null;
  continuousMedication?: string | null;
  dietaryRestriction?: string | null;
  healthInsurance?: string | null;
}

export function useSaveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveStudentInput) => {
      if (input.id) {
        const result = await coreApi.PUT("/api/Student/{id}", {
          params: { path: { id: input.id } },
          body: input,
        });
        unwrapApiResponse(result, "Não foi possível salvar o aluno.");
      } else {
        const result = await coreApi.POST("/api/Student", { body: input });
        unwrapApiResponse(result, "Não foi possível cadastrar o aluno.");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", "by-class", variables.classId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] }); // contagem de alunos por turma
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number; classId: number }) => {
      const result = await coreApi.DELETE("/api/Student/{id}", {
        params: { path: { id } },
      });
      unwrapApiResponse(result, "Não foi possível excluir o aluno.");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", "by-class", variables.classId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
