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
import {
  useOrders,
  useFinalizarPedido,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
} from "@/lib/events/use-orders";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

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
    <div className="flex flex-col gap-4">
      <EventsNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            {orders ? `${orders.length} no total` : "—"}
          </p>
        </div>
        <Link href="/events/pedidos/novo" className={buttonVariants({})}>
          + Novo pedido
        </Link>
      </div>

      <div className="flex gap-1">
        {[
          { key: "todos" as const, label: `Todos (${orders?.length ?? 0})` },
          { key: "aguardando" as const, label: `Aguardando Pix (${aguardando.length})` },
          { key: "pagos" as const, label: `Pagos (${pagos.length})` },
        ].map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFiltro(chip.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === chip.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os pedidos.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
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
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum pedido.
                </TableCell>
              </TableRow>
            )}
            {list.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.nomeCliente}</TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{o.produtos.length}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatCurrency(o.valorTotal)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.formaPagamento}</TableCell>
                <TableCell>
                  <Badge className={(o.statusPayment != null ? PAYMENT_STATUS_BADGE[o.statusPayment] : undefined) ?? ""}>
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
