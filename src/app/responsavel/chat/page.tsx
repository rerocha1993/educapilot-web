"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MessagesSquare } from "lucide-react";

import { ErroDoPortal, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { rotuloDaUltimaMensagem } from "@/lib/relacionamento/chat-comum";
import { useConversasDaFamilia } from "@/lib/relacionamento/use-chat-familia";
import { cn } from "@/lib/utils";

/**
 * Chat com a escola: uma conversa por filho. Com um filho só, abre direto a conversa (com
 * `replace`, para o "voltar" do celular não cair de novo aqui e redirecionar em laço).
 */
export default function ChatDaFamiliaPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useConversasDaFamilia();

  const unica = data?.length === 1 ? data[0] : null;
  useEffect(() => {
    if (unica) router.replace(`/responsavel/chat/${unica.id}`);
  }, [unica, router]);

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Chat com a escola</h1>

      {(isLoading || unica) && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && <ErroDoPortal texto="Não foi possível carregar as conversas." onTentar={() => refetch()} />}

      {data && data.length === 0 && (
        <VazioDoPortal
          icone={<MessagesSquare />}
          titulo="Nenhuma conversa por enquanto"
          texto="Quando a escola escrever para você, a conversa aparece aqui."
        />
      )}

      {data && data.length > 1 && (
        <ul aria-label="Conversas" className="flex flex-col gap-2">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                href={`/responsavel/chat/${c.id}`}
                className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("min-w-0 truncate text-[15px]", c.naoLidas > 0 ? "font-bold" : "font-semibold")}>
                      {c.alunoNome}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {rotuloDaUltimaMensagem(c.ultimaMensagemEm)}
                    </span>
                  </span>
                  {c.turma && <span className="block text-[12.5px] text-muted-foreground">Turma {c.turma}</span>}
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[13px]",
                      c.naoLidas > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {c.ultimaMensagemResumo
                      ? `${c.ultimaMensagemAutor === "Familia" ? "Você: " : ""}${c.ultimaMensagemResumo}`
                      : "Sem mensagens"}
                  </span>
                </span>

                {c.naoLidas > 0 && (
                  <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-action px-1.5 text-[11px] leading-5 font-bold text-action-foreground tabular-nums">
                    <span aria-hidden>{c.naoLidas > 99 ? "99+" : c.naoLidas}</span>
                    <span className="sr-only">
                      {c.naoLidas} {c.naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}
                    </span>
                  </span>
                )}
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
