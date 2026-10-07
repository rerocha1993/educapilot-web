"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { capitalizar, deslocarMes, NOMES_DOS_MESES } from "@/lib/tasks/calendario-datas";

/** Mês com setas para ir e voltar, atravessando a virada do ano. */
export function SeletorDeMes({
  ano,
  mes,
  onChange,
}: {
  ano: number;
  mes: number;
  onChange: (competencia: { ano: number; mes: number }) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(deslocarMes(ano, mes, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center font-heading text-[15px] font-semibold">
        {capitalizar(NOMES_DOS_MESES[mes - 1])} de {ano}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(deslocarMes(ano, mes, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
