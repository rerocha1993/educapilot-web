"use client";

import { useMemo } from "react";

import {
  diaComSemana,
  diaDe,
  faixaDeDatas,
  faixaDeHorario,
  montarIso,
} from "@/lib/tasks/calendario-datas";
import type { EventoDto } from "@/lib/tasks/use-calendario";
import { cn } from "@/lib/utils";

import { EtiquetaDoTipo } from "./etiqueta-do-tipo";
import { ESTILO_DO_TIPO } from "./estilo-do-tipo";

/** "Escola toda" ou os nomes das turmas. */
export function turmasDoEvento(evento: EventoDto): string {
  if (evento.escolaToda || evento.turmas.length === 0) return "Escola toda";
  return evento.turmas.map((t) => t.nome).join(", ");
}

/**
 * Os eventos do mês agrupados por dia.
 *
 * Evento de vários dias aparece uma vez só, no primeiro dia dele dentro do mês, com a faixa de
 * datas na linha de baixo — repetir um recesso de duas semanas em quatorze dias esconderia o
 * resto da lista. É também a visão do celular: lá a grade não cabe.
 */
export function VisaoLista({
  ano,
  mes,
  eventos,
  hoje,
  onAbrir,
}: {
  ano: number;
  mes: number;
  eventos: EventoDto[];
  hoje: string;
  onAbrir: (evento: EventoDto) => void;
}) {
  const grupos = useMemo(() => {
    const primeiro = montarIso(ano, mes, 1);
    const porDia = new Map<string, EventoDto[]>();

    for (const e of eventos) {
      // Começou antes deste mês: entra no dia 1.
      const dia = diaDe(e.inicio) < primeiro ? primeiro : diaDe(e.inicio);
      porDia.set(dia, [...(porDia.get(dia) ?? []), e]);
    }

    return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ano, mes, eventos]);

  return (
    <ol className="flex flex-col gap-4">
      {grupos.map(([dia, doDia]) => {
        const ehHoje = dia === hoje;
        return (
          <li key={dia}>
            <h3
              className={cn(
                "mb-2 flex items-center gap-2 text-[12px] font-bold tracking-[.1em] uppercase",
                ehHoje ? "text-primary" : "text-muted-foreground"
              )}
            >
              {diaComSemana(dia)}
              {ehHoje && (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10.5px] tracking-normal text-primary-foreground normal-case">
                  Hoje
                </span>
              )}
            </h3>

            <ul className="flex flex-col gap-2">
              {doDia.map((e) => (
                <li key={e.id}>
                  <LinhaDoEvento evento={e} onAbrir={onAbrir} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function LinhaDoEvento({
  evento,
  onAbrir,
}: {
  evento: EventoDto;
  onAbrir: (evento: EventoDto) => void;
}) {
  const horario = evento.diaInteiro ? null : faixaDeHorario(evento.horaInicio, evento.horaFim);
  const variosDias = diaDe(evento.inicio) !== diaDe(evento.fim);
  const detalhes = [
    variosDias ? faixaDeDatas(evento.inicio, evento.fim) : null,
    horario ?? "Dia inteiro",
    turmasDoEvento(evento),
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => onAbrir(evento)}
      className="relative flex min-h-14 w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-card py-3 pr-3.5 pl-4 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", ESTILO_DO_TIPO[evento.tipo].barra)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] leading-snug font-medium break-words md:text-[14px]">
          {evento.titulo}
        </span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground md:text-[12.5px]">
          {detalhes.join(" · ")}
        </span>
      </span>
      <EtiquetaDoTipo tipo={evento.tipo} />
    </button>
  );
}
