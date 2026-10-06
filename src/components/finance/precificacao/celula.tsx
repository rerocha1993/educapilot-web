import type { ReactNode } from "react";

/** Célula com o rótulo à esquerda no celular (a tabela vira bloco) e sem rótulo no desktop. */
export function Celula({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 md:block md:text-right">
      <span className="text-xs text-muted-foreground md:hidden">{rotulo}</span>
      {children}
    </div>
  );
}
