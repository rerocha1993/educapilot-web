"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { capitalizar, diaComSemana } from "@/lib/tasks/calendario-datas";
import type { EventoDto } from "@/lib/tasks/use-calendario";

import { LinhaDoEvento } from "./visao-lista";

/**
 * Todos os eventos de um dia — é onde o "+N" da grade leva, já que a célula só comporta três.
 */
export function DialogDoDia({
  dia,
  eventos,
  podeCriar,
  onAbrir,
  onNovo,
  onFechar,
}: {
  dia: string;
  eventos: EventoDto[];
  podeCriar: boolean;
  onAbrir: (evento: EventoDto) => void;
  onNovo: (dia: string) => void;
  onFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{capitalizar(diaComSemana(dia))}</DialogTitle>
          <DialogDescription>
            {eventos.length} {eventos.length === 1 ? "evento" : "eventos"} neste dia.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {eventos.map((e) => (
            <li key={e.id}>
              <LinhaDoEvento evento={e} onAbrir={onAbrir} />
            </li>
          ))}
        </ul>

        {podeCriar && (
          <Button variant="outline" onClick={() => onNovo(dia)}>
            <Plus className="size-4" />
            Novo evento neste dia
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
