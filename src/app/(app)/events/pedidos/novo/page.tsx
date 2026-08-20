"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EventsNav } from "@/components/events/events-nav";
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
    <div className="flex flex-col gap-4">
      <EventsNav />

      <div>
        <Link href="/events/pedidos" className="text-xs text-muted-foreground hover:underline">
          ← Pedidos
        </Link>
        <h1 className="font-heading text-xl font-bold">Novo pedido</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id, p.nome, p.preco)}
                className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="text-sm font-medium">{p.nome}</span>
                <span className="font-mono text-sm text-primary">{formatCurrency(p.preco)}</span>
              </button>
            ))}
            {!isLoading && filtered.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Comprador</Label>
            <Input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground">Carrinho vazio — clique num produto.</p>
            )}
            {cart.map((l) => (
              <div key={l.productId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-6"
                    onClick={() => changeQty(l.productId, -1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-4 text-center font-mono">{l.quantidade}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-6"
                    onClick={() => changeQty(l.productId, 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <span>{l.nome}</span>
                </div>
                <span className="font-mono tabular-nums">{formatCurrency(l.preco * l.quantidade)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between font-heading text-lg font-bold">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Pagamento</Label>
            <div className="flex gap-2">
              {(["Dinheiro", "Pix"] as const).map((forma) => (
                <button
                  key={forma}
                  onClick={() => setFormaPagamento(forma)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    formaPagamento === forma
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
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
            className="w-full"
            onClick={handleFinalizar}
            disabled={createOrder.isPending || !nomeCliente.trim() || cart.length === 0}
          >
            {createOrder.isPending ? "Criando..." : "Finalizar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
