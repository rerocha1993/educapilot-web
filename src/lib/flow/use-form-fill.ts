import { useMutation } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import type { FormResponseDto } from "./use-form-responses";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface FormSubmissionItemInput {
  fieldId: string;
  valor: string | null;
}

export interface FormSubmissionInput {
  referenciaId?: string | null;
  nomeReferencia?: string | null;
  observacoes?: string | null;
  itens: FormSubmissionItemInput[];
}

// Novo (2026-08): tela de preenchimento — POST /api/FormResponses/{formId}/submit
// (ver FormResponseService.SubmitAsync). Sem [ProducesResponseType] no backend, então
// o tipo gerado tem `content?: never` pro 200 — não dá pra usar unwrapApiResponse
// puro porque o 400 de validação vem como { errors: string[] }, não { message }, e
// queremos mostrar TODOS os erros pro usuário, não só um genérico.
export function useSubmitForm(formId: string) {
  return useMutation({
    mutationFn: async (dto: FormSubmissionInput) => {
      const result = await flowApi.POST("/api/FormResponses/{formId}/submit", {
        params: { path: { formId } },
        body: {
          formId,
          referenciaId: dto.referenciaId ?? null,
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
      return result.data as unknown as FormResponseDto;
    },
  });
}

// FormUploadsController é [ApiExplorerSettings(IgnoreApi = true)] (multipart/form-data,
// mesmo padrão de ImportStudents/ImportClasses) — fetch cru, sem tipo gerado.
export function useUploadFormFile(formId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/forms/${formId}/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
