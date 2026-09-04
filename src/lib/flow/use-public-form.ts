import { useMutation, useQuery } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";

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

// Correção (2026-08): achado ao vivo testando o link com um usuário real — a tela
// mostrava a MESMA mensagem ("link não é válido") tanto pra um token genuinamente
// inexistente quanto pra qualquer falha temporária (backend fora do ar, rede
// instável, rate limit). Pra um responsável de verdade tentando matricular o filho,
// "link inválido" é muito mais alarmante (e mais errado) do que "tente de novo em
// instantes". `kind` deixa a página distinguir os dois casos.
export class PublicFormLoadError extends Error {
  kind: "not-found" | "unavailable";
  constructor(kind: "not-found" | "unavailable", message: string) {
    super(message);
    this.kind = kind;
  }
}

export function usePublicForm(token: string | undefined) {
  return useQuery({
    queryKey: ["public-form", token],
    enabled: !!token,
    retry: 1,
    queryFn: async () => {
      let result;
      try {
        result = await flowApi.GET("/api/PublicForms/{token}", {
          params: { path: { token: token! } },
        });
      } catch {
        // fetch() lança (não retorna response nenhuma) quando a rede falha ou o
        // servidor está simplesmente fora do ar — sem isso, esse caso caía direto
        // no error boundary do React Query sem nenhuma mensagem amigável.
        throw new PublicFormLoadError(
          "unavailable",
          "Não foi possível conectar ao servidor. Tente novamente em instantes."
        );
      }
      if (result.response.status === 404) {
        throw new PublicFormLoadError("not-found", "Este link não é válido ou o formulário foi removido.");
      }
      if (!result.response.ok || result.error) {
        throw new PublicFormLoadError(
          "unavailable",
          "Não foi possível carregar o formulário agora. Tente novamente em instantes."
        );
      }
      return result.data as unknown as PublicFormDto;
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
