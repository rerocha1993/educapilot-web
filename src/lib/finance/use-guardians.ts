import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface StudentGuardianDto {
  id: string;
  guardianId: string;
  studentId: number;
  studentName: string | null;
  parentesco: string | null;
  responsavelFinanceiro: boolean;
}

export interface GuardianDto {
  id: string;
  fullName: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  temCadastroAsaas: boolean;
  vinculos: StudentGuardianDto[] | null;
}

export function useGuardians() {
  return useQuery({
    queryKey: ["guardians"],
    queryFn: async () => {
      const result = await financeApi.GET("/api/Guardians");
      const data = unwrapApiResponse(result, "Não foi possível carregar os responsáveis.");
      return (data ?? []) as unknown as GuardianDto[];
    },
  });
}

export interface SaveGuardianInput {
  id?: string;
  fullName: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function useSaveGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveGuardianInput) => {
      const body = { fullName: input.fullName, cpf: input.cpf ?? null, email: input.email ?? null, phone: input.phone ?? null };
      if (input.id) {
        const result = await financeApi.PUT("/api/Guardians/{id}", { params: { path: { id: input.id } }, body });
        unwrapApiResponse(result, "Não foi possível salvar o responsável.");
      } else {
        const result = await financeApi.POST("/api/Guardians", { body });
        unwrapApiResponse(result, "Não foi possível cadastrar o responsável.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guardians"] }),
  });
}

export function useDeleteGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await financeApi.DELETE("/api/Guardians/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível remover o responsável.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guardians"] }),
  });
}

export function useAddVinculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { guardianId: string; studentId: number; parentesco?: string; responsavelFinanceiro: boolean }) => {
      const result = await financeApi.POST("/api/Guardians/vinculos", {
        body: {
          guardianId: input.guardianId,
          studentId: input.studentId,
          parentesco: input.parentesco ?? null,
          responsavelFinanceiro: input.responsavelFinanceiro,
        },
      });
      unwrapApiResponse(result, "Não foi possível vincular o aluno.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guardians"] }),
  });
}

export function useRemoveVinculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await financeApi.DELETE("/api/Guardians/vinculos/{id}", { params: { path: { id } } });
      unwrapApiResponse(result, "Não foi possível remover o vínculo.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guardians"] }),
  });
}
