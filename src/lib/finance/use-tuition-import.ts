import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export interface TuitionImportResult {
  sucesso: boolean;
  erro?: string | null;
  criados: number;
  atualizados: number;
  /** Linhas em que o valor já era o mesmo — contadas para a soma fechar com o total. */
  semAlteracao: number;
  ignorados: string[];
  /** Alunos cadastrados que não apareceram na planilha (bolsista, aluno novo, quem saiu). */
  alunosSemMensalidade: string[];
}

/**
 * Importa a planilha de mensalidades.
 *
 * Usa fetch cru em vez do cliente tipado porque é multipart: o gerador de tipos a partir do
 * OpenAPI não cobre upload de arquivo — mesmo motivo e mesmo padrão de useUploadFormFile.
 */
export function useImportTuitionSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("arquivo", file);

      const token = getToken();
      const res = await fetch(`${baseUrl}/api/TuitionPlans/importar-planilha`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const texto = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(texto);
      } catch {
        parsed = { message: texto };
      }

      if (!res.ok) {
        const msg = (parsed as { message?: string }).message;
        throw new Error(msg ?? "Não foi possível importar a planilha.");
      }

      return parsed as TuitionImportResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tuition-plans"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-entries"] });
    },
  });
}
