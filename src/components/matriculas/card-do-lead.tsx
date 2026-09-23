"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { Bot, Headset, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadResumo } from "@/lib/matriculas/tipos";
import {
  PERIODO_CURTO,
  ROTULO_DA_ORIGEM,
  SINAL_CURTO,
  TOM_DO_SINAL,
  esperaEmTexto,
  idadeCurta,
  iniciais,
  partesDaVisita,
  tempoDesde,
} from "@/lib/matriculas/rotulos";

// Cor do avatar: a mesma família tem sempre a mesma cor, em qualquer tela.
const CORES_DO_AVATAR = ["#5C4B8C", "#E8730F", "#3F7CC4", "#2E6B4F", "#A8321F", "#7A5AC8", "#C96A05", "#4A3C73"];
function corDoAvatar(id: string) {
  let soma = 0;
  for (const c of id) soma = (soma + c.charCodeAt(0)) % 997;
  return CORES_DO_AVATAR[soma % CORES_DO_AVATAR.length];
}

interface Props extends HTMLAttributes<HTMLDivElement> {
  lead: LeadResumo;
  /** Date.now() da última renderização do quadro; mantém "há X" consistente entre os cards. */
  agora: number;
  /** É a cópia que segue o dedo ou o mouse. */
  levantado?: boolean;
  /** É o lugar de onde o card saiu, enquanto ele é arrastado. */
  vazio?: boolean;
  /**
   * A assistente de IA está ligada nesta escola. Sem ela, "Assistente respondendo" seria mentira: o
   * estado padrão do lead é Assistente, mas ninguém está respondendo.
   */
  assistenteAtiva?: boolean;
}

/**
 * O card de uma família no funil.
 *
 * Mostra o que a equipe precisa decidir sem abrir a ficha: quem está falando com a família agora (e
 * há quanto tempo ela espera), quando é a visita, de onde veio e se o card está parado.
 */
export const CardDoLead = forwardRef<HTMLDivElement, Props>(function CardDoLead(
  { lead, agora, levantado, vazio, assistenteAtiva = false, className, ...resto },
  ref
) {
  const idade = idadeCurta(lead.idadeEmMeses);
  const visita = lead.visitaEm ? partesDaVisita(lead.visitaEm) : null;
  const visitaPassou = lead.visitaEm ? new Date(lead.visitaEm).getTime() < agora : false;
  const ultima = tempoDesde(lead.ultimaInteracaoEm ?? lead.criadoEm, agora);

  return (
    <div
      ref={ref}
      {...resto}
      className={cn(
        "group/card relative flex flex-col gap-2.5 rounded-[18px] border border-foreground/[.06] bg-card p-3.5 text-left shadow-[0_1px_2px_rgba(42,37,48,.05),0_2px_8px_rgba(42,37,48,.04)] outline-none",
        "transition-[box-shadow,transform,opacity] duration-200 ease-out",
        "hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(42,37,48,.06),0_10px_24px_-8px_rgba(42,37,48,.16)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "cursor-grab touch-manipulation select-none active:cursor-grabbing",
        levantado &&
          "rotate-[2.5deg] scale-[1.04] cursor-grabbing shadow-[0_28px_60px_-12px_rgba(46,28,84,.32),0_10px_24px_-8px_rgba(46,28,84,.18)] hover:translate-y-0",
        vazio && "opacity-30",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl font-heading text-[13px] font-semibold text-white"
          style={{ background: corDoAvatar(lead.id) }}
        >
          {iniciais(lead.nomeResponsavel)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{lead.nomeResponsavel}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.nomeCrianca ?? "Criança sem nome ainda"}
            {idade && ` · ${idade}`}
          </p>
        </div>
        {ultima && (
          <span className="self-start whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground/80">
            {ultima}
          </span>
        )}
      </div>

      {(lead.turmaNome || lead.periodo || lead.frio || lead.visitasReagendadas > 0) && (
        <div className="flex flex-wrap gap-1">
          {lead.turmaNome && <Chip tom="marca">{lead.turmaNome}</Chip>}
          {lead.periodo && <Chip>{PERIODO_CURTO[lead.periodo]}</Chip>}
          {lead.frio && (
            <Chip tom="frio">
              <Snowflake className="size-3" aria-hidden />
              Frio
            </Chip>
          )}
          {lead.visitasReagendadas > 0 && <Chip>Remarcou {lead.visitasReagendadas}×</Chip>}
        </div>
      )}

      <EstadoDoAtendimento lead={lead} assistenteAtiva={assistenteAtiva} />

      {lead.aguardandoEquipeDesde && lead.motivoRepasse && (
        <p className="line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Motivo: </span>
          {lead.motivoRepasse}
        </p>
      )}

      {visita && (
        <div className="flex items-center gap-2.5 rounded-xl bg-foreground/[.04] px-2.5 py-2">
          <div className="w-[34px] shrink-0 overflow-hidden rounded-lg bg-card text-center shadow-[0_1px_2px_rgba(42,37,48,.08)]">
            <span className="block bg-destructive py-px text-[8.5px] font-bold tracking-[.06em] text-white">{visita.semana}</span>
            <span className="block font-heading text-sm leading-[1.35]">{visita.dia}</span>
          </div>
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-foreground">
              {visitaPassou ? "Visita foi às" : "Visita às"} {visita.hora}
            </p>
            <p className="text-muted-foreground">
              {visita.dia} de {visita.mes}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-foreground/[.06] pt-2 text-[11.5px] text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{ROTULO_DA_ORIGEM[lead.origem]}</span>
        {lead.sinal && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold",
              TOM_DO_SINAL[lead.sinal] === "bom" && "bg-success-soft text-success-soft-foreground",
              TOM_DO_SINAL[lead.sinal] === "neutro" && "bg-foreground/[.06] text-foreground/70",
              TOM_DO_SINAL[lead.sinal] === "risco" && "bg-destructive-soft text-destructive-soft-foreground"
            )}
          >
            {SINAL_CURTO[lead.sinal]}
          </span>
        )}
        <span className="shrink-0 font-mono tabular-nums" title="Dias nesta etapa">
          {lead.diasNaEtapa}d
        </span>
      </div>
    </div>
  );
});

function Chip({ children, tom }: { children: React.ReactNode; tom?: "marca" | "frio" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tom === "marca" && "bg-accent text-accent-foreground",
        tom === "frio" && "bg-[#E6EEF8] text-[#3F6C9E] dark:bg-[#1E2A3A] dark:text-[#8FB5E0]",
        !tom && "bg-foreground/[.06] text-foreground/70"
      )}
    >
      {children}
    </span>
  );
}

function EstadoDoAtendimento({ lead, assistenteAtiva }: { lead: LeadResumo; assistenteAtiva: boolean }) {
  // Espera é o que tem hora de início. A equipe pode estar com a conversa e já ter respondido.
  if (lead.aguardandoEquipeDesde) {
    const estourado = lead.nivelDaEspera === "Estourado";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-[11px] px-2.5 py-1.5 text-xs font-semibold",
          estourado ? "bg-destructive-soft text-destructive-soft-foreground" : "bg-action-soft text-action-soft-foreground"
        )}
      >
        <span className="relative size-[7px] shrink-0 rounded-full bg-current">
          <span className="absolute -inset-1 animate-ping rounded-full border-2 border-current opacity-60 motion-reduce:hidden" />
        </span>
        Aguardando a equipe
        {lead.minutosEsperando != null && (
          <span className="ml-auto font-mono font-medium tabular-nums">{esperaEmTexto(lead.minutosEsperando)}</span>
        )}
      </div>
    );
  }

  if (lead.atendimento === "Equipe") {
    return (
      <div className="flex items-center gap-2 rounded-[11px] bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success-soft-foreground">
        <Headset className="size-3.5" aria-hidden />
        Equipe no atendimento
      </div>
    );
  }

  if (lead.atendimento === "Encerrado") {
    return (
      <div className="flex items-center gap-2 rounded-[11px] bg-foreground/[.04] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
        <Headset className="size-3.5" aria-hidden />
        Conversa encerrada
      </div>
    );
  }

  if (!assistenteAtiva) return null;

  return (
    <div className="flex items-center gap-2 rounded-[11px] bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">
      <Bot className="size-3.5" aria-hidden />
      Assistente respondendo
    </div>
  );
}
