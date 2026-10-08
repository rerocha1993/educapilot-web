"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, MessageSquarePlus, MessagesSquare, Search } from "lucide-react";

import { DialogIniciarConversa } from "@/components/relacionamento/chat/dialog-iniciar-conversa";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/lib/kernel/use-classes";
import { rotuloDaUltimaMensagem } from "@/lib/relacionamento/chat-comum";
import { useAtraso } from "@/lib/relacionamento/use-atraso";
import { useConversasDaEscola } from "@/lib/relacionamento/use-chat";
import { cn } from "@/lib/utils";

const TODAS = "__todas__";

/**
 * Coluna da esquerda do chat da escola: busca, filtros (turma, não lidas, arquivadas) e as
 * conversas, a mais recente primeiro. O item aberto fica marcado.
 */
export function ListaDeConversas({ conversaAbertaId }: { conversaAbertaId: string | null }) {
  const [busca, setBusca] = useState("");
  const [turma, setTurma] = useState(TODAS);
  const [somenteNaoLidas, setSomenteNaoLidas] = useState(false);
  const [arquivadas, setArquivadas] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const buscaAtrasada = useAtraso(busca);

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );
  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);

  const { data, isLoading, isError, refetch } = useConversasDaEscola({
    classId: turma === TODAS ? null : Number(turma),
    somenteNaoLidas,
    busca: buscaAtrasada,
    status: arquivadas ? "Arquivada" : "Aberta",
  });
  const conversas = data ?? [];
  const filtrando = busca.trim() !== "" || turma !== TODAS || somenteNaoLidas;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-[16px] font-semibold tracking-[-.02em]">Conversas</h2>
          <Button type="button" variant="action" size="sm" onClick={() => setIniciando(true)}>
            <MessageSquarePlus aria-hidden /> Iniciar conversa
          </Button>
        </div>

        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar conversa por aluno ou responsável"
            placeholder="Buscar aluno ou responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={turma} onValueChange={(v) => v && setTurma(String(v))}>
          <SelectTrigger aria-label="Filtrar por turma" className="w-full">
            <SelectValue>{() => turmaEscolhida?.nome ?? "Todas as turmas"}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-72">
            <SelectItem value={TODAS}>Todas as turmas</SelectItem>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-1.5">
          <Filtro ativo={somenteNaoLidas} aoAlternar={() => setSomenteNaoLidas((v) => !v)}>
            Não lidas
          </Filtro>
          <Filtro ativo={arquivadas} aoAlternar={() => setArquivadas((v) => !v)}>
            <Archive aria-hidden className="size-3.5" /> Arquivadas
          </Filtro>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-2 p-3" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-3">
            <ErroDeCarga texto="Não foi possível carregar as conversas." onTentar={() => refetch()} />
          </div>
        )}

        {data && conversas.length === 0 && (
          <div className="p-3">
            <EstadoVazio
              icone={<MessagesSquare />}
              titulo={filtrando ? "Nenhuma conversa com esses filtros" : arquivadas ? "Nenhuma conversa arquivada" : "Nenhuma conversa ainda"}
              texto={filtrando ? "Limpe a busca ou os filtros." : arquivadas ? undefined : "Inicie uma conversa com a família de um aluno."}
            />
          </div>
        )}

        {conversas.length > 0 && (
          <ul aria-label="Conversas" className="divide-y divide-border">
            {conversas.map((c) => {
              const aberta = c.id === conversaAbertaId;
              const resumo = c.ultimaMensagemResumo
                ? `${c.ultimaMensagemAutor === "Escola" ? "Escola: " : ""}${c.ultimaMensagemResumo}`
                : "Sem mensagens";
              return (
                <li key={c.id}>
                  <Link
                    href={`/relacionamento/chat/${c.id}`}
                    aria-current={aberta ? "page" : undefined}
                    className={cn(
                      "flex min-h-[4.5rem] flex-col gap-0.5 px-3 py-2.5 transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                      aberta && "bg-accent"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("min-w-0 truncate text-[14.5px]", c.naoLidas > 0 ? "font-bold" : "font-semibold")}>
                        {c.alunoNome}
                      </span>
                      <span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
                        {rotuloDaUltimaMensagem(c.ultimaMensagemEm)}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      {c.turma && (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {c.turma}
                        </span>
                      )}
                      {c.status === "Arquivada" && (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Arquivada
                        </span>
                      )}
                      <span className={cn("min-w-0 flex-1 truncate text-[13px]", c.naoLidas > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {resumo}
                      </span>
                      {c.naoLidas > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-action px-1.5 text-[11px] leading-5 font-bold text-action-foreground tabular-nums">
                          <span aria-hidden>{c.naoLidas > 99 ? "99+" : c.naoLidas}</span>
                          <span className="sr-only">
                            {c.naoLidas} {c.naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}
                          </span>
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {iniciando && <DialogIniciarConversa onFechar={() => setIniciando(false)} />}
    </div>
  );
}

function Filtro({ ativo, aoAlternar, children }: { ativo: boolean; aoAlternar: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoAlternar}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-[12.5px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8",
        ativo ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
