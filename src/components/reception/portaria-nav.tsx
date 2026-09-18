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
    // A faixa rola de lado no celular; o w-max mantém as pílulas do mesmo tamanho lá dentro.
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa =
            pathname === aba.href || (aba.href !== "/portaria" && pathname.startsWith(`${aba.href}/`));
          return (
            <Link
              key={aba.href}
              href={aba.href}
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
