"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

const ITEMS = [
  { href: "/finance", label: "Fluxo de caixa" },
  { href: "/finance/despesas", label: "Despesas" },
  { href: "/finance/receitas", label: "Receitas" },
  { href: "/finance/mensalidades", label: "Mensalidades" },
  { href: "/finance/inadimplencia", label: "Inadimplência" },
  { href: "/finance/orcamento", label: "Orçamento" },
];

export function FinanceNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // Cada aba é uma área da permissão: quem não tem "Inadimplência" não vê a aba dela.
  const itens = ITEMS.filter((item) => podeVerRota(meuAcesso, item.href));

  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      {itens.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/finance" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
