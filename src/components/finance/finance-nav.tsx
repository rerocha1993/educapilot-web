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
    <div className="flex gap-1 border-b border-border">
      {itens.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/finance" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
