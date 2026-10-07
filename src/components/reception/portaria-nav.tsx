"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSecoesVisiveis } from "@/lib/access/use-secoes-visiveis";
import { secaoAtiva } from "@/lib/kernel/secoes-do-modulo";

/**
 * Abas da Portaria, só no celular. No computador as seções vivem na barra lateral (catálogo em
 * secoes-do-modulo.ts) e esta faixa não renderiza nada.
 */
export function PortariaNav() {
  const pathname = usePathname();
  // Filtra pela área, e não pela rota: "/portaria" é a entrada do módulo e fica liberada para
  // qualquer área dele, mas a aba "Hoje" é só de quem tem a área de chegada e saída.
  const abas = useSecoesVisiveis("/portaria");
  const ativaHref = secaoAtiva(abas, pathname);

  return (
    // A faixa rola de lado no celular; o w-max mantém as pílulas do mesmo tamanho lá dentro.
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 md:hidden print:hidden">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa = ativaHref === aba.href;
          return (
            <Link
              key={aba.href}
              href={aba.href}
              aria-current={ativa ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[9px] px-3.5 py-2 text-sm whitespace-nowrap transition-colors max-md:min-h-10 max-md:inline-flex max-md:items-center",
                ativa
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {aba.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
