"use client";

import { cn } from "@/lib/utils";
import type { LeadResumo } from "@/lib/matriculas/tipos";
import { esperaEmTexto, iniciais } from "@/lib/matriculas/rotulos";

/**
 * Quem a assistente passou para a equipe e ainda espera resposta, o mais antigo primeiro.
 *
 * Faixa própria acima do quadro, e não uma coluna: a espera acontece em qualquer etapa, e mover o card
 * de coluna faria perder a posição dele no funil para ganhar um aviso. No CRM do Colégio a passagem
 * funcionava e ninguém via: a família continuava escrevendo depois do repasse e nada era lido.
 */
export function Esteira({
  leads,
  prazoMinutos,
  onAbrir,
}: {
  leads: LeadResumo[];
  prazoMinutos: number;
  onAbrir: (id: string) => void;
}) {
  if (leads.length === 0) return null;
  const estourados = leads.filter((l) => l.nivelDaEspera === "Estourado").length;

  return (
    <section
      aria-label="Famílias aguardando a equipe"
      className="flex flex-col gap-2.5 rounded-[20px] border border-action-border bg-action-soft/60 p-3 md:flex-row md:items-center"
    >
      <div className="flex shrink-0 items-center gap-2 md:w-48 md:flex-col md:items-start md:gap-0.5">
        <p className="text-sm font-semibold text-action-soft-foreground">
          {leads.length} {leads.length === 1 ? "família espera" : "famílias esperam"} a equipe
        </p>
        <p className="text-xs text-action-soft-foreground/80">
          {estourados === 0
            ? `Prazo da escola: ${prazoMinutos} min`
            : `${estourados} ${estourados === 1 ? "passou" : "passaram"} de ${prazoMinutos} min`}
        </p>
      </div>
      <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] md:mx-0 md:px-0">
        <ul className="flex w-max gap-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onAbrir(lead.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-left shadow-[0_1px_2px_rgba(42,37,48,.06)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  lead.nivelDaEspera === "Estourado" && "ring-1 ring-destructive-border"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[11px] font-semibold",
                    lead.nivelDaEspera === "Estourado"
                      ? "bg-destructive text-destructive-foreground"
                      : lead.nivelDaEspera === "Atencao"
                        ? "bg-action text-action-foreground"
                        : "bg-accent text-accent-foreground"
                  )}
                >
                  {iniciais(lead.nomeResponsavel)}
                </span>
                <span className="max-w-40 truncate text-[13px] font-medium">{lead.nomeResponsavel}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {esperaEmTexto(lead.minutosEsperando ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
