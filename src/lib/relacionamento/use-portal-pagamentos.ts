import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { responsavelFetch, responsavelJson } from "@/lib/reception/api-responsavel";
import { consulta, mensagemDeErro, type BaixarFoto, type VarianteDaFoto } from "./api";

/**
 * Pagamentos e Loja do portal das famílias (2026-10) — /api/Responsavel/pagamentos e /loja.
 *
 * O servidor omite o que é nulo: tudo opcional passa por normalizador. Este arquivo também guarda o
 * formato do "o que a família vê", porque a tela de Pagamentos da escola (aba "Por família")
 * recebe exatamente o mesmo corpo e reaproveita estes tipos e o normalizador.
 */

const CHAVE = ["responsavel", "portal"] as const;

// ------------------------------------------------------------------ vocabulário

export type TipoDePagamento = "Mensalidade" | "Projeto" | "Cobranca" | "Loja";
export type StatusDoPagamento = "Pendente" | "Vencida" | "Paga";

/** Como o tipo aparece para a família (Projeto é a festa, o passeio). */
export const ROTULO_DO_TIPO_DE_PAGAMENTO: Record<TipoDePagamento, string> = {
  Mensalidade: "Mensalidade",
  Projeto: "Festa/Projeto",
  Cobranca: "Cobrança",
  Loja: "Loja",
};

export const TIPOS_DE_PAGAMENTO = ["Mensalidade", "Projeto", "Cobranca", "Loja"] as const;

export function tipoDePagamento(v: string | null | undefined): TipoDePagamento {
  return (TIPOS_DE_PAGAMENTO as readonly string[]).includes(v ?? "") ? (v as TipoDePagamento) : "Cobranca";
}

function statusDoPagamento(v: string | null | undefined): StatusDoPagamento {
  return v === "Paga" || v === "Vencida" ? v : "Pendente";
}

export const CATEGORIAS_DA_LOJA = ["Material", "Taxa", "Uniforme", "Livro", "Outro"] as const;
export type CategoriaDaLoja = (typeof CATEGORIAS_DA_LOJA)[number];

export const ROTULO_DA_CATEGORIA: Record<CategoriaDaLoja, string> = {
  Material: "Material",
  Taxa: "Taxa",
  Uniforme: "Uniforme",
  Livro: "Livro",
  Outro: "Outro",
};

export function categoriaDaLoja(v: string | null | undefined): CategoriaDaLoja {
  return (CATEGORIAS_DA_LOJA as readonly string[]).includes(v ?? "") ? (v as CategoriaDaLoja) : "Outro";
}

export const STATUS_DO_PEDIDO = ["AguardandoPagamento", "Pago", "Entregue", "Cancelado"] as const;
export type StatusDoPedido = (typeof STATUS_DO_PEDIDO)[number];

export const ROTULO_DO_STATUS_DO_PEDIDO: Record<StatusDoPedido, string> = {
  AguardandoPagamento: "Aguardando pagamento",
  Pago: "Pago",
  Entregue: "Entregue",
  Cancelado: "Cancelado",
};

export function statusDoPedido(v: string | null | undefined): StatusDoPedido {
  return (STATUS_DO_PEDIDO as readonly string[]).includes(v ?? "") ? (v as StatusDoPedido) : "AguardandoPagamento";
}

// ------------------------------------------------------------------ tipos

export interface ItemDePagamento {
  tipo: TipoDePagamento;
  /** Guid (texto). */
  id: string;
  descricao: string;
  alunoNome: string | null;
  valor: number;
  /** yyyy-MM-dd */
  vencimento: string;
  status: StatusDoPagamento;
  /** yyyy-MM-dd */
  pagoEm: string | null;
  linkDePagamento: string | null;
  pixCopiaECola: string | null;
  pixQrCodeBase64: string | null;
  boletoUrl: string | null;
  formaDePagamento: string | null;
}

export interface ResumoDosPagamentos {
  totalEmAberto: number;
  quantidadeEmAberto: number;
  vencidas: number;
}

export interface PagamentosDaFamilia {
  resumo: ResumoDosPagamentos;
  emAberto: ItemDePagamento[];
  pagos: ItemDePagamento[];
}

export interface ItemDaLojaDaFamilia {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: CategoriaDaLoja;
  preco: number;
  /** Nulo = sem limite. */
  estoque: number | null;
  temFoto: boolean;
  turmas: string[];
}

export interface ItemDoPedido {
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export interface PedidoDaFamilia {
  id: string;
  numero: number;
  total: number;
  status: StatusDoPedido;
  /** Instante UTC. */
  criadoEm: string;
  itens: ItemDoPedido[];
  pagamento: ItemDePagamento | null;
}

export interface NovoPedido {
  studentId: number | null;
  itens: { itemId: string; quantidade: number }[];
  observacao: string;
}

export interface PedidoCriado {
  pedido: { id: string; numero: number; total: number; status: StatusDoPedido };
  pagamento: ItemDePagamento | null;
}

// ------------------------------------------------------------------ normalização

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

export type ItemDePagamentoCru = Partial<Omit<ItemDePagamento, "tipo" | "status">> & {
  tipo?: string;
  status?: string;
};

export function itemDePagamento(i: ItemDePagamentoCru): ItemDePagamento {
  return {
    tipo: tipoDePagamento(i.tipo),
    id: String(i.id ?? ""),
    descricao: i.descricao ?? "",
    alunoNome: i.alunoNome ?? null,
    valor: i.valor ?? 0,
    vencimento: dia(i.vencimento) ?? "",
    status: statusDoPagamento(i.status),
    pagoEm: dia(i.pagoEm),
    linkDePagamento: i.linkDePagamento ?? null,
    pixCopiaECola: i.pixCopiaECola ?? null,
    pixQrCodeBase64: i.pixQrCodeBase64 ?? null,
    boletoUrl: i.boletoUrl ?? null,
    formaDePagamento: i.formaDePagamento ?? null,
  };
}

export interface PagamentosDaFamiliaCru {
  resumo?: Partial<ResumoDosPagamentos>;
  emAberto?: ItemDePagamentoCru[];
  pagos?: ItemDePagamentoCru[];
}

export function pagamentosDaFamilia(r: PagamentosDaFamiliaCru | null | undefined): PagamentosDaFamilia {
  const emAberto = (r?.emAberto ?? []).map(itemDePagamento);
  return {
    resumo: {
      totalEmAberto: r?.resumo?.totalEmAberto ?? emAberto.reduce((s, i) => s + i.valor, 0),
      quantidadeEmAberto: r?.resumo?.quantidadeEmAberto ?? emAberto.length,
      vencidas: r?.resumo?.vencidas ?? emAberto.filter((i) => i.status === "Vencida").length,
    },
    emAberto,
    pagos: (r?.pagos ?? []).map(itemDePagamento),
  };
}

function itemDaLoja(i: Partial<Omit<ItemDaLojaDaFamilia, "categoria">> & { categoria?: string }): ItemDaLojaDaFamilia {
  return {
    id: i.id ?? "",
    nome: i.nome ?? "",
    descricao: i.descricao ?? null,
    categoria: categoriaDaLoja(i.categoria),
    preco: i.preco ?? 0,
    estoque: i.estoque ?? null,
    temFoto: i.temFoto ?? false,
    turmas: i.turmas ?? [],
  };
}

type PedidoCru = Partial<Omit<PedidoDaFamilia, "status" | "pagamento" | "itens">> & {
  status?: string;
  itens?: Partial<ItemDoPedido>[];
  pagamento?: ItemDePagamentoCru | null;
};

function pedido(p: PedidoCru): PedidoDaFamilia {
  return {
    id: p.id ?? "",
    numero: p.numero ?? 0,
    total: p.total ?? 0,
    status: statusDoPedido(p.status),
    criadoEm: p.criadoEm ?? "",
    itens: (p.itens ?? []).map((i) => ({
      nome: i.nome ?? "",
      quantidade: i.quantidade ?? 1,
      precoUnitario: i.precoUnitario ?? 0,
    })),
    pagamento: p.pagamento ? itemDePagamento(p.pagamento) : null,
  };
}

// ------------------------------------------------------------------ pagamentos

/**
 * O que a família deve e já pagou. O badge da barra de baixo vem daqui: cinco minutos de cache,
 * sem atualização por tempo, para a barra não pesar a cada tela.
 */
export function usePagamentosDoPortal(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE, "pagamentos", "lista"],
    enabled: habilitado,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PagamentosDaFamilia> =>
      pagamentosDaFamilia(
        await responsavelJson<PagamentosDaFamiliaCru | null>(
          "/pagamentos",
          {},
          "Não foi possível carregar seus pagamentos."
        )
      ),
  });
}

export function usePagamentoDoPortal(tipo: string, id: string) {
  return useQuery({
    queryKey: [...CHAVE, "pagamentos", "detalhe", tipo, id],
    enabled: !!tipo && !!id,
    queryFn: async () =>
      itemDePagamento(
        (await responsavelJson<ItemDePagamentoCru | null>(
          `/pagamentos/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`,
          {},
          "Não foi possível abrir este pagamento."
        )) ?? {}
      ),
  });
}

// ------------------------------------------------------------------ loja

export function useLojaDoPortal() {
  return useQuery({
    queryKey: [...CHAVE, "loja", "itens"],
    queryFn: async (): Promise<ItemDaLojaDaFamilia[]> => {
      const lista = await responsavelJson<
        (Partial<Omit<ItemDaLojaDaFamilia, "categoria">> & { categoria?: string })[] | null
      >("/loja", {}, "Não foi possível carregar a loja.");
      return (lista ?? []).map(itemDaLoja);
    },
  });
}

/** Foto de um item da loja, pelo lado dos pais. O id que o componente de foto passa é o do item. */
export const baixarFotoDoItemDaFamilia: BaixarFoto = async (itemId: string, variante: VarianteDaFoto) => {
  const res = await responsavelFetch(`/loja/itens/${itemId.split("~")[0]}/foto${consulta({ variante })}`);
  if (!res.ok) throw new Error(await mensagemDeErro(res, "Não foi possível carregar a foto."));
  return res.blob();
};

export function usePedidosDoPortal() {
  return useQuery({
    queryKey: [...CHAVE, "loja", "pedidos"],
    queryFn: async (): Promise<PedidoDaFamilia[]> => {
      const lista = await responsavelJson<PedidoCru[] | null>("/loja/pedidos", {}, "Não foi possível carregar seus pedidos.");
      return (lista ?? []).map(pedido);
    },
  });
}

export function useCriarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: NovoPedido): Promise<PedidoCriado> => {
      const r = await responsavelJson<{
        pedido?: { id?: string; numero?: number; total?: number; status?: string };
        pagamento?: ItemDePagamentoCru | null;
      } | null>(
        "/loja/pedidos",
        {
          method: "POST",
          body: JSON.stringify({
            studentId: dados.studentId ?? undefined,
            itens: dados.itens,
            observacao: dados.observacao.trim() || undefined,
          }),
        },
        "Não foi possível fazer o pedido."
      );
      return {
        pedido: {
          id: r?.pedido?.id ?? "",
          numero: r?.pedido?.numero ?? 0,
          total: r?.pedido?.total ?? 0,
          status: statusDoPedido(r?.pedido?.status),
        },
        pagamento: r?.pagamento ? itemDePagamento(r.pagamento) : null,
      };
    },
    // O pedido gera uma cobrança (badge de Pagamentos) e baixa o estoque (lista da loja).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useCancelarPedidoDoPortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      responsavelJson<void>(`/loja/pedidos/${id}/cancelar`, { method: "POST" }, "Não foi possível cancelar o pedido."),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
}
