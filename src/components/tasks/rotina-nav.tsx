"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSecoesVisiveis } from "@/lib/access/use-secoes-visiveis";
import { secaoAtiva } from "@/lib/kernel/secoes-do-modulo";

/**
 * Abas da Rotina, só no celular. No computador as seções vivem na barra lateral (catálogo em
 * secoes-do-modulo.ts) e esta faixa não renderiza nada. Rotina não tem uma rota de índice
 * própria: "/" já É a tela âncora (Chamada).
 */
export function RotinaNav() {
  const pathname = usePathname();
  // Só as abas que a pessoa pode abrir. Mostrar a aba e responder "Sem acesso" no clique era o
  // defeito: a professora via Materiais e Reuniões e caía num beco. Enquanto o acesso carrega
  // o hook não devolve nenhuma — acesso ausente conta como "vê tudo", e as abas piscariam.
  const itens = useSecoesVisiveis("/");
  const ativa = secaoAtiva(itens, pathname);

  return (
    // Guia: pílulas numa faixa bg-muted; o ativo é branco com sombra leve. A faixa
    // tem largura do conteúdo (w-max) pra rolar na horizontal no celular.
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:hidden print:hidden">
      <div className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1">
        {itens.map((item) => {
          const active = ativa === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[13.5px] transition-colors max-md:py-2.5",
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
