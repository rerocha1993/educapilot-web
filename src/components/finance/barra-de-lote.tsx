import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Barra que aparece quando há itens marcados: quantos, quanto somam e a ação em lote. Fica colada no
 * topo ao rolar a lista, para a ação não ficar longe de quem marcou o último item.
 */
export function BarraDeLote({
  quantidade,
  soma,
  rotuloDaAcao,
  icone,
  onAcao,
  onLimpar,
}: {
  quantidade: number;
  /** Soma dos valores marcados, já formatada. */
  soma: string;
  rotuloDaAcao: string;
  icone?: ReactNode;
  onAcao: () => void;
  onLimpar: () => void;
}) {
  if (quantidade === 0) return null;

  return (
    <div
      role="region"
      aria-label="Itens marcados"
      className="sticky top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm"
    >
      <p className="min-w-0 flex-1 text-sm" aria-live="polite">
        <span className="font-numeric font-semibold">{quantidade}</span> {quantidade === 1 ? "marcada" : "marcadas"} ·{" "}
        <span className="font-mono tabular-nums">{soma}</span>
      </p>
      <Button variant="ghost" size="sm" onClick={onLimpar}>
        Limpar seleção
      </Button>
      <Button variant="action" onClick={onAcao}>
        {icone}
        {rotuloDaAcao}
      </Button>
    </div>
  );
}
