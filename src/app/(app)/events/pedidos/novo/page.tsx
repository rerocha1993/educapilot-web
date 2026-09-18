"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EventsNav } from "@/components/events/events-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { useAllProducts } from "@/lib/events/use-products";
import { useCreateOrder } from "@/lib/events/use-orders";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CartLine {
  productId: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function NovoPedidoPage() {
  const router = useRouter();
  const { data: products, isLoading } = useAllProducts();
  const createOrder = useCreateOrder();

  const carrinhoRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [nomeCliente, setNomeCliente] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"Pix" | "Dinheiro">("Dinheiro");

  const filtered = (products ?? []).filter(
    (p) => p.ativo && p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((s, l) => s + l.preco * l.quantidade, 0);

  function addToCart(productId: string, nome: string, preco: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantidade: l.quantidade + 1 } : l));
      }
      return [...prev, { productId, nome, preco, quantidade: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0)
    );
  }

  async function handleFinalizar() {
    if (!nomeCliente.trim() || cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        nomeCliente: nomeCliente.trim(),
        valorTotal: total,
        formaPagamento,
        produtos: cart.map((l) => ({ productId: l.productId, quantidade: l.quantidade })),
      });
      toast.success("Pedido criado.");
      router.push("/events/pedidos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <EventsNav />

      <CabecalhoDaPagina eyebrow="← Pedidos" eyebrowHref="/events/pedidos" titulo="Novo pedido" />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id, p.nome, p.preco)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="text-sm font-medium break-words">{p.nome}</span>
                <span className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums text-primary">
                  {formatCurrency(p.preco)}
                </span>
              </button>
            ))}
            {!isLoading && filtered.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>

        <div ref={carrinhoRef} className="flex scroll-mt-4 flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Comprador</Label>
            <Input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground">Carrinho vazio — clique num produto.</p>
            )}
            {cart.map((l) => (
              <div key={l.productId} className="flex items-center justify-between gap-2 text-sm md:gap-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-9 md:size-6"
                    onClick={() => changeQty(l.productId, -1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-4 text-center font-mono tabular-nums">{l.quantidade}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-9 md:size-6"
                    onClick={() => changeQty(l.productId, 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <span className="min-w-0 break-words">{l.nome}</span>
                </div>
                <span className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(l.preco * l.quantidade)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2.5">
            <div className="flex items-center justify-between font-heading text-lg font-semibold tracking-[-.03em]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Pagamento</Label>
            {/* Pílulas do guia: faixa cinza, escolhido em branco com sombra leve. */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(["Dinheiro", "Pix"] as const).map((forma) => (
                <button
                  key={forma}
                  onClick={() => setFormaPagamento(forma)}
                  className={cn(
                    "min-h-9 flex-1 rounded-[9px] px-3 py-2 text-[13.5px] transition-colors md:min-h-0",
                    formaPagamento === forma
                      ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {forma}
                </button>
              ))}
            </div>
            {formaPagamento === "Pix" && (
              <p className="text-xs text-muted-foreground">
                O pedido é criado normalmente, mas a geração de QR/copia-e-cola e a
                confirmação automática via webhook Asaas não estão conectadas ao pedido
                no backend hoje (dois caminhos desconectados) — o pagamento Pix precisa
                ser confirmado manualmente por fora, por enquanto.
              </p>
            )}
          </div>

          <Button
            variant="action"
            className="w-full"
            onClick={handleFinalizar}
            disabled={createOrder.isPending || !nomeCliente.trim() || cart.length === 0}
          >
            {createOrder.isPending ? "Criando..." : "Finalizar pedido"}
          </Button>
        </div>
      </div>

      {/* Celular: a lista de produtos empurra o carrinho para baixo, então o total e o botão de
          finalizar ficam presos acima da barra de abas; tocar no total rola até o carrinho. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-md md:hidden">
        <button
          type="button"
          onClick={() => carrinhoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 text-left font-heading font-semibold tracking-[-.03em]"
        >
          <span>Total</span>
          <span className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(total)}</span>
        </button>
        <Button
          variant="action"
          onClick={handleFinalizar}
          disabled={createOrder.isPending || !nomeCliente.trim() || cart.length === 0}
        >
          {createOrder.isPending ? "Criando..." : "Finalizar pedido"}
        </Button>
      </div>
    </div>
  );
}
