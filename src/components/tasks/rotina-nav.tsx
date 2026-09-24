"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

// Sub-navegação do módulo Rotina (mais telas do design/handoff (R5-R13) entram
// aqui conforme forem construídas). Rotina não tem uma rota de índice própria
// como Administração: "/" já É a tela âncora (Chamada), então essa navegação
// secundária existe só pra alcançar as outras.
const ITEMS = [
  { href: "/", label: "Chamada" },
  { href: "/checklist", label: "Checklist" },
  { href: "/ocorrencias", label: "Ocorrências" },
  { href: "/materiais", label: "Materiais" },
  { href: "/reunioes", label: "Reuniões" },
  { href: "/planejamento-semanal", label: "Planejamento semanal" },
  { href: "/relatorios", label: "Relatórios" },
];

export function RotinaNav() {
  const pathname = usePathname();
  const { data: meuAcesso, isLoading, isError } = useMeuAcesso();

  // Só as abas que a pessoa pode abrir. Mostrar a aba e responder "Sem acesso" no clique era o
  // defeito: a professora via Materiais e Reuniões e caía num beco. Enquanto o acesso carrega
  // não mostra nenhuma — podeVerRota trata acesso ausente como "vê tudo", e as abas piscariam.
  const itens = isLoading || isError ? [] : ITEMS.filter((item) => podeVerRota(meuAcesso, item.href));

  return (
    // Guia: pílulas numa faixa bg-muted; o ativo é branco com sombra leve. A faixa
    // tem largura do conteúdo (w-max) pra não esticar no desktop e continuar
    // rolando na horizontal no celular.
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1">
        {itens.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
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
