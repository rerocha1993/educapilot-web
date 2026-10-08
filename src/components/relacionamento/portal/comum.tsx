import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Paperclip } from "lucide-react";

import { ESTILO_DO_TIPO } from "@/components/tasks/calendario/estilo-do-tipo";
import { formatarData } from "@/lib/format/date";
import type { AgendaItem, AvisoResumo } from "@/lib/relacionamento/use-portal-familia";
import { diaEMes, faixaDeHorario } from "@/lib/tasks/calendario-datas";
import { ROTULO_DO_TIPO, tipoConhecido } from "@/lib/tasks/use-calendario";
import { cn } from "@/lib/utils";

/** Seção do portal: título pequeno, um link opcional à direita e o conteúdo embaixo. */
export function SecaoDoPortal({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: { href: string; rotulo: string };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[16px] font-semibold tracking-[-.02em]">{titulo}</h2>
        {acao && (
          <Link
            href={acao.href}
            className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-primary"
          >
            {acao.rotulo} <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Erro de carga, com o botão de tentar de novo no tamanho do dedo. */
export function ErroDoPortal({ texto, onTentar }: { texto: string; onTentar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-1 rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground"
    >
      <p>{texto}</p>
      {onTentar && (
        <button type="button" onClick={onTentar} className="min-h-11 self-start font-semibold underline">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

/** Quadro de "nada por aqui", sem o ar de erro. */
export function VazioDoPortal({ titulo, texto, icone }: { titulo: string; texto?: string; icone?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-dashed bg-card px-5 py-7 text-center">
      {icone && (
        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-[18px]">
          {icone}
        </span>
      )}
      <p className="mt-3 font-heading text-[15px] font-semibold">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-[1.55] text-muted-foreground">{texto}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ agenda

/**
 * Como cada origem se apresenta. O calendário da escola usa a cor do tipo do evento (a mesma da
 * agenda da equipe); a rotina da turma fica neutra; o evento publicado leva o laranja, que é
 * onde a família tem uma decisão a tomar.
 */
function estiloDaOrigem(item: AgendaItem): { chip: string; barra: string; rotulo: string } {
  if (item.origem === "calendario") {
    const tipo = tipoConhecido(item.tipo ?? "");
    return { chip: ESTILO_DO_TIPO[tipo].chip, barra: ESTILO_DO_TIPO[tipo].barra, rotulo: ROTULO_DO_TIPO[tipo] };
  }
  if (item.origem === "evento") {
    return { chip: "bg-action-soft text-action-soft-foreground", barra: "bg-action", rotulo: "Evento" };
  }
  return { chip: "bg-muted text-muted-foreground", barra: "bg-muted-foreground/40", rotulo: "Rotina" };
}

export function LinhaDaAgenda({ item, comData = false }: { item: AgendaItem; comData?: boolean }) {
  const estilo = estiloDaOrigem(item);
  const horario = faixaDeHorario(item.horaInicio, item.horaFim);

  const corpo = (
    <div className="flex min-h-14 items-stretch gap-3 rounded-xl border border-border bg-card p-3">
      <span aria-hidden className={cn("w-1 shrink-0 rounded-full", estilo.barra)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
              estilo.chip
            )}
          >
            {estilo.rotulo}
          </span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {comData && item.data && <>{diaEMes(item.data)} · </>}
            {horario ?? "Dia todo"}
          </span>
        </div>
        <p className="mt-1 text-[15px] leading-snug font-medium break-words">{item.titulo}</p>
        {(item.turma || item.local) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
            {item.turma && <span>{item.turma}</span>}
            {item.local && (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-3" /> {item.local}
              </span>
            )}
          </p>
        )}
      </div>
      {item.publicacaoId && <ChevronRight aria-hidden className="size-4 shrink-0 self-center text-muted-foreground" />}
    </div>
  );

  return item.publicacaoId ? (
    <Link
      href={`/responsavel/avisos/${item.publicacaoId}`}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {corpo}
    </Link>
  ) : (
    corpo
  );
}

// ------------------------------------------------------------------ avisos

export function ItemDeAviso({ aviso }: { aviso: AvisoResumo }) {
  const ehEvento = aviso.tipo === "Evento";

  return (
    <Link
      href={`/responsavel/avisos/${aviso.id}`}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <article className="flex min-h-16 gap-3 rounded-xl border border-border bg-card p-3">
        {/* O ponto de não lido tem texto para leitor de tela: a cor sozinha não conta. */}
        <span className="mt-1.5 flex size-2.5 shrink-0 items-center justify-center">
          {!aviso.lida && (
            <>
              <span aria-hidden className="size-2.5 rounded-full bg-action" />
              <span className="sr-only">Não lido</span>
            </>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
                ehEvento ? "bg-success-soft text-success-soft-foreground" : "bg-accent text-accent-foreground"
              )}
            >
              {aviso.tipo}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {aviso.publicadaEm ? formatarData(aviso.publicadaEm) : ""}
            </span>
            {aviso.anexos > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Paperclip aria-hidden className="size-3" /> {aviso.anexos}
                <span className="sr-only"> {aviso.anexos === 1 ? "anexo" : "anexos"}</span>
              </span>
            )}
          </div>

          <p className={cn("mt-1 text-[15px] leading-snug break-words", aviso.lida ? "font-medium" : "font-bold")}>
            {aviso.titulo}
          </p>
          {aviso.resumo && (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug break-words text-muted-foreground">{aviso.resumo}</p>
          )}

          {ehEvento && aviso.dataDoEvento && (
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
              <CalendarDays aria-hidden className="size-3.5" />
              <span className="tabular-nums">
                {diaEMes(aviso.dataDoEvento)}
                {aviso.horaDoEvento && ` às ${aviso.horaDoEvento}`}
              </span>
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
