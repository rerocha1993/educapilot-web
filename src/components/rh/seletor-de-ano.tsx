"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/** Ano de consulta: do próximo ano até cinco anos atrás. */
export function SeletorDeAno({
  valor,
  onChange,
  className,
}: {
  valor: number;
  onChange: (ano: number) => void;
  className?: string;
}) {
  const atual = Number(hojeIsoBrasilia().slice(0, 4));
  const anos = Array.from({ length: 7 }, (_, i) => atual + 1 - i);
  if (!anos.includes(valor)) anos.push(valor);

  return (
    <Select value={String(valor)} onValueChange={(v) => v && onChange(Number(v))}>
      <SelectTrigger aria-label="Ano" className={cn("w-full md:w-28", className)}>
        <SelectValue>{() => String(valor)}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {anos
          .sort((a, b) => b - a)
          .map((ano) => (
            <SelectItem key={ano} value={String(ano)}>
              {ano}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
