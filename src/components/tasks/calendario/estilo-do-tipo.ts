import {
  CalendarCheck,
  ClipboardCheck,
  Flag,
  PartyPopper,
  Presentation,
  Shapes,
  TreePalm,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { TipoDeEvento } from "@/lib/tasks/use-calendario";

/**
 * Como cada tipo de evento se apresenta.
 *
 * As cores vêm dos tokens de situação do guia, nunca de hex solto. Dois pares compartilham o
 * mesmo tom por decisão do guia (evento e atividade são verdes; recesso e avaliação ficam em
 * âmbar/laranja, que no tema claro têm o mesmo fundo), então o ícone é o que os distingue —
 * a cor sozinha não carrega o significado.
 */
export interface EstiloDoTipo {
  /** Fundo e texto da etiqueta/chip. */
  chip: string;
  /** Marca sólida de 3px à esquerda do chip. */
  barra: string;
  /** Bolinha da legenda e do cabeçalho do dia. */
  ponto: string;
  icone: LucideIcon;
}

export const ESTILO_DO_TIPO: Record<TipoDeEvento, EstiloDoTipo> = {
  Feriado: {
    chip: "bg-destructive-soft text-destructive-soft-foreground",
    barra: "bg-destructive",
    ponto: "bg-destructive",
    icone: Flag,
  },
  Recesso: {
    chip: "bg-warning-soft text-warning-soft-foreground",
    barra: "bg-warning",
    ponto: "bg-warning",
    icone: TreePalm,
  },
  Reuniao: {
    chip: "bg-accent text-accent-foreground",
    barra: "bg-primary",
    ponto: "bg-primary",
    icone: Users,
  },
  Avaliacao: {
    chip: "bg-action-soft text-action-soft-foreground",
    barra: "bg-action",
    ponto: "bg-action",
    icone: ClipboardCheck,
  },
  Evento: {
    chip: "bg-success-soft text-success-soft-foreground",
    barra: "bg-success",
    ponto: "bg-success",
    icone: PartyPopper,
  },
  Atividade: {
    chip: "bg-success-soft text-success-soft-foreground",
    barra: "bg-success",
    ponto: "bg-success",
    icone: Presentation,
  },
  Letivo: {
    chip: "bg-muted text-muted-foreground",
    barra: "bg-muted-foreground/50",
    ponto: "bg-muted-foreground/60",
    icone: CalendarCheck,
  },
  Outro: {
    chip: "bg-muted text-muted-foreground",
    barra: "bg-muted-foreground/50",
    ponto: "bg-muted-foreground/60",
    icone: Shapes,
  },
};
