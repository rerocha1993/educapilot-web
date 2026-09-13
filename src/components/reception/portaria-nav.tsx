"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";

/** Abas da Portaria. Cada uma é uma área da permissão, com o mesmo slug do catálogo do backend. */
export const ABAS_DA_PORTARIA = [
  { href: "/portaria", label: "Hoje", area: "presenca" },
  { href: "/portaria/mapa", label: "Mapa", area: "mapa" },
  { href: "/portaria/visitantes", label: "Visitantes", area: "visitantes" },
  { href: "/portaria/relatorios", label: "Relatórios", area: "relatorios" },
  { href: "/portaria/configuracao", label: "Configuração", area: "configuracao" },
] as const;

export function PortariaNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // Filtra pela área, e não pela rota: "/portaria" é a entrada do módulo e fica liberada para
  // qualquer área dele, mas a aba "Hoje" é só de quem tem a área de chegada e saída.
  const abas = ABAS_DA_PORTARIA.filter((aba) => podeVerArea(meuAcesso, "reception", aba.area));

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {abas.map((aba) => {
        const ativa =
          pathname === aba.href || (aba.href !== "/portaria" && pathname.startsWith(`${aba.href}/`));
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              ativa
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {aba.label}
          </Link>
        );
      })}
    </div>
  );
}
