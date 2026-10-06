"use client";

import { useMemo } from "react";

import {
  cobreODia,
  DIAS_DA_SEMANA_CURTOS,
  diaPorExtenso,
  horaCurta,
  NOMES_DOS_MESES,
  semanasDoMes,
} from "@/lib/tasks/calendario-datas";
import { ROTULO_DO_TIPO, TIPOS_DE_EVENTO, type EventoDto } from "@/lib/tasks/use-calendario";
import { cn } from "@/lib/utils";

import { ESTILO_DO_TIPO } from "./estilo-do-tipo";

/** Quantos chips cabem num dia antes do "+N". */
const CHIPS_POR_DIA = 3;

/**
 * A grade do mês, de domingo a sábado.
 *
 * Só aparece a partir de md: no celular a página mostra a lista por dia no lugar. Os dias dos
 * meses vizinhos completam a semana e ficam esmaecidos, sem eventos — o servidor só entrega o
 * mês aberto, e mostrar um pedaço dos vizinhos seria dado pela metade.
 *
 * O dia inteiro é clicável para quem pode criar (o número do dia é um botão, para o teclado
 * chegar lá); os chips são botões próprios e param a propagação, senão abrir um evento também
 * abriria "novo evento".
 */
export function VisaoMes({
  ano,
  mes,
  eventos,
  hoje,
  podeCriar,
  onNovo,
  onAbrir,
  onVerDia,
}: {
  ano: number;
  mes: number;
  eventos: EventoDto[];
  hoje: string;
  podeCriar: boolean;
  onNovo: (dia: string) => void;
  onAbrir: (evento: EventoDto) => void;
  onVerDia: (dia: string) => void;
}) {
  const semanas = useMemo(() => semanasDoMes(ano, mes), [ano, mes]);

  return (
    <div className="max-md:hidden">
      <div
        role="grid"
        aria-label={`Calendário de ${NOMES_DOS_MESES[mes - 1]} de ${ano}`}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div role="row" className="grid grid-cols-7 border-b border-border bg-muted/60">
          {DIAS_DA_SEMANA_CURTOS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="px-2 py-2 text-[11px] font-bold tracking-[.12em] text-muted-foreground uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        {semanas.map((semana) => (
          <div
            key={semana[0].iso}
            role="row"
            className="grid grid-cols-7 border-b border-border last:border-b-0"
          >
            {semana.map((d) => {
              const doDia = d.doMes ? eventos.filter((e) => cobreODia(e, d.iso)) : [];
              const visiveis = doDia.slice(0, CHIPS_POR_DIA);
              const resto = doDia.length - visiveis.length;
              const ehHoje = d.iso === hoje;
              const clicavel = podeCriar && d.doMes;

              return (
                <div
                  key={d.iso}
                  role="gridcell"
                  onClick={clicavel ? () => onNovo(d.iso) : undefined}
                  className={cn(
                    "flex min-h-[118px] min-w-0 flex-col gap-1 border-r border-border p-1.5 last:border-r-0",
                    !d.doMes && "bg-muted/40",
                    clicavel && "cursor-pointer transition-colors hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center">
                    {clicavel ? (
                      <button
                        type="button"
                        aria-label={`Novo evento em ${diaPorExtenso(d.iso)}`}
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-[12.5px] font-medium tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          ehHoje && "bg-primary font-semibold text-primary-foreground"
                        )}
                      >
                        {d.dia}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-[12.5px] font-medium tabular-nums",
                          !d.doMes && "text-muted-foreground/60",
                          ehHoje && "bg-primary font-semibold text-primary-foreground"
                        )}
                      >
                        {d.dia}
                      </span>
                    )}
                  </div>

                  {visiveis.map((e) => (
                    <ChipDoEvento key={e.id} evento={e} onAbrir={onAbrir} />
                  ))}

                  {resto > 0 && (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onVerDia(d.iso);
                      }}
                      aria-label={`Ver os ${doDia.length} eventos de ${diaPorExtenso(d.iso)}`}
                      className="rounded-md px-1.5 py-0.5 text-left text-[11.5px] font-semibold text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      +{resto} {resto === 1 ? "evento" : "eventos"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda: as cores sozinhas não bastam para dois pares de tipos parecidos, e o ícone é o
          que desfaz a dúvida. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {TIPOS_DE_EVENTO.map((t) => {
          const Icone = ESTILO_DO_TIPO[t].icone;
          return (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", ESTILO_DO_TIPO[t].ponto)} />
              <Icone aria-hidden className="size-3" />
              {ROTULO_DO_TIPO[t]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChipDoEvento({
  evento,
  onAbrir,
}: {
  evento: EventoDto;
  onAbrir: (evento: EventoDto) => void;
}) {
  const estilo = ESTILO_DO_TIPO[evento.tipo];
  const Icone = estilo.icone;
  const hora = !evento.diaInteiro ? horaCurta(evento.horaInicio) : null;

  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onAbrir(evento);
      }}
      title={`${evento.titulo} · ${ROTULO_DO_TIPO[evento.tipo]}`}
      aria-label={`${evento.titulo}, ${ROTULO_DO_TIPO[evento.tipo]}${hora ? `, às ${hora}` : ""}`}
      className={cn(
        "relative flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-[5px] py-[3px] pr-1.5 pl-2 text-left text-[11.5px] leading-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        estilo.chip
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", estilo.barra)} />
      <Icone aria-hidden className="size-3 shrink-0" />
      {hora && <span className="shrink-0 font-mono tabular-nums">{hora}</span>}
      <span className="min-w-0 truncate font-medium">{evento.titulo}</span>
    </button>
  );
}
