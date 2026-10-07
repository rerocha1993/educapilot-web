"use client";

import { cn } from "@/lib/utils";

/**
 * Escolha de uma opção entre poucas, em pílulas dentro de uma faixa `bg-muted` (o mesmo desenho
 * da barra de abas). Cada opção é um botão com `aria-pressed`; no celular tem 44px de altura.
 */
export function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  className,
  cheio = false,
}: {
  /** Nome do grupo para leitor de tela. */
  rotulo: string;
  opcoes: readonly { id: T; rotulo: string }[];
  valor: T;
  onChange: (id: T) => void;
  className?: string;
  /** Ocupa a largura toda, com as opções do mesmo tamanho (formulário e telas dos pais). */
  cheio?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={cn("flex gap-1 rounded-lg bg-muted p-1", cheio ? "w-full" : "w-max max-w-full", className)}
    >
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors md:min-h-8",
            cheio && "flex-1",
            valor === o.id
              ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
              : "font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
