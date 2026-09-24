"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

const ITEMS = [
  { href: "/finance", label: "Painel" },
  { href: "/finance/despesas", label: "Despesas" },
  { href: "/finance/receitas", label: "Receitas" },
  { href: "/finance/mensalidades", label: "Mensalidades" },
  { href: "/finance/inadimplencia", label: "Inadimplência" },
  { href: "/finance/orcamento", label: "Orçamento" },
  { href: "/finance/contas", label: "Contas" },
  { href: "/finance/conciliacao", label: "Conciliação" },
  { href: "/finance/plano-de-contas", label: "Plano de contas" },
  { href: "/finance/fechamento", label: "Fechamento" },
];

export function FinanceNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // Cada aba é uma área da permissão: quem não tem "Inadimplência" não vê a aba dela.
  const itens = ITEMS.filter((item) => podeVerRota(meuAcesso, item.href));

  return (
    // Pílulas do guia: faixa cinza, ativo em branco com sombra leve. A faixa tem largura de
    // conteúdo (w-max) para o rolar horizontal do celular não deixar uma sobra cinza à direita.
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {itens.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/finance" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
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
