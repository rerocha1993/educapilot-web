"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { ChipDoPedido } from "@/components/relacionamento/portal/loja";
import { AcoesDoPagamento } from "@/components/relacionamento/portal/pagamentos";
import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useCancelarPedidoDoPortal,
  usePedidosDoPortal,
  type PedidoDaFamilia,
} from "@/lib/relacionamento/use-portal-pagamentos";

/** Pedidos da família na loja: o que foi pedido, a situação e, enquanto não pago, como pagar ou cancelar. */
export default function PedidosDoResponsavelPage() {
  const { data, isLoading, isError, refetch } = usePedidosDoPortal();
  const [cancelando, setCancelando] = useState<PedidoDaFamilia | null>(null);

  return (
    <>
      <Link
        href="/responsavel/loja"
        className="-ml-2 inline-flex min-h-11 w-max items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden className="size-4" /> Loja
      </Link>

      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Meus pedidos</h1>

      {isLoading && (
        <>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar seus pedidos." onTentar={() => refetch()} />}

      {data && data.length === 0 && (
        <VazioDoPortal
          icone={<ShoppingBag />}
          titulo="Nenhum pedido ainda"
          texto="Quando você pedir pela loja, o pedido e o pagamento aparecem aqui."
        />
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {data.map((p) => (
            <li key={p.id}>
              <article className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-[15px] font-semibold">Pedido {p.numero}</p>
                    <p className="text-[13px] text-muted-foreground tabular-nums">{formatarData(p.criadoEm)}</p>
                  </div>
                  <ChipDoPedido status={p.status} />
                </div>

                <ul aria-label={`Itens do pedido ${p.numero}`} className="grid gap-0.5 text-sm">
                  {p.itens.map((i, n) => (
                    <li key={`${i.nome}-${n}`} className="flex justify-between gap-3">
                      <span className="min-w-0 break-words">
                        {i.quantidade}× {i.nome}
                      </span>
                      <span className="shrink-0 font-mono text-[13px] text-muted-foreground tabular-nums">
                        {formatarMoeda(i.quantidade * i.precoUnitario)}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="flex justify-between gap-3 border-t border-border pt-2 text-[15px] font-semibold">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatarMoeda(p.total)}</span>
                </p>

                {p.status === "AguardandoPagamento" && (
                  <>
                    {p.pagamento && <AcoesDoPagamento item={p.pagamento} />}
                    <Button variant="outline" className="h-11 self-start text-destructive" onClick={() => setCancelando(p)}>
                      Cancelar pedido
                    </Button>
                  </>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      {cancelando && <CancelarPedido pedido={cancelando} onFechar={() => setCancelando(null)} />}
    </>
  );
}

function CancelarPedido({ pedido: p, onFechar }: { pedido: PedidoDaFamilia; onFechar: () => void }) {
  const cancelar = useCancelarPedidoDoPortal();

  async function confirmar() {
    try {
      await cancelar.mutateAsync(p.id);
      toast.success(`Pedido ${p.numero} cancelado.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar o pedido.");
    }
  }

  return (
    <Confirmacao
      titulo="Cancelar este pedido?"
      descricao={`O pedido ${p.numero} (${formatarMoeda(p.total)}) é cancelado e a cobrança deixa de valer.`}
      rotuloConfirmar="Cancelar pedido"
      perigosa
      pendente={cancelar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}
