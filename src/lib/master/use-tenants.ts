import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/lib/api/client";
import { unwrapApiResponse } from "@/lib/api/unwrap";

export interface TenantDto {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  emailContato: string;
  telefone: string;
  ativo: boolean;
  isBlocked: boolean;
  dataCriacao: string;
  monthlyFee: number;
}

export function useTenants() {
  return useQuery({
    queryKey: ["master", "tenants"],
    queryFn: async () => {
      const result = await masterApi.GET("/api/Admin/tenants");
      const data = unwrapApiResponse(result, "Não foi possível carregar as escolas.");
      return (data ?? []) as unknown as TenantDto[];
    },
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ["master", "tenants", id],
    enabled: !!id,
    queryFn: async () => {
      const result = await masterApi.GET("/api/Admin/tenants/{id}", { params: { path: { id: id! } } });
      const data = unwrapApiResponse(result, "Não foi possível carregar a escola.");
      return data as unknown as TenantDto;
    },
  });
}

export interface CreateTenantInput {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  emailContato: string;
  telefone?: string;
  monthlyFee: number;
  responsibleCpf: string;
  nomeAdministrador: string;
  emailAdministrador: string;
  senhaAdministrador: string;
}

// Gera uma chave aleatória local pra assinar os tokens JWT desse tenant (Tenant.
// JwtSecret) — o backend exige que o cliente forneça essa chave na criação (não é
// gerada no servidor), mas não faz sentido nenhum expor "digite uma chave de
// assinatura" pro admin master preencher: é gerada aqui, nunca mostrada na tela.
function generateJwtSecret() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const result = await masterApi.POST("/api/Admin/tenants", {
        body: {
          ...input,
          jwtSecret: generateJwtSecret(),
          // CreateTenantRequest.Endereco/Numero/Bairro/Cidade/Estado/Cep/Complemento são
          // string não-anulável no backend (só dispara 400 se vier null/ausente, não se
          // vier "") — o wireframe A2 não coleta endereço, então mandamos vazio em vez
          // de adicionar campos que não estão na tela.
          endereco: "",
          numero: "",
          bairro: "",
          cidade: "",
          estado: "",
          cep: "",
          complemento: "",
        },
      });
      const data = unwrapApiResponse(result, "Não foi possível criar a escola.");
      return data as unknown as { message: string; tenantId: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", "tenants"] }),
  });
}
