"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventsNav } from "@/components/events/events-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { useOrders, useFinalizarPedido, PAYMENT_STATUS_LABEL } from "@/lib/events/use-orders";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Situação do pagamento nas etiquetas do guia (aguardando, pago, cancelado).
const PAYMENT_STATUS_VARIANT: Record<number, "waiting" | "success" | "overdue"> = {
  1: "waiting",
  2: "success",
  3: "overdue",
};

type Filtro = "todos" | "aguardando" | "pagos";

export default function OrdersPage() {
  const { data: orders, isLoading, isError } = useOrders();
  const finalizarPedido = useFinalizarPedido();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const aguardando = orders?.filter((o) => o.statusPayment === 1) ?? [];
  const pagos = orders?.filter((o) => o.statusPayment === 2) ?? [];
  const list =
    filtro === "aguardando" ? aguardando : filtro === "pagos" ? pagos : orders ?? [];

  async function handleFinalizar(id: string) {
    try {
      await finalizarPedido.mutateAsync(id);
      toast.success("Pedido finalizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar pedido.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <EventsNav />

      <CabecalhoDaPagina
        eyebrow={<>Eventos &amp; vendas</>}
        titulo="Pedidos"
        apoio={
          orders ? (
            <>
              <span className="font-mono tabular-nums">{orders.length}</span> no total
            </>
          ) : (
            "—"
          )
        }
        acoes={
          <Link
            href="/events/pedidos/novo"
            className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}
          >
            + Novo pedido
          </Link>
        }
      />

      {/* Mesmas pílulas da sub-navegação: faixa cinza, item ativo branco com sombra leve. */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {[
            { key: "todos" as const, label: "Todos", count: orders?.length ?? 0 },
            { key: "aguardando" as const, label: "Aguardando Pix", count: aguardando.length },
            { key: "pagos" as const, label: "Pagos", count: pagos.length },
          ].map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFiltro(chip.key)}
              className={cn(
                "shrink-0 rounded-[9px] px-3.5 py-2 text-[13.5px] whitespace-nowrap transition-colors",
                filtro === chip.key
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label} (<span className="font-mono tabular-nums">{chip.count}</span>)
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os pedidos.
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {!isLoading && list.length === 0 && (
          <EstadoVazio icone={<Inbox />} titulo="Nenhum pedido." />
        )}
        {list.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium break-words">{o.nomeCliente}</p>
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                {formatCurrency(o.valorTotal)}
              </span>
            </div>
            <p className="text-muted-foreground">
              Itens: <span className="font-mono tabular-nums">{o.produtos.length}</span> · Pgto: {o.formaPagamento}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={
                  (o.statusPayment != null ? PAYMENT_STATUS_VARIANT[o.statusPayment] : undefined) ?? "waiting"
                }
              >
                {(o.statusPayment != null ? PAYMENT_STATUS_LABEL[o.statusPayment] : undefined) ?? "—"}
              </Badge>
              <Badge variant={o.status === "Finalizado" ? "default" : "secondary"}>{o.status}</Badge>
            </div>
            {o.status !== "Finalizado" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleFinalizar(o.id)}
                disabled={finalizarPedido.isPending}
              >
                Finalizar
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprador</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pgto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produção</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && list.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Inbox className="size-[18px]" />
                  </span>
                  <p className="mt-3 font-heading text-[15px] font-semibold">Nenhum pedido.</p>
                </TableCell>
              </TableRow>
            )}
            {list.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.nomeCliente}</TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{o.produtos.length}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                  {formatCurrency(o.valorTotal)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.formaPagamento}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      (o.statusPayment != null ? PAYMENT_STATUS_VARIANT[o.statusPayment] : undefined) ?? "waiting"
                    }
                  >
                    {(o.statusPayment != null ? PAYMENT_STATUS_LABEL[o.statusPayment] : undefined) ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={o.status === "Finalizado" ? "default" : "secondary"}>{o.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {o.status !== "Finalizado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFinalizar(o.id)}
                      disabled={finalizarPedido.isPending}
                    >
                      Finalizar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Status &quot;Expirado&quot; do wireframe não existe no backend (só Aguardando/
        Pago/Cancelado) — pedidos Pix não confirmados ficam como Aguardando
        indefinidamente. &quot;Produção&quot; é um status separado do backend (Em
        Produção/Finalizado) sem equivalente direto no wireframe, mostrado aqui pra não
        esconder informação real.
      </p>
    </div>
  );
}
