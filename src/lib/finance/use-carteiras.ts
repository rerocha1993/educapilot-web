import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

/**
 * Carteiras de recebimento — fase A da cobrança.
 *
 * Carteira = uma conta do Financeiro que sabe receber dinheiro das famílias, pelo Asaas
 * (automático) ou manualmente. Cada conta tem no máximo uma carteira; só uma conta é a padrão
 * das mensalidades e só uma é a padrão das outras cobranças.
 *
 * `fetch` cru, no mesmo padrão dos outros hooks do financeiro. A chave da API do Asaas entra
 * mas nunca volta: a tela só sabe se `temChave`.
 */
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type ProvedorDeRecebimento = "manual" | "asaas";
export type AmbienteDoAsaas = "producao" | "sandbox";

export interface CarteiraDeRecebimento {
  id: string;
  contaId: string;
  contaNome: string;
  banco: string;
  provedor: ProvedorDeRecebimento;
  asaasAmbiente: AmbienteDoAsaas;
  temChave: boolean;
  asaasNomeDaConta?: string | null;
  chavePix?: string | null;
  webhookToken: string;
  webhookUrl: string;
  ativa: boolean;
  padraoParaMensalidades: boolean;
  padraoParaCobrancas: boolean;
  ultimoTesteEm?: string | null;
  ultimoTesteOk?: boolean | null;
  ultimoTesteMensagem?: string | null;
  ultimoWebhookEm?: string | null;
}

export interface SalvarCarteira {
  provedor: ProvedorDeRecebimento;
  /** Nulo ou vazio mantém a chave já gravada — a tela nunca reexibe o segredo. */
  asaasApiKey?: string | null;
  asaasAmbiente: AmbienteDoAsaas;
  chavePix?: string | null;
  ativa: boolean;
  padraoParaMensalidades: boolean;
  padraoParaCobrancas: boolean;
}

export interface TesteDaCarteira {
  ok: boolean;
  mensagem: string;
  nomeDaConta?: string | null;
}

class ErroDeApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
  }
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/finance/carteiras${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new ErroDeApi(
      (corpo as { message?: string } | null)?.message ?? "Não foi possível concluir a ação.",
      res.status
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const CHAVE = ["finance", "carteiras"] as const;

export function useCarteiras() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => chamar<CarteiraDeRecebimento[]>(""),
  });
}

/** `null` quando a conta ainda não tem recebimento configurado (404 não é erro aqui). */
export function useCarteiraDaConta(contaId: string | null | undefined) {
  return useQuery({
    queryKey: [...CHAVE, "conta", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      try {
        return await chamar<CarteiraDeRecebimento>(`/conta/${contaId}`);
      } catch (err) {
        if (err instanceof ErroDeApi && err.status === 404) return null;
        throw err;
      }
    },
  });
}

/** Mexer numa carteira pode tirar o "padrão" de outra conta, então invalida a lista inteira e as contas. */
function useInvalidarCarteiras() {
  const queryClient = useQueryClient();
  return () => {
    // Tudo do Financeiro: a lista de contas (chips), as origens de extrato (o Asaas passa a estar
    // disponivel assim que uma conta ganha chave) e as conexoes leem o que mudou aqui.
    queryClient.invalidateQueries({ queryKey: ["finance"] });
  };
}

export function useSalvarCarteira() {
  const queryClient = useQueryClient();
  const invalidar = useInvalidarCarteiras();
  return useMutation({
    mutationFn: ({ contaId, dados }: { contaId: string; dados: SalvarCarteira }) =>
      chamar<CarteiraDeRecebimento>(`/conta/${contaId}`, { method: "PUT", body: JSON.stringify(dados) }),
    onSuccess: (carteira, { contaId }) => {
      // A tela pode continuar aberta logo após o primeiro salvamento (para testar a chave e copiar
      // o webhook), então ela já recebe a carteira nova sem esperar a releitura.
      queryClient.setQueryData([...CHAVE, "conta", contaId], carteira);
      invalidar();
    },
  });
}

export function useRemoverCarteira() {
  const invalidar = useInvalidarCarteiras();
  return useMutation({
    mutationFn: (contaId: string) => chamar<void>(`/conta/${contaId}`, { method: "DELETE" }),
    onSuccess: invalidar,
  });
}

export function useTestarCarteira() {
  const invalidar = useInvalidarCarteiras();
  return useMutation({
    mutationFn: (contaId: string) => chamar<TesteDaCarteira>(`/conta/${contaId}/testar`, { method: "POST" }),
    // O teste grava o resultado na carteira (ultimoTeste*), então a lista precisa recarregar.
    onSuccess: invalidar,
  });
}

export function useDefinirPadraoDaCarteira() {
  const invalidar = useInvalidarCarteiras();
  return useMutation({
    mutationFn: ({
      contaId,
      ...dados
    }: {
      contaId: string;
      mensalidades?: boolean;
      cobrancas?: boolean;
    }) =>
      chamar<CarteiraDeRecebimento>(`/conta/${contaId}/padrao`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: invalidar,
  });
}
