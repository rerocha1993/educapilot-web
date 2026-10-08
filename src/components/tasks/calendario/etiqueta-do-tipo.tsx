import { FolderKanban } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROTULO_DO_TIPO, type TipoDeEvento } from "@/lib/tasks/use-calendario";

import { ESTILO_DO_TIPO } from "./estilo-do-tipo";

/** Marca o evento que nasceu de um projeto: ele não se edita aqui, só pelo projeto. */
export function EtiquetaDeProjeto({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground",
        className
      )}
    >
      <FolderKanban aria-hidden className="size-3" />
      Projeto
    </span>
  );
}

/** Etiqueta do tipo do evento: ícone + nome, na cor do tipo. */
export function EtiquetaDoTipo({
  tipo,
  className,
}: {
  tipo: TipoDeEvento;
  className?: string;
}) {
  const estilo = ESTILO_DO_TIPO[tipo];
  const Icone = estilo.icone;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        estilo.chip,
        className
      )}
    >
      <Icone aria-hidden className="size-3" />
      {ROTULO_DO_TIPO[tipo]}
    </span>
  );
}
