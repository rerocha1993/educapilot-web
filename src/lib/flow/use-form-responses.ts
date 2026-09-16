import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";
import { getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface FormResponseItemDto {
  id: string;
  responseId: string;
  fieldId: string;
  valor: string | null;
}

export interface FormResponseDto {
  id: string;
  formId: string;
  tenantId: string;
  userId: string | null;
  referenciaId: string | null;
  nomeReferencia: string | null;
  observacoes: string | null;
  status: string; // livre — usamos Pendente/Revisar/Concluída por convenção
  dataPreenchimento: string;
  itens: FormResponseItemDto[] | null;
}

export const RESPONSE_STATUS_BADGE: Record<string, string> = {
  Concluída: "bg-success-soft text-success-soft-foreground",
  Revisar: "bg-warning-soft text-warning-soft-foreground",
  Pendente: "bg-accent text-accent-foreground",
};

async function buscarRespostas(formId: string) {
  const result = await flowApi.GET("/api/FormResponses/{formId}", {
    params: { path: { formId } },
  });
  const data = unwrapApiResponse(result, "Não foi possível carregar as respostas.");
  return (data ?? []) as unknown as FormResponseDto[];
}

export function useFormResponses(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-responses", formId],
    enabled: !!formId,
    queryFn: () => buscarRespostas(formId!),
  });
}

/**
 * Envios de vários formulários juntos, para a opção "Todos" da caixa de envios.
 *
 * Uma consulta por formulário, com a mesma chave de cache da consulta de um só: trocar entre
 * "Todos" e um formulário não busca de novo o que já veio.
 */
export function useRespostasDosFormularios(formIds: string[]) {
  return useQueries({
    queries: formIds.map((formId) => ({
      queryKey: ["form-responses", formId],
      queryFn: () => buscarRespostas(formId),
    })),
    combine: (resultados) => ({
      respostas: resultados.flatMap((r) => r.data ?? []),
      isLoading: resultados.some((r) => r.isLoading),
    }),
  });
}

export function useMarkResponseReviewed(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (response: FormResponseDto) => {
      const result = await flowApi.PUT("/api/FormResponses/{formId}/{id}", {
        params: { path: { formId, id: response.id } },
        body: {
          id: response.id,
          formId,
          tenantId: response.tenantId,
          userId: response.userId,
          referenciaId: response.referenciaId,
          nomeReferencia: response.nomeReferencia,
          observacoes: response.observacoes,
          status: "Concluída",
        },
      });
      unwrapApiResponse(result, "Não foi possível marcar como revisada.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-responses", formId] }),
  });
}

// Novo (2026-08): exportação (item 5 do gap analysis). GET /api/FormResponses/{id}/export
// é [ApiExplorerSettings(IgnoreApi = true)] (download binário) — fetch cru, sem tipo
// gerado, mesmo padrão do resto do arquivo de upload/import.
export function useExportResponses(formId: string) {
  return useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/FormResponses/${formId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error("Não foi possível exportar as respostas.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "respostas.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Baixa a planilha de um ou mais formulários, um arquivo por formulário.
 *
 * Um por formulário, e não tudo numa aba só: cada formulário tem as próprias perguntas, e juntar
 * matrícula e rematrícula na mesma tabela deixaria metade das colunas vazias em cada linha. O
 * arquivo leva o nome do formulário para não virar "respostas (3).xlsx" na pasta de downloads.
 */
export function useBaixarExcel() {
  return useMutation({
    mutationFn: async (formularios: { id: string; nome: string }[]) => {
      const token = getToken();
      for (const form of formularios) {
        const res = await fetch(`${baseUrl}/api/FormResponses/${form.id}/export`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`Não foi possível gerar a planilha de "${form.nome}".`);

        const url = window.URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `${form.nome.replace(/[\\/:*?"<>|]/g, "-").trim() || "respostas"}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    },
  });
}

/**
 * Exclui uma resposta.
 *
 * O backend recusa resposta com contrato assinado — apagá-la levaria o contrato junto, e contrato
 * assinado é a prova que sustenta a matrícula. A tela só mostra o botão; a regra de verdade está
 * no servidor.
 */
export function useDeleteFormResponse(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await flowApi.DELETE("/api/FormResponses/{formId}/{id}", {
        params: { path: { formId, id } },
      });
      unwrapApiResponse(result, "Não foi possível excluir a resposta.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["form-responses", formId] }),
  });
}
