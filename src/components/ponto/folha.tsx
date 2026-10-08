"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Folha deslizante: no celular sobe de baixo e ocupa a largura toda (o polegar alcança tudo); no
 * computador vira um diálogo centralizado.
 *
 * Monte só enquanto estiver aberta (o pai renderiza condicionalmente), como o Confirmacao do RH:
 * fechar é desmontar, e o estado de dentro recomeça na próxima vez. `bloqueada` impede fechar por
 * toque fora, Esc e pelo X enquanto uma chamada está em andamento.
 */
export function Folha({
  titulo,
  descricao,
  onFechar,
  bloqueada = false,
  children,
  className,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  onFechar: () => void;
  bloqueada?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open onOpenChange={(aberta) => !aberta && !bloqueada && onFechar()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Popup
          className={cn(
            // Celular: colada embaixo. md+: caixa no meio da tela.
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-popover text-popover-foreground shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-bottom md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95",
            className
          )}
        >
          <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border md:hidden" />

          <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-1 md:pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-heading text-xl leading-tight font-semibold tracking-[-.02em]">
                {titulo}
              </DialogPrimitive.Title>
              {descricao && (
                <DialogPrimitive.Description className="mt-1 text-sm leading-[1.5] text-muted-foreground">
                  {descricao}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              disabled={bloqueada}
              aria-label="Fechar"
              className="-mr-2 grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted disabled:opacity-40 md:hover:bg-muted"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
