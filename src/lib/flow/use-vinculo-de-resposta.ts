import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

/**
 * "Vincular a um aluno": liga ao aluno um envio que chegou sem ele (a anamnese que a família preencheu pelo
 * link geral), para ela aparecer na ficha. Uma resposta por vez, escolhida por uma pessoa.
 *
 * O envio e o nome da criança são dado de saúde: nada daqui vai para log nem para a URL. Tipado à mão: o
 * Swagger gerado ainda não conhece estas rotas.
 */

export interface AlunoParaVinculo {
  id: number;
  nome: string;
  turma?: string | null;
}

export interface SugestaoDeAluno extends AlunoParaVinculo {
  alunoId: number;
  /** "Exata" (mesmo nome) ou "Parecida" (um nome contém o outro). */
  correspondencia: "Exata" | "Parecida";
}

export interface SugestoesDeVinculo {
  alunoAtual?: AlunoParaVinculo | null;
  /** Rótulo do campo que serviu de nome da criança. */
  campoDeNome?: string | null;
  nomeInformado?: string | null;
  sugestoes: SugestaoDeAluno[];
}

export interface VinculoFeito {
  respostaId: string;
  alunoId?: number | null;
  alunoNome?: string | null;
  jaEstavaVinculada: boolean;
}

type Resultado = Promise<{ data?: unknown; error?: unknown; response: Response }>;

type ClienteSemTipo = {
  GET: (caminho: string, opcoes: { params: { path: { formId: string; id?: string }; query?: { termo?: string } } }) => Resultado;
  PUT: (caminho: string, opcoes: { params: { path: { formId: string; id: string } }; body: { alunoId: number } }) => Resultado;
  DELETE: (caminho: string, opcoes: { params: { path: { formId: string; id: string } } }) => Resultado;
};

const cliente = () => flowApi as unknown as ClienteSemTipo;

export function useSugestoesDeVinculo(formId: string | undefined, responseId: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: ["vinculo-de-resposta", "sugestoes", formId, responseId],
    enabled: habilitado && !!formId && !!responseId,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const result = await cliente().GET("/api/FormResponses/{formId}/{id}/sugestoes-de-aluno", {
        params: { path: { formId: formId!, id: responseId! } },
      });
      return unwrapApiResponse(result, "Não foi possível carregar as sugestões de aluno.") as unknown as SugestoesDeVinculo;
    },
  });
}

/** Busca por nome (a partir de 2 letras). O termo vai na query só para esta chamada; não fica no histórico da tela. */
export function useBuscaDeAlunos(formId: string | undefined, termo: string) {
  const limpo = termo.trim();
  return useQuery({
    queryKey: ["vinculo-de-resposta", "alunos", formId, limpo],
    enabled: !!formId && limpo.length >= 2,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const result = await cliente().GET("/api/FormResponses/{formId}/alunos", {
        params: { path: { formId: formId! }, query: { termo: limpo } },
      });
      return unwrapApiResponse(result, "Não foi possível buscar alunos.") as unknown as AlunoParaVinculo[];
    },
  });
}

function useInvalidarDepoisDoVinculo(formId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["form-responses", formId] });
    void queryClient.invalidateQueries({ queryKey: ["vinculo-de-resposta"] });
    // A ficha do aluno passa a ter (ou deixa de ter) a resposta.
    void queryClient.invalidateQueries({ queryKey: ["resumo-do-aluno"] });
  };
}

export function useVincularResposta(formId: string) {
  const depois = useInvalidarDepoisDoVinculo(formId);
  return useMutation({
    mutationFn: async ({ responseId, alunoId }: { responseId: string; alunoId: number }) => {
      const result = await cliente().PUT("/api/FormResponses/{formId}/{id}/aluno", {
        params: { path: { formId, id: responseId } },
        body: { alunoId },
      });
      return unwrapApiResponse(result, "Não foi possível vincular o envio ao aluno.") as unknown as VinculoFeito;
    },
    onSuccess: depois,
  });
}

export function useDesvincularResposta(formId: string) {
  const depois = useInvalidarDepoisDoVinculo(formId);
  return useMutation({
    mutationFn: async (responseId: string) => {
      const result = await cliente().DELETE("/api/FormResponses/{formId}/{id}/aluno", {
        params: { path: { formId, id: responseId } },
      });
      return unwrapApiResponse(result, "Não foi possível desfazer o vínculo.") as unknown as VinculoFeito;
    },
    onSuccess: depois,
  });
}
