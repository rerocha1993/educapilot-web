"use client";

import { Bell, CheckCheck, MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarDataHora } from "@/lib/format/date";
import { useResumoDoChat } from "@/lib/relacionamento/use-chat";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/tasks/use-notifications";
import { cn } from "@/lib/utils";

/** Quantos avisos o menu lista. O contador do sino conta todos os não lidos, não só estes. */
const AVISOS_VISIVEIS = 10;

/**
 * O sino do cabeçalho: os avisos do próprio usuário (GET /api/Notifications), os do calendário
 * entre eles.
 *
 * O hook já consulta a cada 60 s, então um aviso novo aparece sem recarregar a página. Montado
 * só para quem tem a Rotina — o endpoint é do módulo — e nunca para o Responsável, que nem usa
 * este shell.
 *
 * Marcar como lido não fecha o menu: quem tem vários avisos quer limpar a fila de uma vez.
 *
 * Com a área Chat liberada, o sino também soma as conversas com mensagem não lida (GET
 * /api/Relacionamento/chat/resumo) e mostra uma linha que leva ao chat. É o sino, e não um ponto
 * no menu, porque ele aparece em todas as telas, no computador e no celular, e o menu lateral
 * recolhido não tem onde pôr um número.
 */
export function SinoDeAvisos({
  tamanho = "sm",
  comRotina = true,
  comChat = false,
}: {
  tamanho?: "sm" | "lg";
  /** A pessoa tem a Rotina: só então a lista de avisos (/api/Notifications) existe para ela. */
  comRotina?: boolean;
  /** A pessoa pode abrir o chat da escola. */
  comChat?: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useNotifications(comRotina);
  const { data: resumoDoChat } = useResumoDoChat(comChat);
  const marcar = useMarkNotificationRead();
  const marcarTodas = useMarkAllNotificationsRead();

  const todos = comRotina ? (data ?? []) : [];
  const avisosNaoLidos = todos.filter((n) => !n.isRead).length;
  const conversasNaoLidas = comChat ? (resumoDoChat?.conversasNaoLidas ?? 0) : 0;
  const naoLidos = avisosNaoLidos + conversasNaoLidas;
  const recentes = [...todos]
    .sort((a, b) => b.sentDate.localeCompare(a.sentDate))
    .slice(0, AVISOS_VISIVEIS);

  function falhou(err: unknown) {
    toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o aviso.");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={naoLidos > 0 ? `Avisos, ${naoLidos} não lidos` : "Avisos"}
        title="Avisos"
        className={cn(
          "relative grid place-items-center text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          tamanho === "sm"
            ? "size-9 rounded-lg border border-input bg-card"
            : "size-11 rounded-full active:bg-muted"
        )}
      >
        <Bell className={tamanho === "sm" ? "size-4" : "size-6"} />
        {naoLidos > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full bg-action px-1 text-[10.5px] leading-[18px] font-bold text-action-foreground tabular-nums"
          >
            {naoLidos > 99 ? "99+" : naoLidos}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <span className="text-sm font-semibold">
            Avisos
          </span>
          {avisosNaoLidos > 0 && (
            <DropdownMenuItem
              closeOnClick={false}
              disabled={marcarTodas.isPending}
              onClick={() => marcarTodas.mutate(undefined, { onError: falhou })}
              className="px-2 text-xs font-semibold text-primary"
            >
              <CheckCheck className="size-3.5" />
              Marcar todos como lidos
            </DropdownMenuItem>
          )}
        </div>
        <DropdownMenuSeparator />

        {conversasNaoLidas > 0 && (
          <DropdownMenuItem
            onClick={() => router.push("/relacionamento/chat")}
            className="min-h-12 items-center gap-2.5 px-2 py-2 text-[13px] font-medium"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
              <MessagesSquare aria-hidden className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              {conversasNaoLidas} {conversasNaoLidas === 1 ? "conversa com mensagem nova" : "conversas com mensagens novas"}
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">Abrir chat</span>
          </DropdownMenuItem>
        )}

        {!comRotina ? (
          conversasNaoLidas === 0 && (
            <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Nenhum aviso por enquanto.</p>
          )
        ) : isLoading ? (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">Carregando…</p>
        ) : isError ? (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
            Não foi possível carregar os avisos agora.
          </p>
        ) : recentes.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
            Nenhum aviso por enquanto.
          </p>
        ) : (
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {recentes.map((n) => (
              <DropdownMenuItem
                key={n.id}
                closeOnClick={false}
                disabled={n.isRead || marcar.isPending}
                onClick={() => marcar.mutate(n.id, { onError: falhou })}
                className={cn(
                  "min-h-12 items-start gap-2.5 px-2 py-2",
                  // Lido fica discreto, mas legível: desabilitado do menu apagaria o texto demais.
                  n.isRead && "data-disabled:opacity-100"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.isRead ? "bg-transparent" : "bg-action"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13px] leading-snug break-words",
                      n.isRead ? "text-muted-foreground" : "font-medium text-foreground"
                    )}
                  >
                    {n.message}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
                    <span className="tabular-nums">{formatarDataHora(n.sentDate)}</span>
                    {!n.isRead && <span className="font-semibold text-primary">Marcar como lido</span>}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
