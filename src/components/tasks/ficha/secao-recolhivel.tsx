import type { ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Seção da ficha: fechada por padrão, com o título e um resumo de uma linha no cabeçalho.
 *
 * O conteúdo fica montado (só escondido) para não perder o que foi digitado ou expandido lá dentro, e na
 * impressão vira tudo aberto (classe `print:block`). `larga` faz a seção ocupar as duas colunas quando aberta.
 */
export function SecaoRecolhivel({
  id,
  titulo,
  resumo,
  fonte,
  aberta,
  onAlternar,
  larga = false,
  quebraLivre = false,
  className,
  children,
}: {
  id: string;
  titulo: string;
  /** Uma linha, com o número que importa ("7 no ano, 1 grave"). */
  resumo: ReactNode;
  fonte?: string;
  aberta: boolean;
  onAlternar: () => void;
  /** Ocupa as duas colunas quando aberta (listas longas). */
  larga?: boolean;
  /** Seções longas podem quebrar de página ao imprimir; as curtas não. */
  quebraLivre?: boolean;
  /** Classe extra na seção (a impressão usa para omitir seções a pedido). */
  className?: string;
  children: ReactNode;
}) {
  const idDoTitulo = `secao-${id}-titulo`;
  const idDoCorpo = `secao-${id}-corpo`;

  return (
    <section
      aria-labelledby={idDoTitulo}
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card print:rounded-none print:border-x-0 print:border-b print:border-t-0 print:py-3",
        aberta && larga && "lg:col-span-2",
        !quebraLivre && "print:break-inside-avoid",
        className
      )}
    >
      <h2 className="m-0">
        <button
          type="button"
          id={idDoTitulo}
          aria-expanded={aberta}
          aria-controls={idDoCorpo}
          onClick={onAlternar}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring print:pointer-events-none print:min-h-0 print:px-0 print:py-0 md:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-[15.5px] font-semibold print:text-[13pt]">{titulo}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground print:hidden">{resumo}</span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform print:hidden", aberta && "rotate-180")}
          />
        </button>
      </h2>

      <div id={idDoCorpo} className={cn("px-4 pb-4 md:px-5 md:pb-5 print:px-0 print:pb-0", !aberta && "hidden print:block")}>
        {fonte && (
          <p className="mb-3 flex items-start gap-1.5 border-t border-border pt-3 text-[12px] leading-snug text-muted-foreground print:border-0 print:pt-0 print:text-[8.5pt]">
            <Info aria-hidden className="mt-px size-3.5 shrink-0 print:hidden" />
            <span>{fonte}</span>
          </p>
        )}
        {!fonte && <div className="border-t border-border pt-3 print:hidden" />}
        {children}
      </div>
    </section>
  );
}
