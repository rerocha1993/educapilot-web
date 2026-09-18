"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EventsNav } from "@/components/events/events-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
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
    <div className="flex flex-col gap-[18px]">
      <EventsNav />

      <CabecalhoDaPagina
        eyebrow={<>Eventos &amp; vendas</>}
        titulo="Dashboard de vendas"
        apoio={
          <>
            Não existe conceito de &quot;evento&quot; (nome, prazo, status) no backend — este painel
            soma tudo que já foi vendido no tenant, sem recorte por campanha.
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os dados de vendas.
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && (
        <>
          {/* Estatística do guia: rótulo pequeno, número grande em mono. */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Vendas confirmadas</p>
              <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-success-soft-foreground">
                {formatCurrency(vendasConfirmadas)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Pedidos pagos</p>
              <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
                {pedidosPagos.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Aguardando Pix</p>
              <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-action">
                {pedidosAguardando.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Ticket médio</p>
              <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
                {formatCurrency(ticketMedio)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_260px]">
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <h2 className="font-heading text-[15.5px] font-semibold">Vendas por grupo</h2>
              <div className="mt-4 flex flex-col gap-3.5">
                {groupTotals.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum grupo de venda cadastrado.</p>
                )}
                {groupTotals.map((g) => (
                  <div key={g.id}>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm md:flex-nowrap md:gap-x-0">
                      <span className="min-w-0 font-medium break-words">{g.nome}</span>
                      <span className="font-mono whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatCurrency(g.arrecadado)}
                        {g.meta ? ` de ${formatCurrency(g.meta)}` : ""}
                      </span>
                    </div>
                    {/* Barra fina de 6px do guia — laranja quando ainda falta muito pra meta. */}
                    {g.pct !== null && (
                      <Progress
                        value={g.pct}
                        className={cn(
                          "mt-2 [&>[data-slot=progress-track]]:h-1.5",
                          g.pct < 50 && "[&_[data-slot=progress-indicator]]:bg-action"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-[18px]">
              <h2 className="font-heading text-[15.5px] font-semibold">Pendências</h2>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-mono tabular-nums">{pedidosAguardando.length}</span> pedido(s) aguardando
                  pagamento
                </li>
                <li>
                  <span className="font-mono tabular-nums">{estoqueBaixo.length}</span> produto(s) com estoque baixo
                  (≤<span className="font-mono tabular-nums">5</span>)
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
