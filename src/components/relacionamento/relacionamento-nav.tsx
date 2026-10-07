"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { cn } from "@/lib/utils";

/**
 * Abas do Relacionamento. Cada uma é uma área da permissão, com o mesmo slug do catálogo do
 * backend.
 *
 * As abas das próximas fases (chat, pagamentos, loja) já estão no array com
 * `emBreve`: não aparecem enquanto a tela não existir, e quando existir basta tirar a marca.
 */
export const ABAS_DO_RELACIONAMENTO: readonly {
  href: string;
  label: string;
  area: string;
  emBreve?: boolean;
}[] = [
  { href: "/relacionamento/avisos", label: "Avisos e eventos", area: "avisos" },
  { href: "/relacionamento/cronograma", label: "Cronograma", area: "cronograma" },
  { href: "/relacionamento/familias", label: "Famílias", area: "familias" },
  { href: "/relacionamento/atividades", label: "Atividades", area: "atividades" },
  { href: "/relacionamento/mural", label: "Mural", area: "mural" },
  { href: "/relacionamento/chat", label: "Chat", area: "chat", emBreve: true },
  { href: "/relacionamento/pagamentos", label: "Pagamentos", area: "pagamentos", emBreve: true },
  { href: "/relacionamento/loja", label: "Loja virtual", area: "loja", emBreve: true },
  { href: "/relacionamento/configuracao", label: "Configuração", area: "configuracao" },
];

export function RelacionamentoNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();

  // Filtra pela área, e não pela rota: quem só tem "Avisos" não vê as outras abas.
  const abas = ABAS_DO_RELACIONAMENTO.filter(
    (aba) => !aba.emBreve && podeVerArea(meuAcesso, "relacionamento", aba.area)
  );

  return (
    // A faixa rola de lado no celular; o w-max mantém as pílulas do mesmo tamanho lá dentro.
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5 print:hidden">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa = pathname === aba.href || pathname.startsWith(`${aba.href}/`);
          return (
            <Link
              key={aba.href}
              href={aba.href}
              aria-current={ativa ? "page" : undefined}
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
