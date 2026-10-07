import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo + controle, no espaçamento dos diálogos do RH. */
export function Campo({
  id,
  rotulo,
  children,
  className,
  dica,
}: {
  id: string;
  rotulo: string;
  children: ReactNode;
  className?: string;
  dica?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

/** Caixa de erro de carga, com "Tentar de novo". */
export function ErroDeCarga({ texto, onTentar }: { texto: string; onTentar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground"
    >
      {texto}
      {onTentar && (
        <button type="button" onClick={onTentar} className="min-h-10 font-semibold underline md:min-h-0">
          Tentar de novo
        </button>
      )}
    </div>
  );
}
