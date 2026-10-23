import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/**
 * Ações em lote da Caixa de envios. A tela não conhece ações por nome: pergunta à API quais se aplicam ao
 * formulário e desenha o que vier. Ação nova no core = botão novo aqui, sem mudar a tela.
 *
 * Os envios e os nomes são dado de saúde de criança: nada daqui vai para URL ou log (ids e valores só no corpo).
 * Tipado à mão: o Swagger gerado ainda não conhece estas rotas.
 */

export interface AcaoEmLote {
  id: string;
  rotulo: string;
  descricao: string;
  parametro?: { rotulo: string; obrigatorio: boolean; opcoes: string[] } | null;
}

export type SituacaoDoItem = "Proposto" | "Marcado" | "SemProposta" | "JaEstava" | "Aplicado" | "Recusado" | "Erro";

export interface ItemEmLote {
  respostaId: string;
  rotuloDoItem: string;
  situacao: SituacaoDoItem;
  motivo?: string | null;
  /** O que a ação propõe e a tela devolve ao aplicar (só a ação entende). */
  valor?: string | null;
  campos: { rotulo: string; valor?: string | null }[];
}

export interface PreviaEmLote {
  acaoId: string;
  colunas: string[];
  itens: ItemEmLote[];
  totalElegiveis: number;
  truncado: boolean;
}

export interface ResultadoEmLote {
  acaoId: string;
  itens: ItemEmLote[];
  aplicados: number;
  jaEstavam: number;
  recusados: number;
  erros: number;
}

export const MAXIMO_PARA_APLICAR = 200;

type Resultado = Promise<{ data?: unknown; error?: unknown; response: Response }>;
type Params = { params: { path: { formId: string; acaoId?: string } }; body?: unknown };

type ClienteSemTipo = {
  GET: (caminho: string, opcoes: Params) => Resultado;
  POST: (caminho: string, opcoes: Params) => Resultado;
};

const cliente = () => flowApi as unknown as ClienteSemTipo;

export function useAcoesEmLote(formId: string | undefined) {
  return useQuery({
    // Debaixo de ["form-responses", formId]: o que invalida a lista também refaz as ações disponíveis.
    queryKey: ["form-responses", formId, "acoes-em-lote"],
    enabled: !!formId,
    retry: false,
    queryFn: async () => {
      const result = await cliente().GET("/api/FormResponses/{formId}/acoes-em-lote", { params: { path: { formId: formId! } } });
      return unwrapApiResponse(result, "Não foi possível carregar as ações em lote.") as unknown as AcaoEmLote[];
    },
  });
}

export function usePreverAcaoEmLote(formId: string) {
  return useMutation({
    mutationFn: async ({ acaoId, respostaIds, parametro }: { acaoId: string; respostaIds?: string[]; parametro?: string }) => {
      const result = await cliente().POST("/api/FormResponses/{formId}/acoes-em-lote/{acaoId}/prever", {
        params: { path: { formId, acaoId } },
        body: { respostaIds: respostaIds && respostaIds.length > 0 ? respostaIds : null, parametro: parametro ?? null },
      });
      return unwrapApiResponse(result, "Não foi possível montar a prévia.") as unknown as PreviaEmLote;
    },
  });
}

export function useAplicarAcaoEmLote(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ acaoId, itens, parametro }: { acaoId: string; itens: { respostaId: string; valor?: string | null }[]; parametro?: string }) => {
      const result = await cliente().POST("/api/FormResponses/{formId}/acoes-em-lote/{acaoId}/aplicar", {
        params: { path: { formId, acaoId } },
        body: { itens, parametro: parametro ?? null },
      });
      return unwrapApiResponse(result, "Não foi possível aplicar a ação.") as unknown as ResultadoEmLote;
    },
    // Mesmo se parte falhou, o que foi feito já mudou: a lista, os vínculos e a ficha do aluno precisam recarregar.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["form-responses", formId] });
      void queryClient.invalidateQueries({ queryKey: ["vinculo-de-resposta"] });
      void queryClient.invalidateQueries({ queryKey: ["resumo-do-aluno"] });
    },
  });
}
