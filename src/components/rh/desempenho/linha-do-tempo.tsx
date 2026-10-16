"use client";

import { useState } from "react";
import { Award, BriefcaseBusiness, CalendarOff, ClipboardCheck, DoorOpen, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { ROTULO_DA_LINHA_DO_TEMPO, TIPOS_DA_LINHA_DO_TEMPO, useLinhaDoTempo } from "@/lib/rh/use-desempenho";
import { cn } from "@/lib/utils";

import { ErroDeCarga } from "../campo";
import { SeletorDeAno } from "../seletor-de-ano";

const ICONE: Record<string, ReactNode> = {
  Admissao: <DoorOpen />,
  Marco: <BriefcaseBusiness />,
  Avaliacao: <ClipboardCheck />,
  Advertencia: <TriangleAlert />,
  Reconhecimento: <Award />,
  Afastamento: <CalendarOff />,
};

const COR: Record<string, string> = {
  Advertencia: "bg-destructive-soft text-destructive-soft-foreground",
  Reconhecimento: "bg-success-soft text-success-soft-foreground",
  Avaliacao: "bg-secondary text-secondary-foreground",
  Afastamento: "bg-accent text-accent-foreground",
};

/**
 * Linha do tempo da trajetória: admissão, marcos, avaliações concluídas, advertências, reconhecimentos e afastamentos
 * (só o tipo e as datas: nunca atestado, CID nem observação de saúde). Compacta, com filtro por tipo e por ano.
 */
export function LinhaDoTempo({ funcionarioId }: { funcionarioId: string }) {
  const [tipos, setTipos] = useState<string[]>([]);
  const [ano, setAno] = useState<number | null>(null);
  const { data, isLoading, isError, refetch } = useLinhaDoTempo(funcionarioId, tipos, ano);

  const alternar = (t: string) => setTipos((atual) => (atual.includes(t) ? atual.filter((x) => x !== t) : [...atual, t]));

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4" aria-label="Linha do tempo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">Linha do tempo</h3>
        <div className="flex items-center gap-2">
          {ano === null ? (
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAno(new Date().getFullYear())}>
              Filtrar por ano
            </button>
          ) : (
            <>
              <SeletorDeAno valor={ano} onChange={setAno} className="md:w-24" />
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAno(null)}>
                Todos os anos
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por tipo">
        {TIPOS_DA_LINHA_DO_TEMPO.map((t) => {
          const ativo = tipos.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(t)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                ativo ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {ROTULO_DA_LINHA_DO_TEMPO[t]}
            </button>
          );
        })}
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar a linha do tempo." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nada na linha do tempo com este filtro.</p>
      ) : (
        <ol className="max-h-96 overflow-y-auto">
          {data!.map((item, i) => (
            <li key={`${item.tipo}-${item.id ?? i}-${item.data}`} className="flex items-start gap-2.5 border-l-2 border-border py-1.5 pl-3">
              <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5", COR[item.tipo] ?? "bg-muted text-muted-foreground")}>
                {ICONE[item.tipo]}
              </span>
              <div className="min-w-0 flex-1 text-[13px] leading-snug">
                <p className="break-words">
                  <span className="font-medium">{item.titulo}</span>
                  <span className="ml-2 font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    {formatarSoData(item.data)}
                    {item.fim && item.fim !== item.data && ` a ${formatarSoData(item.fim)}`}
                  </span>
                </p>
                {item.detalhe && <p className="line-clamp-2 break-words text-muted-foreground">{item.detalhe}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
