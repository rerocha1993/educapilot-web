"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceNav } from "@/components/finance/finance-nav";
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
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Fluxo de caixa</h1>
        <p className="text-sm text-muted-foreground">Últimos {months} meses — meses futuros são projeção.</p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o fluxo de caixa.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Entradas (recebido)</p>
          <p className="font-mono text-xl font-semibold tabular-nums">{formatCurrency(totals.entradas)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saídas (pago)</p>
          <p className="font-mono text-xl font-semibold tabular-nums">{formatCurrency(totals.saidas)}</p>
        </div>
        <div className="rounded-lg border border-success-border bg-success-soft p-4">
          <p className="text-xs text-success-soft-foreground">Saldo projetado</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-success-soft-foreground">
            {formatCurrency(saldoProjetado)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 font-heading text-sm font-semibold">Entradas x Saídas por mês</h2>

        {isLoading && <Skeleton className="h-48 w-full" />}

        {!isLoading && (
          <div className="flex items-end gap-4 overflow-x-auto pb-2">
            {series?.map((m) => {
              const isProjection = m.ano > now.getFullYear() || (m.ano === now.getFullYear() && m.mes > now.getMonth() + 1);
              return (
                <div key={`${m.ano}-${m.mes}`} className="flex flex-col items-center gap-1">
                  <div className="flex h-32 items-end gap-1">
                    <div
                      className={cn("w-4 rounded-t bg-primary", isProjection && "opacity-40")}
                      style={{ height: `${(m.totalReceitas / maxValue) * 100}%` }}
                      title={`Receitas: ${formatCurrency(m.totalReceitas)}`}
                    />
                    <div
                      className={cn("w-4 rounded-t bg-muted-foreground", isProjection && "opacity-40")}
                      style={{ height: `${(m.totalDespesas / maxValue) * 100}%` }}
                      title={`Despesas: ${formatCurrency(m.totalDespesas)}`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {MONTH_NAMES[m.mes - 1]}
                    {isProjection && "*"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-sm bg-primary align-middle" /> Receitas ·{" "}
          <span className="inline-block size-2 rounded-sm bg-muted-foreground align-middle" /> Despesas ·{" "}
          * mês atual/futuro = projeção (opacidade reduzida)
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-heading text-sm font-semibold">Resumo mensal</h2>
        <div className="flex flex-col gap-2">
          {series?.map((m) => (
            <div
              key={`${m.ano}-${m.mes}-resumo`}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
            >
              <span className="font-medium">
                {MONTH_NAMES[m.mes - 1]}/{m.ano}
              </span>
              <span className="font-mono tabular-nums text-success-soft-foreground">
                +{formatCurrency(m.totalReceitasRecebidas)}
              </span>
              <span className="font-mono tabular-nums text-destructive-soft-foreground">
                -{formatCurrency(m.totalDespesasPagas)}
              </span>
              <span className="font-mono font-semibold tabular-nums">{formatCurrency(m.saldo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
