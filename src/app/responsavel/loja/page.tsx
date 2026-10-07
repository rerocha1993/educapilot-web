"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ShoppingCart } from "lucide-react";

import { CartaoDoItem, DialogDoPedido, maximoDoItem } from "@/components/relacionamento/portal/loja";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarMoeda } from "@/lib/rh/formatar";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";
import {
  CATEGORIAS_DA_LOJA,
  ROTULO_DA_CATEGORIA,
  useLojaDoPortal,
  type CategoriaDaLoja,
} from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

const TODAS = "todas";

/** Loja da escola: itens por categoria, carrinho fixo no rodapé e o pedido em um diálogo. */
export default function LojaDoResponsavelPage() {
  const { data: itens, isLoading, isError, refetch } = useLojaDoPortal();
  const { data: inicio } = useInicioDoPortal();
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [fechando, setFechando] = useState(false);

  const categorias = useMemo(() => {
    const presentes = new Set((itens ?? []).map((i) => i.categoria));
    return [
      { id: TODAS, rotulo: "Tudo" },
      ...CATEGORIAS_DA_LOJA.filter((c: CategoriaDaLoja) => presentes.has(c)).map((c) => ({ id: c as string, rotulo: ROTULO_DA_CATEGORIA[c] })),
    ];
  }, [itens]);

  const visiveis = (itens ?? []).filter((i) => categoria === TODAS || i.categoria === categoria);

  // Item que saiu da loja (ou esgotou) enquanto estava no carrinho some da conta: o servidor confere de novo.
  const linhas = (itens ?? [])
    .map((item) => ({ item, quantidade: Math.min(carrinho[item.id] ?? 0, maximoDoItem(item)) }))
    .filter((l) => l.quantidade > 0);
  const totalDeItens = linhas.reduce((s, l) => s + l.quantidade, 0);
  const total = linhas.reduce((s, l) => s + l.item.preco * l.quantidade, 0);

  function mudar(id: string, quantidade: number) {
    setCarrinho((atual) => {
      const novo = { ...atual };
      if (quantidade <= 0) delete novo[id];
      else novo[id] = quantidade;
      return novo;
    });
  }

  return (
    <div className={cn("flex flex-col gap-4", totalDeItens > 0 && "pb-20")}>
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Loja</h1>
        <Link
          href="/responsavel/loja/pedidos"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ShoppingBag aria-hidden className="size-4" />
          Meus pedidos
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar a loja." onTentar={() => refetch()} />}

      {itens && itens.length === 0 && (
        <VazioDoPortal
          icone={<ShoppingBag />}
          titulo="A loja está vazia por enquanto"
          texto="Material, taxas e uniforme da escola aparecem aqui quando estiverem à venda."
        />
      )}

      {itens && itens.length > 0 && (
        <>
          {categorias.length > 2 && (
            <div className="-mx-4 overflow-x-auto px-4 pb-0.5">
              <Segmentado rotulo="Categoria" opcoes={categorias} valor={categoria} onChange={setCategoria} />
            </div>
          )}

          <ul className="grid grid-cols-2 gap-3">
            {visiveis.map((item) => (
              <li key={item.id}>
                <CartaoDoItem item={item} quantidade={carrinho[item.id] ?? 0} onMudar={(q) => mudar(item.id, q)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {totalDeItens > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1" role="status">
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <ShoppingCart aria-hidden className="size-4" />
                {totalDeItens} {totalDeItens === 1 ? "item" : "itens"} no carrinho
              </p>
              <p className="font-mono text-[17px] font-semibold tabular-nums">{formatarMoeda(total)}</p>
            </div>
            <Button variant="action" className="h-11 px-4 text-sm" onClick={() => setFechando(true)}>
              Pedir e pagar
            </Button>
          </div>
        </div>
      )}

      {fechando && (
        <DialogDoPedido
          linhas={linhas}
          filhos={inicio?.alunos ?? []}
          onFechar={() => setFechando(false)}
          onConcluido={() => setCarrinho({})}
        />
      )}
    </div>
  );
}
