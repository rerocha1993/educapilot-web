import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "../api/client";
import { unwrapApiResponse } from "../api/unwrap";

export interface AgendaEduSettings {
  baseUrl: string;
  clientId: string;
  /** Indica que já existe segredo gravado. O valor em si nunca vem do backend. */
  configurado: boolean;
  ultimaImportacaoEm?: string | null;
}

export interface AgendaEduImportResult {
  sucesso: boolean;
  erro?: string | null;
  turmasCriadas: number;
  turmasAtualizadas: number;
  alunosCriados: number;
  alunosAtualizados: number;
  responsaveisCriados: number;
  responsaveisAtualizados: number;
  vinculosCriados: number;
  /** Registros pulados, com o motivo — ver comentário no DTO do backend. */
  ignorados: string[];
}

export function useAgendaEduSettings() {
  return useQuery({
    queryKey: ["agenda-edu", "configuracao"],
    queryFn: async () => {
      const result = await coreApi.GET("/api/AgendaEdu/configuracao", {});
      const data = unwrapApiResponse(result, "Não foi possível carregar a configuração do Agenda Edu.");
      return data as unknown as AgendaEduSettings;
    },
  });
}

export function useSaveAgendaEduSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      baseUrl: string;
      clientId: string;
      secretKey?: string;
      schoolToken?: string;
    }) => {
      const result = await coreApi.PUT("/api/AgendaEdu/configuracao", {
        body: {
          baseUrl: input.baseUrl,
          clientId: input.clientId,
          // Só envia o segredo quando o usuário digitou algo. Campo em branco significa
          // "mantém o que já está gravado" — o backend trata assim de propósito, porque a
          // tela nunca recebe o valor atual para poder reenviá-lo.
          secretKey: input.secretKey?.trim() || undefined,
          schoolToken: input.schoolToken?.trim() || undefined,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar a configuração.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agenda-edu"] }),
  });
}

export function useTestAgendaEduConnection() {
  return useMutation({
    mutationFn: async () => {
      const result = await coreApi.POST("/api/AgendaEdu/testar-conexao", {});
      const data = unwrapApiResponse(result, "Não foi possível testar a conexão.");
      return data as unknown as { sucesso: boolean };
    },
  });
}

export function useImportAgendaEdu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await coreApi.POST("/api/AgendaEdu/importar", {});
      const data = unwrapApiResponse(result, "Não foi possível importar do Agenda Edu.");
      return data as unknown as AgendaEduImportResult;
    },
    onSuccess: () => {
      // A importação mexe em turmas, alunos e responsáveis — invalida os três para que as
      // telas correspondentes não continuem mostrando a lista antiga.
      queryClient.invalidateQueries({ queryKey: ["agenda-edu"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
  });
}
