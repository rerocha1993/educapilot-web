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

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface MesEAno {
  mes: number;
  ano: number;
}

/** Anda um mês para trás ou para frente, virando o ano quando preciso. */
export function mesVizinho({ mes, ano }: MesEAno, passo: -1 | 1): MesEAno {
  const indice = ano * 12 + (mes - 1) + passo;
  return { mes: (indice % 12) + 1, ano: Math.floor(indice / 12) };
}

/**
 * Escolha do mês da tela: setas para o mês anterior e o próximo, e mês e ano em listas para
 * pular direto. Mostra cinco anos para trás e dois para frente (e o ano escolhido, se for outro).
 */
export function SeletorDeMes({
  valor,
  onChange,
  className,
}: {
  valor: MesEAno;
  onChange: (v: MesEAno) => void;
  className?: string;
}) {
  const anoAtual = new Date().getFullYear();
  const primeiro = Math.min(anoAtual - 5, valor.ano);
  const ultimo = Math.max(anoAtual + 2, valor.ano);
  const anos = Array.from({ length: ultimo - primeiro + 1 }, (_, i) => primeiro + i);

  return (
    <div className={className ?? "flex flex-wrap items-center gap-1.5"} role="group" aria-label="Mês em exibição">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        title="Mês anterior"
        onClick={() => onChange(mesVizinho(valor, -1))}
      >
        <ChevronLeft />
      </Button>

      <Select value={String(valor.mes)} onValueChange={(v) => v && onChange({ ...valor, mes: Number(v) })}>
        <SelectTrigger className="w-[8.5rem]" aria-label="Mês">
          <SelectValue>{() => MESES[valor.mes - 1]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MESES.map((nome, i) => (
            <SelectItem key={nome} value={String(i + 1)}>
              {nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(valor.ano)} onValueChange={(v) => v && onChange({ ...valor, ano: Number(v) })}>
        <SelectTrigger className="w-24 font-mono tabular-nums" aria-label="Ano">
          <SelectValue>{() => valor.ano}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        title="Próximo mês"
        onClick={() => onChange(mesVizinho(valor, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
