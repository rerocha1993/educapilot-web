"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ShoppingBag, Wallet } from "lucide-react";

import { CartaoDePagamento, ChipDoTipoDePagamento } from "@/components/relacionamento/portal/pagamentos";
import { ErroDoPortal, SecaoDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { dataLocalIso } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  TIPOS_DE_PAGAMENTO,
  usePagamentosDoPortal,
  type ItemDePagamento,
  type PagamentosDaFamilia,
} from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

/** O que já foi pago aparece até um ano para trás; mais velho que isso é arquivo, não conta. */
function limiteDosPagos(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return dataLocalIso(d);
}

function detalheDe(i: ItemDePagamento): string {
  return `/responsavel/pagamentos/${encodeURIComponent(i.tipo)}/${encodeURIComponent(i.id)}`;
}

/** Pagamentos da família: o que está em aberto, agrupado por tipo, e o que já foi pago. */
export default function PagamentosDoResponsavelPage() {
  const { data, isLoading, isError, refetch } = usePagamentosDoPortal();
  const [mostrarPagos, setMostrarPagos] = useState(false);

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Pagamentos</h1>

      {isLoading && (
        <>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar seus pagamentos." onTentar={() => refetch()} />}

      {data && <Conteudo dados={data} mostrarPagos={mostrarPagos} onAlternarPagos={() => setMostrarPagos((v) => !v)} />}
    </>
  );
}

function Conteudo({
  dados,
  mostrarPagos,
  onAlternarPagos,
}: {
  dados: PagamentosDaFamilia;
  mostrarPagos: boolean;
  onAlternarPagos: () => void;
}) {
  const { resumo, emAberto } = dados;
  const limite = limiteDosPagos();
  const pagos = dados.pagos.filter((p) => (p.pagoEm ?? p.vencimento) >= limite);

  return (
    <>
      <section
        aria-label="Resumo"
        className={cn(
          "flex flex-col gap-1 rounded-xl border p-4",
          resumo.vencidas > 0 ? "border-destructive-border bg-destructive-soft" : "border-border bg-card"
        )}
      >
        {resumo.quantidadeEmAberto === 0 ? (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success-soft text-success-soft-foreground">
              <CheckCircle2 aria-hidden className="size-5" />
            </span>
            <div>
              <p className="font-heading text-[17px] font-semibold">Tudo em dia</p>
              <p className="text-[13px] text-muted-foreground">Você não tem nenhum pagamento em aberto.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase">Em aberto</p>
            <p className="font-mono text-[28px] leading-tight font-semibold tabular-nums">{formatarMoeda(resumo.totalEmAberto)}</p>
            <p className="text-[13px] text-muted-foreground">
              {resumo.quantidadeEmAberto} {resumo.quantidadeEmAberto === 1 ? "pagamento" : "pagamentos"}
            </p>
            {resumo.vencidas > 0 && (
              <p role="status" className="text-[13.5px] font-semibold text-destructive">
                {resumo.vencidas} {resumo.vencidas === 1 ? "vencida" : "vencidas"}.
              </p>
            )}
          </>
        )}
      </section>

      {emAberto.length > 0 && (
        <div className="flex flex-col gap-4">
          {TIPOS_DE_PAGAMENTO.map((tipo) => {
            const doTipo = emAberto.filter((i) => i.tipo === tipo);
            if (doTipo.length === 0) return null;
            return (
              <section key={tipo} aria-label={`Em aberto: ${tipo}`} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold">
                  <ChipDoTipoDePagamento tipo={tipo} />
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {doTipo.length} {doTipo.length === 1 ? "pagamento" : "pagamentos"}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {doTipo.map((i) => (
                    <li key={`${i.tipo}-${i.id}`}>
                      <CartaoDePagamento item={i} href={detalheDe(i)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {emAberto.length === 0 && pagos.length === 0 && (
        <VazioDoPortal icone={<Wallet />} titulo="Nenhum pagamento por enquanto" texto="Mensalidades, passeios e pedidos da loja aparecem aqui." />
      )}

      <SecaoDoPortal titulo="Pagos">
        <button
          type="button"
          aria-expanded={mostrarPagos}
          aria-controls="lista-de-pagos"
          onClick={onAlternarPagos}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 text-left text-[14px] font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span>
            Últimos 12 meses <span className="text-muted-foreground">({pagos.length})</span>
          </span>
          <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform", mostrarPagos && "rotate-180")} />
        </button>
        {mostrarPagos &&
          (pagos.length === 0 ? (
            <p id="lista-de-pagos" className="text-[13px] text-muted-foreground">
              Nenhum pagamento nos últimos 12 meses.
            </p>
          ) : (
            <ul id="lista-de-pagos" className="flex flex-col gap-2">
              {pagos.map((i) => (
                <li key={`${i.tipo}-${i.id}`}>
                  <CartaoDePagamento item={i} href={detalheDe(i)} />
                </li>
              ))}
            </ul>
          ))}
      </SecaoDoPortal>

      <Link
        href="/responsavel/loja/pedidos"
        className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[14px] font-semibold text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ShoppingBag aria-hidden className="size-4" />
        Meus pedidos da loja
      </Link>
    </>
  );
}
