import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_FINANCEIRO, financeiroJson } from "./financeiro-api";

/**
 * Comprovantes pelo WhatsApp (fase W1): um número da plataforma (o mesmo para todas as escolas)
 * e, em cada escola, a lista de quem pode mandar comprovante — /api/financeiro/whatsapp.
 * Cada pessoa confirma o próprio celular enviando um código de 6 dígitos para esse número.
 */

const CHAVE = ["finance", "whatsapp"] as const;
const BASE = `${API_FINANCEIRO}/whatsapp`;

export type DestinoPadrao = "Despesas" | "Projeto" | "Conciliar";

export const ROTULO_DO_DESTINO: Record<DestinoPadrao, string> = {
  Despesas: "Despesas",
  Projeto: "Projeto",
  Conciliar: "Conciliação",
};

export interface StatusDoWhatsApp {
  configurado: boolean;
  /** O número do EducaPilot, já formatado para ler e salvar na agenda. */
  numeroExibido: string | null;
}

export interface RemetenteDeWhatsApp {
  id: string;
  nome: string;
  /** Só dígitos, com país e DDD (55DDNNNNNNNNN). */
  telefone: string;
  telefoneFormatado: string;
  confirmado: boolean;
  codigoDeConfirmacao: string | null;
  codigoExpiraEm?: string | null;
  confirmadoEm?: string | null;
  ativo: boolean;
  destinoPadrao: DestinoPadrao;
  projetoPadraoId?: string | null;
  projetoPadraoNome?: string | null;
  contaFinanceiraPadraoId?: string | null;
  contaPadraoNome?: string | null;
  categoriaFinanceiraPadraoId?: string | null;
  categoriaPadraoNome?: string | null;
  ultimoEnvioEm?: string | null;
}

/** O que o POST devolve: o remetente e o número a que ele deve mandar o código. */
export type RemetenteCriado = RemetenteDeWhatsApp & { telefoneDaPlataforma?: string | null };

export interface DadosDoRemetente {
  nome: string;
  telefone: string;
  destinoPadrao: DestinoPadrao;
  projetoPadraoId?: string | null;
  contaFinanceiraPadraoId?: string | null;
  categoriaFinanceiraPadraoId?: string | null;
}

export function useStatusDoWhatsApp() {
  return useQuery({
    queryKey: [...CHAVE, "status"],
    staleTime: 60_000,
    queryFn: async (): Promise<StatusDoWhatsApp> => {
      const s = await financeiroJson<Partial<StatusDoWhatsApp> | null>(
        `${BASE}/status`,
        {},
        "Não foi possível carregar a situação do WhatsApp."
      );
      return { configurado: !!s?.configurado, numeroExibido: s?.numeroExibido ?? null };
    },
  });
}

export function useRemetentesDeWhatsApp(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE, "remetentes"],
    enabled: habilitado,
    // Quem está aguardando o código vira "confirmado" sem a tela saber: olha de novo de tempos em tempos.
    refetchInterval: (consulta) =>
      consulta.state.data?.some((r) => r.ativo && !r.confirmado) ? 15_000 : false,
    queryFn: async () =>
      (await financeiroJson<RemetenteDeWhatsApp[] | null>(
        `${BASE}/remetentes`,
        {},
        "Não foi possível carregar quem pode enviar comprovantes."
      )) ?? [],
  });
}

function useEscritaDeRemetente<V, R>(enviar: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useCriarRemetente() {
  return useEscritaDeRemetente((dados: DadosDoRemetente) =>
    financeiroJson<RemetenteCriado>(
      `${BASE}/remetentes`,
      { method: "POST", body: JSON.stringify(dados) },
      "Não foi possível cadastrar o celular."
    )
  );
}

export function useEditarRemetente() {
  return useEscritaDeRemetente(({ id, dados }: { id: string; dados: DadosDoRemetente }) =>
    financeiroJson<RemetenteCriado>(
      `${BASE}/remetentes/${id}`,
      { method: "PUT", body: JSON.stringify(dados) },
      "Não foi possível salvar as alterações."
    )
  );
}

export function useNovoCodigoDoRemetente() {
  return useEscritaDeRemetente((id: string) =>
    financeiroJson<RemetenteCriado>(
      `${BASE}/remetentes/${id}/novo-codigo`,
      { method: "POST" },
      "Não foi possível gerar um novo código."
    )
  );
}

export function useDesativarRemetente() {
  return useEscritaDeRemetente((id: string) =>
    financeiroJson<void>(`${BASE}/remetentes/${id}/desativar`, { method: "POST" }, "Não foi possível desativar o celular.")
  );
}

export function useRemoverRemetente() {
  return useEscritaDeRemetente((id: string) =>
    financeiroJson<void>(`${BASE}/remetentes/${id}`, { method: "DELETE" }, "Não foi possível remover o celular.")
  );
}
