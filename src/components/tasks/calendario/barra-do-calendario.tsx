"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalizar, NOMES_DOS_MESES } from "@/lib/tasks/calendario-datas";
import { ROTULO_DO_TIPO, TIPOS_DE_EVENTO, tipoConhecido } from "@/lib/tasks/use-calendario";
import { cn } from "@/lib/utils";

export type VisaoDoCalendario = "mes" | "lista";

const VISOES: { id: VisaoDoCalendario; rotulo: string }[] = [
  { id: "mes", rotulo: "Mês" },
  { id: "lista", rotulo: "Lista" },
];

export const TODAS_AS_TURMAS = "todas";
export const TODOS_OS_TIPOS = "todos";

/**
 * A barra de cima do calendário: mês com setas e "Hoje", a troca Mês | Lista e os dois filtros.
 *
 * A troca de visão some no celular porque lá a grade vira lista de qualquer jeito — um botão que
 * não muda nada seria só ruído.
 */
export function BarraDoCalendario({
  ano,
  mes,
  onAnterior,
  onProximo,
  onHoje,
  visao,
  onVisao,
  turmas,
  filtroTurma,
  onFiltroTurma,
  filtroTipo,
  onFiltroTipo,
}: {
  ano: number;
  mes: number;
  onAnterior: () => void;
  onProximo: () => void;
  onHoje: () => void;
  visao: VisaoDoCalendario;
  onVisao: (visao: VisaoDoCalendario) => void;
  turmas: { id: number; nome: string }[];
  filtroTurma: string;
  onFiltroTurma: (valor: string) => void;
  filtroTipo: string;
  onFiltroTipo: (valor: string) => void;
}) {
  const nomeDoMes = capitalizar(NOMES_DOS_MESES[mes - 1]);
  const turmaEscolhida = turmas.find((t) => String(t.id) === filtroTurma);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            title="Mês anterior"
            onClick={onAnterior}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            title="Próximo mês"
            onClick={onProximo}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={onHoje}>
            Hoje
          </Button>
        </div>

        <h2
          aria-live="polite"
          className="min-w-0 font-heading text-[19px] font-semibold tracking-tight md:text-[20px]"
        >
          {nomeDoMes} <span className="tabular-nums">{ano}</span>
        </h2>

        <div
          role="group"
          aria-label="Visão do calendário"
          className="ml-auto flex w-max gap-1 rounded-lg bg-muted p-1 max-md:hidden"
        >
          {VISOES.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={visao === v.id}
              onClick={() => onVisao(v.id)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors",
                visao === v.id
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {v.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtroTurma} onValueChange={(v) => v && onFiltroTurma(v)}>
          <SelectTrigger aria-label="Filtrar por turma" className="w-[calc(50%-0.25rem)] md:w-48">
            <SelectValue>
              {() => (turmaEscolhida ? turmaEscolhida.nome : "Todas as turmas")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODAS_AS_TURMAS}>Todas as turmas</SelectItem>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={(v) => v && onFiltroTipo(v)}>
          <SelectTrigger aria-label="Filtrar por tipo" className="w-[calc(50%-0.25rem)] md:w-44">
            <SelectValue>
              {() =>
                filtroTipo === TODOS_OS_TIPOS
                  ? "Todos os tipos"
                  : ROTULO_DO_TIPO[tipoConhecido(filtroTipo)]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS_OS_TIPOS}>Todos os tipos</SelectItem>
            {TIPOS_DE_EVENTO.map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_DO_TIPO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
