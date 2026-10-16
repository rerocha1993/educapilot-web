import { Leaf } from "lucide-react";

import { etiquetaEhPositiva, rotuloDaEtiqueta } from "@/lib/relacionamento/cardapio-vocabulario";
import type { StatusDoCardapio } from "@/lib/relacionamento/use-cardapio";
import { cn } from "@/lib/utils";

/**
 * As etiquetas de ingrediente de um prato, pequenas. São informação do PRATO ("tem leite"), nunca
 * da criança. A cor não vai sozinha: cada etiqueta é um texto.
 */
export function ChipsDeEtiquetas({ etiquetas, className }: { etiquetas: readonly string[]; className?: string }) {
  if (etiquetas.length === 0) return null;

  return (
    <ul aria-label="Ingredientes do prato" className={cn("flex flex-wrap gap-1", className)}>
      {etiquetas.map((e) => (
        <li
          key={e}
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1 py-px text-[10.5px] leading-tight font-semibold whitespace-nowrap",
            etiquetaEhPositiva(e) ? "bg-success-soft text-success-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
          )}
        >
          {etiquetaEhPositiva(e) && <Leaf aria-hidden className="size-2.5" />}
          {rotuloDaEtiqueta(e)}
        </li>
      ))}
    </ul>
  );
}

const ESTILO_DO_STATUS: Record<StatusDoCardapio, string> = {
  Rascunho: "bg-warning-soft text-warning-soft-foreground",
  Publicado: "bg-success-soft text-success-soft-foreground",
};

export function EtiquetaDeStatusDoCardapio({
  status,
  atualizado = false,
  className,
}: {
  status: StatusDoCardapio;
  atualizado?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        ESTILO_DO_STATUS[status],
        className
      )}
    >
      {status}
      {atualizado && status === "Publicado" && <span className="ml-1 font-medium opacity-80">· atualizado</span>}
    </span>
  );
}
