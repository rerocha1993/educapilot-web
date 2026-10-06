"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";

/**
 * Abas do RH. Cada uma é uma área da permissão, com o mesmo slug do catálogo do backend; a visão
 * geral não tem área própria (`null`) e abre para quem tem qualquer uma delas.
 */
export const ABAS_DO_RH = [
  { href: "/rh", label: "Visão geral", area: null },
  { href: "/rh/funcionarios", label: "Funcionários", area: "funcionarios" },
  { href: "/rh/ponto", label: "Ponto", area: "ponto" },
  { href: "/rh/atestados", label: "Atestados", area: "atestados" },
  { href: "/rh/afastamentos", label: "Afastamentos", area: "afastamentos" },
  { href: "/rh/documentos", label: "Documentos", area: "documentos" },
  { href: "/rh/relatorios", label: "Relatórios", area: "relatorios" },
  { href: "/rh/configuracao", label: "Configuração", area: "configuracao" },
] as const;

export function RhNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // Filtra pela área, e não pela rota: a pessoa que só tem "Ponto" não vê as outras sete abas.
  const abas = ABAS_DO_RH.filter((aba) => podeVerArea(meuAcesso, "rh", aba.area));

  return (
    // A faixa rola de lado no celular; o w-max mantém as pílulas do mesmo tamanho lá dentro.
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 print:hidden">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa =
            pathname === aba.href || (aba.href !== "/rh" && pathname.startsWith(`${aba.href}/`));
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
