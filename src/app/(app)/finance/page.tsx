"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { cn } from "@/lib/utils";
import { useFinancialSeries } from "@/lib/finance/use-financial-projection";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default function FluxoDeCaixaPage() {
  const now = useMemo(() => new Date(), []);
  const [months] = useState(6);

  // últimos `months` incluindo o atual, então avança 1 mês além (projeção)
  const startMonth = now.getMonth() + 1;
  const startYear = now.getFullYear();
  const start = new Date(startYear, startMonth - 1 - (months - 2), 1);

  const { data: series, isLoading, isError } = useFinancialSeries(
    start.getMonth() + 1,
    start.getFullYear(),
    months
  );

  const totals = (series ?? []).reduce(
    (acc, m) => ({
      entradas: acc.entradas + m.totalReceitasRecebidas,
      saidas: acc.saidas + m.totalDespesasPagas,
    }),
    { entradas: 0, saidas: 0 }
  );
  const saldoProjetado = (series ?? []).reduce((s, m) => s + m.saldo, 0);

  const maxValue = Math.max(1, ...(series ?? []).flatMap((m) => [m.totalReceitas, m.totalDespesas]));

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Fluxo de caixa"
        apoio={
          <>
            Últimos <span className="font-mono tabular-nums">{months}</span> meses — meses futuros são projeção.
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o fluxo de caixa.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Entradas (recebido)</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-success-soft-foreground">
            {formatCurrency(totals.entradas)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Saídas (pago)</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
            {formatCurrency(totals.saidas)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Saldo projetado</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
            {formatCurrency(saldoProjetado)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-[18px] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-[15.5px] font-semibold">Entradas x Saídas por mês</h2>
          <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-chart-1" />
              Receitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-chart-2" />
              Despesas
            </span>
          </div>
        </div>

        {isLoading && <Skeleton className="mt-5 h-48 w-full" />}

        {!isLoading && (
          <div className="mt-5 flex items-end justify-between gap-2 overflow-x-auto pb-2 md:justify-start md:gap-6">
            {series?.map((m) => {
              const isProjection = m.ano > now.getFullYear() || (m.ano === now.getFullYear() && m.mes > now.getMonth() + 1);
              return (
                <div key={`${m.ano}-${m.mes}`} className="flex flex-col items-center gap-2">
                  <div className="flex h-[150px] items-end gap-1.5">
                    <div
                      className={cn("w-3 rounded-t-[5px] bg-chart-1", isProjection && "opacity-40")}
                      style={{ height: `${(m.totalReceitas / maxValue) * 100}%` }}
                      title={`Receitas: ${formatCurrency(m.totalReceitas)}`}
                    />
                    <div
                      className={cn("w-3 rounded-t-[5px] bg-chart-2", isProjection && "opacity-40")}
                      style={{ height: `${(m.totalDespesas / maxValue) * 100}%` }}
                      title={`Despesas: ${formatCurrency(m.totalDespesas)}`}
                    />
                  </div>
                  <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    {MONTH_NAMES[m.mes - 1]}
                    {isProjection && "*"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          * mês atual/futuro = projeção (opacidade reduzida)
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="font-heading text-[15.5px] font-semibold">Resumo mensal</h2>

        {/* md+: linhas de tabela com cabeçalho de coluna do guia. Celular: lista de cartões. */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-border bg-muted/40 px-[18px] py-3 text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase md:grid">
            <span>Mês</span>
            <span className="text-right">Entradas</span>
            <span className="text-right">Saídas</span>
            <span className="text-right">Saldo</span>
          </div>

          {series?.map((m) => (
            <div
              key={`${m.ano}-${m.mes}-resumo`}
              className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-border px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] md:items-center md:gap-3 md:px-[18px]"
            >
              <span className="font-mono font-semibold tabular-nums">
                {MONTH_NAMES[m.mes - 1]}/{m.ano}
              </span>
              <span className="text-right font-mono whitespace-nowrap tabular-nums text-success-soft-foreground">
                +{formatCurrency(m.totalReceitasRecebidas)}
              </span>
              <span className="font-mono whitespace-nowrap tabular-nums text-destructive-soft-foreground md:text-right">
                -{formatCurrency(m.totalDespesasPagas)}
              </span>
              <span className="text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                {formatCurrency(m.saldo)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
