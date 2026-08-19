"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/tasks/use-notifications";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function NotificacoesPage() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  async function handleMarkAll() {
    try {
      await markAllRead.mutateAsync();
      toast.success("Todas marcadas como lidas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao marcar como lidas.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Central de notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lidas` : "Tudo em dia."}
          </p>
        </div>
        <Button variant="outline" onClick={handleMarkAll} disabled={markAllRead.isPending || unreadCount === 0}>
          Marcar todas como lidas
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as notificações.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!isLoading && (notifications?.length ?? 0) === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhuma notificação ainda.
          </p>
        )}

        {notifications
          ?.slice()
          .sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())
          .map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead.mutate(n.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0 transition-colors hover:bg-accent/40",
                !n.isRead && "bg-[#FCFAF4]"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.isRead ? "bg-muted-foreground/40" : "bg-primary"
                )}
              />
              <div className="flex-1">
                <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {formatDateTime(n.sentDate)}
                </p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
