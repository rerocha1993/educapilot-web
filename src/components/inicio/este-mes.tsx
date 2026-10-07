"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { EtiquetaDoTipo } from "@/components/tasks/calendario/etiqueta-do-tipo";
import { Skeleton } from "@/components/ui/skeleton";
import { competenciaDeIso, hojeIsoBrasilia } from "@/lib/format/date";
import {
  diaDe,
  diaEMes,
  faixaDeHorario,
  NOMES_DOS_MESES,
} from "@/lib/tasks/calendario-datas";
import { ROTULO_DO_TIPO, useResumoDoMes, type EventoDto } from "@/lib/tasks/use-calendario";
import { cn } from "@/lib/utils";

/** Quantas linhas o cartão mostra; o resto fica no calendário. */
const LINHAS_VISIVEIS = 6;

/**
 * O bloco "Este mês" da tela Início: os próximos eventos do calendário escolar.
 *
 * Lê o resumo do mês (GET /api/Calendario/resumo-do-mes), que o servidor já recorta pelas turmas
 * da professora. "Próximos" quer dizer os que ainda não terminaram: um evento de três dias que
 * começou ontem continua na lista até o último dia.
 *
 * Datas ficam como texto "yyyy-MM-dd" do começo ao fim (ver lib/tasks/calendario-datas).
 */
export function EsteMes() {
  const hoje = hojeIsoBrasilia();
  const { ano, mes } = competenciaDeIso(hoje);
  const { data, isLoading, isError } = useResumoDoMes(ano, mes);

  const proximos = (data?.eventos ?? []).filter((e) => diaDe(e.fim) >= hoje);
  const visiveis = proximos.slice(0, LINHAS_VISIVEIS);
  const nomeDoMes = NOMES_DOS_MESES[mes - 1];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-muted px-4.5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-[17px] font-semibold md:text-[15.5px]">Este mês</span>
          {data && proximos.length > 0 && (
            <EtiquetaDoCartao tom="action">{proximos.length}</EtiquetaDoCartao>
          )}
        </div>
        <Link
          href="/calendario"
          className="inline-flex min-h-10 items-center text-[13px] font-semibold text-primary hover:underline md:min-h-8 md:text-[12.5px]"
        >
          Ver calendário
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-4.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-4.5 py-6 text-[13.5px] text-muted-foreground">
          Não foi possível carregar o calendário agora.
        </p>
      ) : proximos.length === 0 ? (
        <div className="flex items-center gap-3 px-4.5 py-6">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <CalendarDays className="size-4" />
          </span>
          <p className="text-[14px] text-muted-foreground">
            Nenhum evento a caminho em {nomeDoMes}.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1 p-2.5">
          {visiveis.map((e) => (
            <LinhaDoMes key={e.id} evento={e} hoje={hoje} />
          ))}
          {proximos.length > visiveis.length && (
            <li>
              <Link
                href="/calendario"
                className="inline-flex min-h-10 items-center px-2.5 text-[13px] font-semibold text-primary hover:underline md:min-h-8 md:text-[12.5px]"
              >
                Ver todos ({proximos.length})
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function LinhaDoMes({ evento, hoje }: { evento: EventoDto; hoje: string }) {
  const inicio = diaDe(evento.inicio);
  const fim = diaDe(evento.fim);
  // Em andamento (começou e ainda não terminou) conta como hoje: é o que a pessoa quer ver.
  const acontecendo = inicio <= hoje && hoje <= fim;
  const data = inicio === fim ? diaEMes(inicio) : `${diaEMes(inicio)} a ${diaEMes(fim)}`;
  const horario = evento.diaInteiro ? null : faixaDeHorario(evento.horaInicio, evento.horaFim);
  const turmas =
    evento.escolaToda || evento.turmas.length === 0
      ? "Escola toda"
      : evento.turmas.map((t) => t.nome).join(", ");

  return (
    <li
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg px-2 py-2",
        acontecendo && "bg-action-soft"
      )}
    >
      <span
        className={cn(
          "w-[5.5rem] shrink-0 font-mono text-[12.5px] tabular-nums",
          acontecendo ? "font-semibold text-action-soft-foreground" : "text-muted-foreground"
        )}
      >
        {data}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium md:text-[13.5px]">
          {evento.titulo}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground md:text-[12px]">
          <span className="sm:hidden">{ROTULO_DO_TIPO[evento.tipo]} · </span>
          {[horario, turmas].filter(Boolean).join(" · ")}
        </span>
      </span>
      <EtiquetaDoTipo tipo={evento.tipo} className="max-sm:hidden" />
    </li>
  );
}
