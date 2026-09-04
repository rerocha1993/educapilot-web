import { useMutation, useQuery } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

// Novo (2026-08) — link público de preenchimento, pedido explícito do cliente:
// responsáveis externos (sem login) precisam abrir um link e preencher o formulário.
// flowApi funciona aqui sem alteração — o authMiddleware só ADICIONA o header
// Authorization quando existe um token salvo; pra um visitante deslogado (o caso
// normal aqui) ele simplesmente não manda header nenhum, que é exatamente o
// comportamento certo pra um endpoint anônimo.

export interface PublicFormFieldDto {
  id: string;
  tipo: string;
  label: string;
  ordem: number;
  config: string | null;
  opcoes: string | null;
  obrigatorio: boolean;
}

export interface PublicFormDto {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  campos: PublicFormFieldDto[];
}

export function usePublicForm(token: string | undefined) {
  return useQuery({
    queryKey: ["public-form", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const result = await flowApi.GET("/api/PublicForms/{token}", {
        params: { path: { token: token! } },
      });
      const data = unwrapApiResponse(result, "Formulário não encontrado.");
      return data as unknown as PublicFormDto;
    },
  });
}

export interface PublicSubmissionInput {
  nomeReferencia?: string | null;
  observacoes?: string | null;
  itens: { fieldId: string; valor: string | null }[];
}

export function useSubmitPublicForm(token: string) {
  return useMutation({
    mutationFn: async (dto: PublicSubmissionInput) => {
      const result = await flowApi.POST("/api/PublicForms/{token}/submit", {
        params: { path: { token } },
        body: {
          formId: "00000000-0000-0000-0000-000000000000", // ignorado pelo backend — resolvido a partir do token
          referenciaId: null,
          nomeReferencia: dto.nomeReferencia ?? null,
          observacoes: dto.observacoes ?? null,
          itens: dto.itens,
        },
      });
      if (!result.response.ok || result.error) {
        const body = result.error as { errors?: string[]; message?: string } | undefined;
        if (body?.errors?.length) throw new Error(body.errors.join(" "));
        if (body?.message) throw new Error(body.message);
        throw new Error("Não foi possível enviar a resposta.");
      }
      return result.data;
    },
  });
}

// FormUploadsController-equivalente público é [ApiExplorerSettings(IgnoreApi = true)]
// (multipart/form-data) — fetch cru, mesmo padrão do resto do projeto.
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export function useUploadPublicFormFile(token: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${baseUrl}/api/PublicForms/${token}/uploads`, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { message: text };
      }
      const obj = parsed as { url?: string; message?: string };
      if (!res.ok || !obj.url) {
        throw new Error(obj.message ?? "Não foi possível enviar o arquivo.");
      }
      return obj.url;
    },
  });
}
