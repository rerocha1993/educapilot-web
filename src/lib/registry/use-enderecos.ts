import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface Endereco {
  id: string;
  guardianId: string | null;
  studentId: number | null;
  tipo: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  /** Uma linha só, montada no backend. Só na leitura. */
  resumo: string | null;
}

export function useEnderecosDoResponsavel(guardianId: string | undefined) {
  return useQuery({
    queryKey: ["enderecos", "responsavel", guardianId],
    enabled: !!guardianId,
    queryFn: async () => {
      const result = await coreApi.GET("/api/Enderecos/responsavel/{guardianId}", {
        params: { path: { guardianId: guardianId! } },
      });
      const data = unwrapApiResponse(result, "Não foi possível carregar os endereços.");
      return (data ?? []) as unknown as Endereco[];
    },
  });
}

export function useSalvarEndereco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Endereco> & { guardianId: string }) => {
      const result = await coreApi.PUT("/api/Enderecos", {
        body: {
          id: input.id ?? null,
          guardianId: input.guardianId,
          studentId: input.studentId ?? null,
          tipo: input.tipo ?? "Residencial",
          cep: input.cep ?? null,
          logradouro: input.logradouro ?? null,
          numero: input.numero ?? null,
          complemento: input.complemento ?? null,
          bairro: input.bairro ?? null,
          cidade: input.cidade ?? null,
          uf: input.uf ?? null,
        },
      });
      unwrapApiResponse(result, "Não foi possível salvar o endereço.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enderecos"] }),
  });
}

export function useRemoverEndereco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await coreApi.DELETE("/api/Enderecos/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível remover o endereço.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enderecos"] }),
  });
}
