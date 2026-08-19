"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Sub-navegação do módulo Rotina (mais telas do design/handoff (R5-R13) entram
// aqui conforme forem construídas). Rotina não tem uma rota de índice própria
// como Administração: "/" já É a tela âncora (Chamada), então essa navegação
// secundária existe só pra alcançar as outras.
const ITEMS = [
  { href: "/", label: "Chamada" },
  { href: "/faltas", label: "Faltas" },
  { href: "/checklist", label: "Checklist" },
  { href: "/ocorrencias", label: "Ocorrências" },
];

export function RotinaNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
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
