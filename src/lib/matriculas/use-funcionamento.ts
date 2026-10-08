import { useQuery } from "@tanstack/react-query";
import { matriculasJson } from "./api";
import type { FuncionamentoDaAssistente } from "./tipos";

/** Tudo o que a assistente usa nesta escola, só para ler. */
export function useFuncionamentoDaAssistente() {
  return useQuery({
    queryKey: ["matriculas", "assistente", "funcionamento"],
    queryFn: () =>
      matriculasJson<FuncionamentoDaAssistente>(
        "/assistente/funcionamento",
        {},
        "Não foi possível carregar como a assistente funciona."
      ),
  });
}
