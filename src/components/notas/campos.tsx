"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rótulo pequeno em maiúsculas, o mesmo da ficha do aluno, em cima de um controle. */
export function Campo({
  rotulo,
  children,
  className,
}: {
  rotulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground",
        className
      )}
    >
      {rotulo}
      {children}
    </label>
  );
}

export const CLASSE_DO_CONTROLE =
  "h-10 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm font-normal normal-case tracking-normal text-foreground md:h-9 disabled:opacity-50";

/** Seleção nativa (como a da ficha do aluno): leve, funciona bem no celular. */
export function CampoSelect({
  rotulo,
  value,
  onChange,
  opcoes,
  vazio,
  disabled,
  className,
}: {
  rotulo: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: { valor: string; rotulo: string }[];
  /** Texto da opção sem valor ("Escolha…"). Sem ele, não há opção vazia. */
  vazio?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Campo rotulo={rotulo} className={className}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={CLASSE_DO_CONTROLE}
      >
        {vazio != null && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/** Ano letivo corrente: o do calendário. */
export function anoAtual(): number {
  return new Date().getFullYear();
}
