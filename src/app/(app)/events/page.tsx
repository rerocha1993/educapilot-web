"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EventsNav } from "@/components/events/events-nav";
import { useSalesGroups } from "@/lib/events/use-sales-groups";
import { useAllProducts } from "@/lib/events/use-products";
import { useOrders } from "@/lib/events/use-orders";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EventsDashboardPage() {
  const { data: groups, isLoading: loadingGroups } = useSalesGroups();
  const { data: products, isLoading: loadingProducts } = useAllProducts();
  const { data: orders, isLoading: loadingOrders, isError } = useOrders();

  const isLoading = loadingGroups || loadingProducts || loadingOrders;

  const pedidosPagos = orders?.filter((o) => o.statusPayment === 2) ?? [];
  const pedidosAguardando = orders?.filter((o) => o.statusPayment === 1) ?? [];
  const vendasConfirmadas = pedidosPagos.reduce((s, o) => s + o.valorTotal, 0);
  const ticketMedio = pedidosPagos.length > 0 ? vendasConfirmadas / pedidosPagos.length : 0;

  const productGroupMap = new Map((products ?? []).map((p) => [p.id, p.salesGroupId]));
  const productPriceMap = new Map((products ?? []).map((p) => [p.id, p.preco]));

  const groupTotals = (groups ?? []).map((g) => {
    const arrecadado = pedidosPagos.reduce((sum, order) => {
      const orderGroupTotal = order.produtos
        .filter((item) => productGroupMap.get(item.productId) === g.id)
        .reduce((s, item) => s + (productPriceMap.get(item.productId) ?? 0) * item.quantidade, 0);
      return sum + orderGroupTotal;
    }, 0);
    const pct = g.meta && g.meta > 0 ? Math.min(100, Math.round((arrecadado / g.meta) * 100)) : null;
    return { ...g, arrecadado, pct };
  });

  const estoqueBaixo = (products ?? []).filter((p) => p.ativo && p.estoque !== null && p.estoque <= 5);

  return (
    <div className="flex flex-col gap-4">
      <EventsNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Dashboard de vendas</h1>
        <p className="text-sm text-muted-foreground">
          Não existe conceito de &quot;evento&quot; (nome, prazo, status) no backend —
          este painel soma tudo que já foi vendido no tenant, sem recorte por campanha.
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os dados de vendas.
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-success-border bg-success-soft p-4">
              <p className="text-xs text-success-soft-foreground">Vendas confirmadas</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-success-soft-foreground">
                {formatCurrency(vendasConfirmadas)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pedidos pagos</p>
              <p className="font-mono text-xl font-semibold tabular-nums">{pedidosPagos.length}</p>
            </div>
            <div className="rounded-lg border border-warning-border bg-warning-soft p-4">
              <p className="text-xs text-warning-soft-foreground">Aguardando Pix</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-warning-soft-foreground">
                {pedidosAguardando.length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ticket médio</p>
              <p className="font-mono text-xl font-semibold tabular-nums">{formatCurrency(ticketMedio)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 font-heading text-sm font-semibold">Vendas por grupo</h2>
              <div className="flex flex-col gap-3">
                {groupTotals.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum grupo de venda cadastrado.</p>
                )}
                {groupTotals.map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{g.nome}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(g.arrecadado)}
                        {g.meta ? ` de ${formatCurrency(g.meta)}` : ""}
                      </span>
                    </div>
                    {g.pct !== null && <Progress value={g.pct} className="mt-1" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="mb-3 font-heading text-sm font-semibold">Pendências</h2>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>{pedidosAguardando.length} pedido(s) aguardando pagamento</li>
                <li>
                  {estoqueBaixo.length} produto(s) com estoque baixo (≤5)
                  {estoqueBaixo.length === 0 && products?.every((p) => p.estoque === null)
                    ? " — nenhum produto tem estoque controlado"
                    : ""}
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        &quot;Pré-pedidos sem confirmação&quot; (painel de Pendências do wireframe) não
        existe como conceito no backend — todo pedido criado já é um pedido de
        verdade, não há rascunho.
      </p>
    </div>
  );
}
