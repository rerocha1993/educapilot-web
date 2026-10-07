"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { useResumoDoChat } from "@/lib/relacionamento/use-chat";
import { cn } from "@/lib/utils";

/**
 * Abas do Relacionamento. Cada uma é uma área da permissão, com o mesmo slug do catálogo do
 * backend.
 *
 * Aba de tela que ainda não existe entra no array com `emBreve`: não aparece, e quando a tela
 * existir basta tirar a marca. A aba Chat leva a contagem de conversas não lidas.
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
  { href: "/relacionamento/chat", label: "Chat", area: "chat" },
  { href: "/relacionamento/pagamentos", label: "Pagamentos", area: "pagamentos" },
  { href: "/relacionamento/loja", label: "Loja virtual", area: "loja" },
  { href: "/relacionamento/configuracao", label: "Configuração", area: "configuracao" },
];

export function RelacionamentoNav() {
  const pathname = usePathname();
  const { data: meuAcesso } = useMeuAcesso();
  const { data: resumoDoChat } = useResumoDoChat(podeVerArea(meuAcesso, "relacionamento", "chat"));
  const naoLidasDoChat = resumoDoChat?.conversasNaoLidas ?? 0;

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
              {aba.area === "chat" && naoLidasDoChat > 0 && (
                <span className="ml-1.5 inline-grid min-w-4.5 place-items-center rounded-full bg-action px-1 text-[10.5px] leading-[18px] font-bold text-action-foreground tabular-nums">
                  <span aria-hidden>{naoLidasDoChat > 99 ? "99+" : naoLidasDoChat}</span>
                  <span className="sr-only">
                    {naoLidasDoChat === 1 ? "conversa não lida" : "conversas não lidas"}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
