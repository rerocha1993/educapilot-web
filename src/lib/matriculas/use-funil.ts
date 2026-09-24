import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { matriculasJson } from "./api";
import type {
  ConfiguracaoMatriculas,
  EstadoDaAutomacao,
  EtapaDoFunil,
  LeadDetalhe,
  LeadResumo,
  Quadro,
  SalvarConfiguracaoMatriculas,
  SalvarLead,
  SinalDaFamilia,
} from "./tipos";

const RAIZ = ["matriculas"] as const;
const chaveDoQuadro = (busca: string) => [...RAIZ, "quadro", busca] as const;
const chaveDoLead = (id: string) => [...RAIZ, "lead", id] as const;
const CHAVE_DA_CONFIGURACAO = [...RAIZ, "configuracao"] as const;

/**
 * O quadro do funil. Relido a cada minuto: é o que mantém o "há 12 min" da espera andando e traz o
 * card que a assistente moveu enquanto a tela estava aberta.
 */
export function useQuadro(busca: string) {
  return useQuery({
    queryKey: chaveDoQuadro(busca),
    queryFn: () => {
      const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
      return matriculasJson<Quadro>(`/quadro${q}`, {}, "Não foi possível carregar o funil.");
    },
    refetchInterval: 60_000,
    placeholderData: (anterior) => anterior,
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: chaveDoLead(id ?? ""),
    queryFn: () => matriculasJson<LeadDetalhe>(`/leads/${id}`, {}, "Não foi possível carregar a família."),
    enabled: !!id,
  });
}

function useInvalidarFunil() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: RAIZ });
}

export function useCriarLead() {
  const invalidar = useInvalidarFunil();
  return useMutation({
    mutationFn: (dto: SalvarLead) =>
      matriculasJson<LeadDetalhe>("/leads", { method: "POST", body: JSON.stringify(dto) }, "Não foi possível cadastrar a família."),
    onSuccess: invalidar,
  });
}

export function useAtualizarLead() {
  const invalidar = useInvalidarFunil();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SalvarLead }) =>
      matriculasJson<LeadDetalhe>(`/leads/${id}`, { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar."),
    onSuccess: invalidar,
  });
}

/**
 * Move o card de etapa já na tela, antes da resposta.
 *
 * Arrastar e ver o card voltar para o lugar enquanto a rede responde parece erro. Se o servidor
 * recusar, os quadros em cache voltam ao que eram e a mensagem dele aparece.
 */
export function useMoverLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapa, motivoPerda }: { id: string; etapa: EtapaDoFunil; motivoPerda?: string }) =>
      matriculasJson<LeadResumo>(
        `/leads/${id}/etapa`,
        { method: "POST", body: JSON.stringify({ etapa, motivoPerda }) },
        "Não foi possível mover a família."
      ),
    onMutate: async ({ id, etapa }) => {
      await qc.cancelQueries({ queryKey: [...RAIZ, "quadro"] });
      const antes = qc.getQueriesData<Quadro>({ queryKey: [...RAIZ, "quadro"] });
      const agora = new Date().toISOString();

      for (const [chave, quadro] of antes) {
        if (!quadro) continue;
        const lead = quadro.leads.find((l) => l.id === id);
        if (!lead || lead.etapa === etapa) continue;
        const de = lead.etapa;
        qc.setQueryData<Quadro>(chave, {
          ...quadro,
          leads: quadro.leads.map((l) => (l.id === id ? { ...l, etapa, etapaDesde: agora, diasNaEtapa: 0 } : l)),
          etapas: quadro.etapas.map((e) =>
            e.etapa === de ? { ...e, total: e.total - 1 } : e.etapa === etapa ? { ...e, total: e.total + 1 } : e
          ),
        });
      }
      return { antes };
    },
    onError: (_erro, _vars, contexto) => {
      for (const [chave, quadro] of (contexto?.antes ?? []) as [QueryKey, Quadro | undefined][]) {
        qc.setQueryData(chave, quadro);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: RAIZ }),
  });
}

export function useDefinirSinal() {
  const invalidar = useInvalidarFunil();
  return useMutation({
    mutationFn: ({ id, sinal }: { id: string; sinal: SinalDaFamilia | null }) =>
      matriculasJson<LeadResumo>(`/leads/${id}/sinal`, { method: "POST", body: JSON.stringify({ sinal }) }, "Não foi possível salvar o sinal."),
    onSuccess: invalidar,
  });
}

export function useExcluirLead() {
  const invalidar = useInvalidarFunil();
  return useMutation({
    mutationFn: (id: string) => matriculasJson<void>(`/leads/${id}`, { method: "DELETE" }, "Não foi possível excluir."),
    onSuccess: invalidar,
  });
}

export function useConfiguracaoMatriculas() {
  return useQuery({
    queryKey: CHAVE_DA_CONFIGURACAO,
    queryFn: () => matriculasJson<ConfiguracaoMatriculas>("/configuracao", {}, "Não foi possível carregar a configuração."),
  });
}

export function useSalvarConfiguracaoMatriculas() {
  const invalidar = useInvalidarFunil();
  return useMutation({
    mutationFn: (dto: SalvarConfiguracaoMatriculas) =>
      matriculasJson<ConfiguracaoMatriculas>("/configuracao", { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar a configuração."),
    onSuccess: invalidar,
  });
}

/** O que cada automação precisa para funcionar, e quando agiu pela última vez. */
export function useEstadoDasAutomacoes() {
  return useQuery({
    queryKey: ["matriculas", "automacoes"],
    queryFn: () => matriculasJson<EstadoDaAutomacao[]>("/automacoes", {}, "Não foi possível carregar as automações."),
  });
}
