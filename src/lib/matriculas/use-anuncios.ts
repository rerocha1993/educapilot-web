import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matriculasJson } from "./api";
import type { ContaMetaAds, ResultadosDosAnuncios } from "./tipos";

const CONTA = ["matriculas", "anuncios", "conta"] as const;

export function useContaMetaAds() {
  return useQuery({
    queryKey: CONTA,
    queryFn: () => matriculasJson<ContaMetaAds>("/anuncios/conta", {}, "Não foi possível carregar a conexão com o Facebook."),
  });
}

export function useResultadosDosAnuncios(dias: number) {
  return useQuery({
    queryKey: ["matriculas", "anuncios", "resultados", dias],
    queryFn: () => matriculasJson<ResultadosDosAnuncios>(`/anuncios/resultados?dias=${dias}`, {}, "Não foi possível carregar os resultados."),
  });
}

/** Pede o endereço do login do Facebook e vai para ele. */
export function useConectarFacebook() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await matriculasJson<{ url: string }>("/anuncios/conectar", { method: "POST" }, "Não foi possível começar a conexão.");
      window.location.assign(url);
    },
  });
}

export function useRetornoDoFacebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { code: string; state: string }) =>
      matriculasJson<ContaMetaAds>("/anuncios/retorno", { method: "POST", body: JSON.stringify(dto) }, "Não foi possível concluir a conexão."),
    onSuccess: (conta) => qc.setQueryData(CONTA, conta),
  });
}

export function useEscolherNaMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { paginaId?: string | null; contaDeAnunciosId?: string | null }) =>
      matriculasJson<ContaMetaAds>("/anuncios/conta", { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar."),
    onSuccess: (conta) => {
      qc.setQueryData(CONTA, conta);
      qc.invalidateQueries({ queryKey: ["matriculas", "anuncios", "resultados"] });
    },
  });
}

export function useDesconectarFacebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => matriculasJson<void>("/anuncios/conta", { method: "DELETE" }, "Não foi possível desconectar."),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matriculas", "anuncios"] }),
  });
}
