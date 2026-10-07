"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { ListaDeConversas } from "@/components/relacionamento/chat/lista-de-conversas";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { cn } from "@/lib/utils";

/**
 * Chat da escola: duas colunas no computador (lista à esquerda, conversa à direita) e uma só no
 * celular (a lista; ao abrir uma conversa, ela cobre a tela inteira, com a seta de voltar).
 *
 * É um layout, e não só uma página, para a lista (com a busca e os filtros) continuar montada
 * enquanto se troca de conversa. A conversa aberta é o segmento da rota: /chat não tem nenhuma.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const conversaAbertaId = useSelectedLayoutSegment();

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <div className="grid gap-4 md:h-[calc(100dvh-12rem)] md:min-h-[30rem] md:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <div className={cn("min-h-0 max-md:min-h-[24rem]", conversaAbertaId && "max-md:hidden")}>
          <ListaDeConversas conversaAbertaId={conversaAbertaId} />
        </div>

        {/* No celular a conversa abre por cima de tudo (menu e abas de baixo): a caixa de texto
            precisa do fim da tela. */}
        <section
          aria-label="Conversa"
          className={cn(
            "min-h-0",
            conversaAbertaId
              ? "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-40 max-md:h-dvh"
              : "max-md:hidden"
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
