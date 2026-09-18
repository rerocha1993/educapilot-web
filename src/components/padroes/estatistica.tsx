import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cartão de estatística do guia: rótulo pequeno, número grande em mono, um total ao lado em cinza
 * e, quando existe proporção, a barra fina de 6px.
 *
 * A barra fica roxa (estrutura) e vira laranja quando o valor é baixo o bastante para pedir uma
 * decisão — é a mesma regra da entrega: laranja só onde há decisão.
 */
export function Estatistica({
  rotulo,
  valor,
  total,
  etiqueta,
  proporcao,
  alertarAbaixoDe = 0,
  barra,
  rodape,
  tom,
  className,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  /** Vem depois do valor, menor e em cinza: o "/ 115" do modelo. */
  total?: ReactNode;
  /** Chip pequeno no canto superior direito (percentual, competência, contagem). */
  etiqueta?: ReactNode;
  /** 0 a 100. Sem isto, não há barra. */
  proporcao?: number;
  /** Abaixo deste percentual a barra fica laranja. */
  alertarAbaixoDe?: number;
  /** Barra própria, para quando uma proporção só não conta a história (ex.: três faixas). */
  barra?: ReactNode;
  rodape?: ReactNode;
  tom?: "danger";
  className?: string;
}) {
  const pct = proporcao === undefined ? undefined : Math.max(0, Math.min(100, proporcao));

  return (
    <div className={cn("rounded-xl border border-border bg-card px-4.5 pt-4.5 pb-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] font-medium leading-snug text-muted-foreground md:text-[12.5px]">
          {rotulo}
        </span>
        {etiqueta}
      </div>

      <div
        className={cn(
          "mt-2.5 font-heading text-[26px] font-semibold tracking-[-.03em] tabular-nums sm:text-[30px]",
          tom === "danger" && "text-destructive"
        )}
      >
        {valor}
        {total !== undefined && <span className="text-[16px] text-[#B5AEBF] sm:text-[18px]"> / {total}</span>}
      </div>

      {barra && <div className="mt-3">{barra}</div>}

      {barra === undefined && pct !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-[4px] bg-muted">
          <div
            className={cn(
              "h-full rounded-[4px] transition-[width] duration-700",
              pct < alertarAbaixoDe ? "bg-action-brand" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {rodape && <div className="mt-2 text-[12.5px] leading-snug text-muted-foreground md:text-[11.5px]">{rodape}</div>}
    </div>
  );
}

/** Chip do canto do cartão. Os tons seguem a situação do dado, nunca a decoração. */
export function EtiquetaDoCartao({
  tom = "neutro",
  children,
}: {
  tom?: "success" | "action" | "danger" | "neutro";
  children: ReactNode;
}) {
  const tons = {
    success: "bg-success-soft text-success-soft-foreground",
    action: "bg-action-soft text-action-soft-foreground",
    danger: "bg-destructive-soft text-destructive-soft-foreground",
    neutro: "bg-muted text-muted-foreground",
  };

  return (
    <span className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap tabular-nums",
        tons[tom]
      )}>
      {children}
    </span>
  );
}
