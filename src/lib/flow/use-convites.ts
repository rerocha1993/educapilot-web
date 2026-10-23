import { useMutation } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/**
 * Convite para a família preencher um formulário já identificado com o aluno (contrato da Ficha v2, seção 3).
 *
 * POST /api/Forms/{formId}/convites { studentId } -> { link, expiraEm }. O link é de uso único e vale 30 dias;
 * a tela só mostra para copiar, não envia e-mail. Tipado à mão: o Swagger gerado ainda não conhece a rota.
 */
export interface ConviteCriado {
  link: string;
  expiraEm: string;
}

type ClienteSemTipo = {
  POST: (
    caminho: string,
    opcoes: { params: { path: { formId: string } }; body: { studentId: number } }
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
};

/** O servidor pode devolver o caminho (/f/...) ou o endereço inteiro; a tela mostra sempre o completo. */
export function enderecoCompletoDoLink(link: string) {
  if (/^https?:\/\//i.test(link)) return link;
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  return `${origem}${link.startsWith("/") ? "" : "/"}${link}`;
}

export function useCriarConvite(formId: string) {
  return useMutation({
    mutationFn: async (studentId: number) => {
      const result = await (flowApi as unknown as ClienteSemTipo).POST("/api/Forms/{formId}/convites", {
        params: { path: { formId } },
        body: { studentId },
      });
      const data = unwrapApiResponse(result, "Não foi possível gerar o link para a família.") as unknown as ConviteCriado;
      return { link: enderecoCompletoDoLink(data.link), expiraEm: data.expiraEm };
    },
  });
}
