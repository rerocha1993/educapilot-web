import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  consulta,
  mensagemDeErro,
  relacionamentoFetch,
  relacionamentoJson,
  relacionamentoUpload,
  type BaixarFoto,
  type VarianteDaFoto,
} from "./api";
import {
  categoriaDaLoja,
  statusDoPedido,
  type CategoriaDaLoja,
  type ItemDoPedido,
  type StatusDoPedido,
} from "./use-portal-pagamentos";

/**
 * Relacionamento, loja — lado da escola (2026-10): itens (material, taxa, uniforme) e pedidos das
 * famílias — /api/Relacionamento/loja, área `loja`.
 *
 * Nulos chegam omitidos e viram `null`. `estoque` nulo quer dizer "sem limite".
 */

const LOJA = ["relacionamento", "loja"] as const;

// ------------------------------------------------------------------ tipos

export interface TurmaDoItem {
  classId: number;
  nome: string;
}

export interface ItemDaLoja {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: CategoriaDaLoja;
  preco: number;
  ativo: boolean;
  estoque: number | null;
  temFoto: boolean;
  /** Vazio = vale para a escola toda. */
  turmas: TurmaDoItem[];
  ordem: number;
}

export interface SalvarItemDaLoja {
  nome: string;
  descricao?: string;
  categoria: CategoriaDaLoja;
  preco: number;
  estoque?: number;
  classIds?: number[];
  ordem?: number;
}

export interface PedidoDaEscola {
  id: string;
  numero: number;
  nomeDoResponsavel: string;
  alunoNome: string | null;
  total: number;
  status: StatusDoPedido;
  /** Instante UTC. */
  criadoEm: string;
  pagoEm: string | null;
  itens: ItemDoPedido[];
  cobranca: { id: string; status: string; asaasInvoiceUrl: string | null } | null;
}

export interface FiltroDePedidos {
  status: StatusDoPedido | null;
  /** yyyy-MM-dd */
  de: string;
  ate: string;
}

// ------------------------------------------------------------------ normalização

type ItemCru = Partial<Omit<ItemDaLoja, "categoria" | "turmas">> & {
  categoria?: string;
  turmas?: Partial<TurmaDoItem>[];
};

function item(i: ItemCru): ItemDaLoja {
  return {
    id: String(i.id ?? ""),
    nome: i.nome ?? "",
    descricao: i.descricao ?? null,
    categoria: categoriaDaLoja(i.categoria),
    preco: i.preco ?? 0,
    ativo: i.ativo ?? true,
    estoque: i.estoque ?? null,
    temFoto: i.temFoto ?? false,
    turmas: (i.turmas ?? []).map((t) => ({ classId: t.classId ?? 0, nome: t.nome ?? "" })),
    ordem: i.ordem ?? 0,
  };
}

type PedidoCru = Partial<Omit<PedidoDaEscola, "status" | "alunoNome" | "pagoEm" | "itens" | "cobranca">> & {
  status?: string;
  alunoNome?: string | null;
  pagoEm?: string | null;
  itens?: Partial<ItemDoPedido>[];
  cobranca?: { id?: string; status?: string; asaasInvoiceUrl?: string } | null;
};

function pedido(p: PedidoCru): PedidoDaEscola {
  return {
    id: String(p.id ?? ""),
    numero: p.numero ?? 0,
    nomeDoResponsavel: p.nomeDoResponsavel ?? "",
    alunoNome: p.alunoNome ?? null,
    total: p.total ?? 0,
    status: statusDoPedido(p.status),
    criadoEm: p.criadoEm ?? "",
    pagoEm: p.pagoEm ?? null,
    itens: (p.itens ?? []).map((i) => ({
      nome: i.nome ?? "",
      quantidade: i.quantidade ?? 1,
      precoUnitario: i.precoUnitario ?? 0,
    })),
    cobranca: p.cobranca
      ? { id: String(p.cobranca.id ?? ""), status: p.cobranca.status ?? "", asaasInvoiceUrl: p.cobranca.asaasInvoiceUrl ?? null }
      : null,
  };
}

// ------------------------------------------------------------------ itens

export function useItensDaLoja(ativos: boolean | null = null) {
  return useQuery({
    queryKey: [...LOJA, "itens", ativos],
    staleTime: 15_000,
    queryFn: async (): Promise<ItemDaLoja[]> => {
      const lista = await relacionamentoJson<ItemCru[] | null>(
        `/loja/itens${ativos === null ? "" : `?ativos=${ativos}`}`,
        {},
        "Não foi possível carregar os itens da loja."
      );
      return (lista ?? []).map(item).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
    },
  });
}

/**
 * Foto de um item pelo lado da escola. O componente de foto guarda a imagem em cache por id;
 * por isso o id que ele recebe pode vir com "~versão" (mudou a foto, mudou a chave) e aqui a
 * versão é descartada.
 */
export const baixarFotoDoItem: BaixarFoto = async (itemId: string, variante: VarianteDaFoto) => {
  const res = await relacionamentoFetch(`/loja/itens/${itemId.split("~")[0]}/foto${consulta({ variante })}`);
  if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível carregar a foto."));
  return res.blob();
};

export function useCriarItemDaLoja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: SalvarItemDaLoja): Promise<ItemDaLoja> =>
      item(
        (await relacionamentoJson<ItemCru | null>(
          "/loja/itens",
          { method: "POST", body: JSON.stringify(dados) },
          "Não foi possível criar o item."
        )) ?? {}
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

export function useEditarItemDaLoja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: SalvarItemDaLoja }) =>
      relacionamentoJson<void>(
        `/loja/itens/${id}`,
        { method: "PUT", body: JSON.stringify(dados) },
        "Não foi possível salvar o item."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

export function useEnviarFotoDoItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
      relacionamentoUpload<void>(`/loja/itens/${id}/foto`, "arquivo", arquivo, "Não foi possível enviar a foto."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

export function useAlternarItemDaLoja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativar }: { id: string; ativar: boolean }) =>
      relacionamentoJson<void>(
        `/loja/itens/${id}/${ativar ? "ativar" : "desativar"}`,
        { method: "POST" },
        ativar ? "Não foi possível ativar o item." : "Não foi possível desativar o item."
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

export function useExcluirItemDaLoja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/loja/itens/${id}`, { method: "DELETE" }, "Não foi possível excluir o item."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

// ------------------------------------------------------------------ pedidos

export function usePedidosDaLoja(filtro: FiltroDePedidos) {
  return useQuery({
    queryKey: [...LOJA, "pedidos", filtro.status, filtro.de, filtro.ate],
    staleTime: 15_000,
    queryFn: async (): Promise<PedidoDaEscola[]> => {
      const lista = await relacionamentoJson<PedidoCru[] | null>(
        `/loja/pedidos${consulta({ status: filtro.status, de: filtro.de, ate: filtro.ate })}`,
        {},
        "Não foi possível carregar os pedidos."
      );
      return (lista ?? []).map(pedido);
    },
  });
}

export function useEntregarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/loja/pedidos/${id}/entregar`, { method: "POST" }, "Não foi possível marcar como entregue."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOJA }),
  });
}

export function useCancelarPedidoDaEscola() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      relacionamentoJson<void>(`/loja/pedidos/${id}/cancelar`, { method: "POST" }, "Não foi possível cancelar o pedido."),
    // Cancelar devolve o estoque e cancela a cobrança: a aba de Pagamentos também muda.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LOJA });
      return queryClient.invalidateQueries({ queryKey: ["relacionamento", "pagamentos"] });
    },
  });
}
