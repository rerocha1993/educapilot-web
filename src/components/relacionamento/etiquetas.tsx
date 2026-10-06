import { Megaphone, PartyPopper } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StatusDaPublicacao, TipoDePublicacao } from "@/lib/relacionamento/use-relacionamento";

/**
 * Etiquetas de publicação.
 *
 * Aviso é roxo suave e Evento é verde, no mesmo tom do evento do calendário da escola; a cor
 * nunca vai sozinha, o ícone e o nome carregam o significado.
 */
const ESTILO_DO_TIPO: Record<TipoDePublicacao, string> = {
  Aviso: "bg-accent text-accent-foreground",
  Evento: "bg-success-soft text-success-soft-foreground",
};

export function EtiquetaDoTipoDePublicacao({ tipo, className }: { tipo: TipoDePublicacao; className?: string }) {
  const Icone = tipo === "Evento" ? PartyPopper : Megaphone;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        ESTILO_DO_TIPO[tipo],
        className
      )}
    >
      <Icone aria-hidden className="size-3" />
      {tipo}
    </span>
  );
}

const ESTILO_DO_STATUS: Record<StatusDaPublicacao, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Publicada: "bg-success-soft text-success-soft-foreground",
  Arquivada: "bg-warning-soft text-warning-soft-foreground",
};

export function EtiquetaDoStatus({ status, className }: { status: StatusDaPublicacao; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        ESTILO_DO_STATUS[status],
        className
      )}
    >
      {status}
    </span>
  );
}

/** "Escola toda" ou os nomes das turmas, separados por vírgula. */
export function destinoDaPublicacao(p: { escolaToda: boolean; turmas: { nome: string }[] }): string {
  if (p.escolaToda || p.turmas.length === 0) return "Escola toda";
  return p.turmas.map((t) => t.nome).join(", ");
}
