"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";

/**
 * Abas de Matrículas. Cada uma é uma área da permissão, com o mesmo slug do catálogo do backend
 * (RecursoDoModulo). Materiais e métricas entram aqui quando as fases deles chegarem.
 */
export const ABAS_DE_MATRICULAS = [
  { href: "/matriculas", label: "Funil", area: "funil" },
  { href: "/matriculas/conversas", label: "Conversas", area: "conversas" },
  { href: "/matriculas/assistente", label: "Assistente", area: "configuracao" },
  { href: "/matriculas/agenda", label: "Agenda", area: "configuracao" },
  { href: "/matriculas/materiais", label: "Materiais", area: "configuracao" },
  { href: "/matriculas/whatsapp", label: "WhatsApp", area: "configuracao" },
  { href: "/matriculas/configuracao", label: "Configuração", area: "configuracao" },
] as const;

export function MatriculasNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();
  const abas = ABAS_DE_MATRICULAS.filter((aba) => podeVerArea(meuAcesso, "matriculas", aba.area));

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa =
            pathname === aba.href || (aba.href !== "/matriculas" && pathname.startsWith(`${aba.href}/`));
          return (
            <Link
              key={aba.href}
              href={aba.href}
              className={cn(
                "shrink-0 rounded-[9px] px-3.5 py-2 text-sm whitespace-nowrap transition-colors max-md:inline-flex max-md:min-h-10 max-md:items-center",
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
