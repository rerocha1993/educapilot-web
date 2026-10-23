import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TotalDaFaixa {
  chave: string;
  rotulo: string;
  /** Valor já formatado (moeda). */
  valor: string;
  /** Quantidade e afins, em cinza embaixo do valor. */
  detalhe?: ReactNode;
  tom?: "danger" | "success";
  /** Com `onClick`, o total vira atalho do filtro de situação. */
  ativo?: boolean;
  onClick?: () => void;
}

/**
 * Faixa de totais de uma lista do Financeiro: números antes da lista, no mesmo vocabulário da
 * faixa de Cobranças. Os totais que têm um filtro correspondente são botões (atalho); o que está
 * filtrado fica marcado.
 */
export function FaixaDeTotais({ rotulo, itens }: { rotulo: string; itens: TotalDaFaixa[] }) {
  return (
    <section
      aria-label={rotulo}
      aria-live="polite"
      className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-2 lg:grid-cols-4"
    >
      {itens.map((t) => {
        const conteudo = (
          <>
            <span className="block text-[12.5px] text-muted-foreground md:text-xs">{t.rotulo}</span>
            <span
              className={cn(
                "block font-mono text-[15px] font-semibold tabular-nums",
                t.tom === "danger" && "text-destructive",
                t.tom === "success" && "text-success-soft-foreground"
              )}
            >
              {t.valor}
            </span>
            {t.detalhe !== undefined && (
              <span className="block text-[12px] text-muted-foreground tabular-nums">{t.detalhe}</span>
            )}
          </>
        );

        const base = "min-w-0 rounded-lg px-2.5 py-2 text-left";

        return t.onClick ? (
          <button
            key={t.chave}
            type="button"
            aria-pressed={!!t.ativo}
            onClick={t.onClick}
            className={cn(
              base,
              "min-h-11 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              t.ativo && "bg-muted ring-1 ring-border"
            )}
          >
            {conteudo}
          </button>
        ) : (
          <div key={t.chave} className={base}>
            {conteudo}
          </div>
        );
      })}
    </section>
  );
}
