import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface FormFieldDto {
  id: string;
  formId: string;
  tipo: string;
  label: string;
  ordem: number;
  config: string | null;
  opcoes: string | null;
  obrigatorio: boolean;
  ativo: boolean;
}

export interface FormDto {
  id: string;
  tenantId: string;
  nome: string;
  descricao: string | null;
  status: string; // livre no backend — usamos "Rascunho"/"Ativo"/"Arquivado" por convenção
  criadoPor: string | null;
  campos: FormFieldDto[] | null;
  // Novo (2026-08) — link público de preenchimento (gerado automaticamente pelo
  // backend, inclusive pra formulários criados antes desse recurso existir).
  publicToken: string | null;
}

export function useForms() {
  return useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const result = await flowApi.GET("/api/Forms");
      const data = unwrapApiResponse(result, "Não foi possível carregar os formulários.");
      return (data ?? []) as unknown as FormDto[];
    },
  });
}

export function useForm(id: string | undefined) {
  return useQuery({
    queryKey: ["forms", id],
    enabled: !!id,
    queryFn: async () => {
      const result = await flowApi.GET("/api/Forms/{id}", { params: { path: { id: id! } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar o formulário.");
      return data as unknown as FormDto;
    },
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string }) => {
      const result = await flowApi.POST("/api/Forms", {
        body: { nome: input.nome, descricao: input.descricao ?? null, status: "Rascunho" },
      });
      const data = unwrapApiResponse(result, "Não foi possível criar o formulário.");
      return data as unknown as FormDto;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms"] }),
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormDto) => {
      const result = await flowApi.PUT("/api/Forms/{id}", {
        params: { path: { id: form.id } },
        body: {
          id: form.id,
          nome: form.nome,
          descricao: form.descricao,
          status: form.status,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o formulário.");
    },
    onSuccess: (_data, form) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["forms", form.id] });
    },
  });
}
