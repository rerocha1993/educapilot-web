import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estado vazio do guia: cartão tracejado, ícone num quadrado de 40px, título curto e uma ação.
 */
export function EstadoVazio({
  icone,
  titulo,
  texto,
  acao,
  className,
  textoClassName,
}: {
  icone?: ReactNode;
  titulo: ReactNode;
  texto?: ReactNode;
  acao?: ReactNode;
  className?: string;
  /** Largura do texto, quando a frase pede uma medida diferente da padrão. */
  textoClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border-dashed bg-card px-5 py-7 text-center",
        className
      )}
    >
      {icone && (
        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-[18px]">
          {icone}
        </span>
      )}
      <p className="mt-3 font-heading text-[15px] font-semibold">{titulo}</p>
      {texto && (
        <p
          className={cn(
            "mx-auto mt-1.5 max-w-[280px] text-[13px] leading-[1.55] text-muted-foreground",
            textoClassName
          )}
        >
          {texto}
        </p>
      )}
      {acao && <div className="mt-3.5 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}
