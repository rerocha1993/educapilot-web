import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matriculasJson } from "./api";
import type {
  Assistente,
  FichaDaEscola,
  PerguntaSemResposta,
  PrimeirosPassos,
  RespostaDeTeste,
  SalvarAjustesDaAssistente,
  TelaDaFicha,
  TurnoDeTeste,
} from "./tipos";

const RAIZ = ["matriculas", "assistente"] as const;

export function useAssistente() {
  return useQuery({
    queryKey: [...RAIZ, "resumo"],
    queryFn: () => matriculasJson<Assistente>("/assistente", {}, "Não foi possível carregar a assistente."),
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: RAIZ });
}

export function useSalvarAjustesDaAssistente() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dto: SalvarAjustesDaAssistente) =>
      matriculasJson<Assistente>("/assistente", { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar."),
    onSuccess: invalidar,
  });
}

export function useFichaDaEscola() {
  return useQuery({
    queryKey: [...RAIZ, "ficha"],
    queryFn: () => matriculasJson<TelaDaFicha>("/assistente/ficha", {}, "Não foi possível carregar a ficha."),
  });
}

export function useSalvarFicha() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (ficha: FichaDaEscola) =>
      matriculasJson<FichaDaEscola>("/assistente/ficha", { method: "PUT", body: JSON.stringify(ficha) }, "Não foi possível salvar a ficha."),
    onSuccess: invalidar,
  });
}

/** O manual que a assistente lê. Só carrega quando a escola pede para ver. */
export function usePreviaDaFicha(ativa: boolean) {
  return useQuery({
    queryKey: [...RAIZ, "previa"],
    queryFn: () => matriculasJson<{ texto: string | null }>("/assistente/ficha/previa", {}, "Não foi possível montar a prévia."),
    enabled: ativa,
  });
}

export function usePerguntasSemResposta(todas: boolean) {
  return useQuery({
    queryKey: [...RAIZ, "perguntas", todas],
    queryFn: () =>
      matriculasJson<PerguntaSemResposta[]>(`/assistente/perguntas${todas ? "?todas=true" : ""}`, {}, "Não foi possível carregar as perguntas."),
  });
}

export function useResponderPergunta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, resposta, titulo }: { id: string; resposta: string; titulo?: string }) =>
      matriculasJson<PerguntaSemResposta>(
        `/assistente/perguntas/${id}/responder`,
        { method: "POST", body: JSON.stringify({ resposta, titulo: titulo || null }) },
        "Não foi possível responder."
      ),
    onSuccess: invalidar,
  });
}

export function useDescartarPergunta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      matriculasJson<PerguntaSemResposta>(`/assistente/perguntas/${id}/descartar`, { method: "POST" }, "Não foi possível descartar."),
    onSuccess: invalidar,
  });
}

export function useTestarAssistente() {
  return useMutation({
    mutationFn: (dto: { mensagens: TurnoDeTeste[]; nomeDoContato?: string | null }) =>
      matriculasJson<RespostaDeTeste>("/assistente/teste", { method: "POST", body: JSON.stringify(dto) }, "A assistente não respondeu."),
  });
}

/** O cadastro guiado: cada passo se marca sozinho pelo que a escola já salvou. */
export function usePrimeirosPassos() {
  return useQuery({
    queryKey: ["matriculas", "primeiros-passos"],
    queryFn: () => matriculasJson<PrimeirosPassos>("/primeiros-passos", {}, "Não foi possível carregar os primeiros passos."),
  });
}
