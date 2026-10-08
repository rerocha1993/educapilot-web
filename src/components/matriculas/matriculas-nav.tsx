"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSecoesVisiveis } from "@/lib/access/use-secoes-visiveis";
import { secaoAtiva } from "@/lib/kernel/secoes-do-modulo";

/**
 * Abas de Matrículas, só no celular. No computador as seções vivem na barra lateral, agrupadas
 * como nos outros módulos (catálogo em secoes-do-modulo.ts), e esta faixa não renderiza nada.
 * Cada seção é uma área da permissão (funil, conversas, configuracao): quem não tem a área não vê a aba.
 */
export function MatriculasNav() {
  const pathname = usePathname();
  const itens = useSecoesVisiveis("/matriculas");
  const ativa = secaoAtiva(itens, pathname);

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:hidden print:hidden">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {itens.map((item) => {
          const active = ativa === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[9px] px-3.5 py-2 text-[13.5px] whitespace-nowrap transition-colors",
                active
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
