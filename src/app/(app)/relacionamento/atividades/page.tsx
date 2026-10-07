"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, ImageIcon, Plus } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { EtiquetaDoStatus } from "@/components/relacionamento/etiquetas";
import { FotoAutenticada } from "@/components/relacionamento/foto-autenticada";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { dataLocalIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { baixarFotoDaAtividade } from "@/lib/relacionamento/api";
import {
  useAtividades,
  type AtividadeResumo,
  type StatusDaAtividade,
} from "@/lib/relacionamento/use-conteudo";

const TODOS = "todos";

const SITUACOES = [
  { id: TODOS, rotulo: "Todas" },
  { id: "Rascunho", rotulo: "Rascunhos" },
  { id: "Publicada", rotulo: "Publicadas" },
] as const;

/** "yyyy-MM-dd" de `dias` dias antes de `iso`. Meio-dia evita escorregar de dia na virada do horário de verão. */
function diasAntes(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - dias);
  return dataLocalIso(d);
}

export default function AtividadesPage() {
  const [turma, setTurma] = useState<string>(TODOS);
  const [status, setStatus] = useState<string>(TODOS);
  const [de, setDe] = useState(() => diasAntes(hojeIsoBrasilia(), 30));
  const [ate, setAte] = useState(() => hojeIsoBrasilia());

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  // Período invertido não é pergunta que o servidor responda bem: espera a pessoa acertar as datas.
  const periodoValido = !!de && !!ate && de <= ate;

  const { data, isLoading, isError, refetch, isFetching } = useAtividades({
    classId: turma === TODOS ? null : Number(turma),
    de,
    ate,
    status: status === TODOS ? null : (status as StatusDaAtividade),
  });

  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);
  const filtrando = turma !== TODOS || status !== TODOS;
  const lista = periodoValido ? data : undefined;

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Atividades"
        apoio="O que a turma fez em sala, com fotos. As famílias só veem depois de publicado."
        acoes={
          <Link href="/relacionamento/atividades/nova" className={buttonVariants({ variant: "action" })}>
            <Plus /> Nova atividade
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <Segmentado
          rotulo="Situação"
          opcoes={SITUACOES}
          valor={status}
          onChange={setStatus}
          className="max-md:w-full"
          cheio
        />

        <Campo id="ativ-filtro-turma" rotulo="Turma" className="md:w-48">
          <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
            <SelectTrigger id="ativ-filtro-turma" className="w-full">
              <SelectValue>{() => turmaEscolhida?.nome ?? "Todas as turmas"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              <SelectItem value={TODOS}>Todas as turmas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
          <Campo id="ativ-filtro-de" rotulo="De">
            <Input id="ativ-filtro-de" type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
          </Campo>
          <Campo id="ativ-filtro-ate" rotulo="Até">
            <Input id="ativ-filtro-ate" type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
          </Campo>
        </div>
      </div>

      {!periodoValido && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Informe um período em que a data inicial não seja depois da final.
        </p>
      )}

      {periodoValido && isError && (
        <ErroDeCarga texto="Não foi possível carregar as atividades." onTentar={() => refetch()} />
      )}

      {periodoValido && isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60 w-full rounded-xl" />
          ))}
        </div>
      )}

      {lista && lista.length === 0 && (
        <EstadoVazio
          icone={<Camera />}
          titulo={filtrando ? "Nada com esses filtros" : "Nenhuma atividade neste período"}
          texto={
            filtrando
              ? "Tire um filtro ou amplie o período."
              : "Registre o que a turma fez hoje, com fotos. Ele só chega às famílias quando você publicar."
          }
          acao={
            !filtrando && (
              <Link href="/relacionamento/atividades/nova" className={buttonVariants({ variant: "action" })}>
                <Plus /> Nova atividade
              </Link>
            )
          }
        />
      )}

      {lista && lista.length > 0 && (
        <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-70" : ""}`}>
          {lista.map((a) => (
            <li key={a.id}>
              <CartaoDeAtividade atividade={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoDeAtividade({ atividade: a }: { atividade: AtividadeResumo }) {
  return (
    <Link
      href={`/relacionamento/atividades/${a.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="aspect-[4/3] w-full bg-muted">
        {a.capaFotoId ? (
          <FotoAutenticada
            baixar={baixarFotoDaAtividade}
            fotoId={a.capaFotoId}
            variante="thumb"
            rotulo={`Capa de ${a.titulo}`}
            className="size-full"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground" aria-hidden>
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <EtiquetaDoStatus status={a.status} />
          <span className="text-xs text-muted-foreground tabular-nums">{a.data ? formatarSoData(a.data) : ""}</span>
        </div>
        <p className="text-[15px] leading-snug font-semibold break-words">{a.titulo}</p>
        {a.resumo && <p className="line-clamp-2 text-[13px] leading-snug break-words text-muted-foreground">{a.resumo}</p>}
        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          {a.turma}
          {a.turma && " · "}
          <span className="tabular-nums">
            {a.totalDeFotos} {a.totalDeFotos === 1 ? "foto" : "fotos"}
          </span>
        </p>
      </div>
    </Link>
  );
}
