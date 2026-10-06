"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { lerNumeroBr, numeroParaCampo } from "@/lib/finance/precificacao-formatar";
import { cn } from "@/lib/utils";

/** O campo mostra duas casas: valor do servidor com mais casas conta como igual ao texto dele. */
function mesmoNumero(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 0.005;
}

/**
 * Campo numérico em pt-BR: aceita vírgula ("12,5") e ponto, e devolve o número.
 *
 * É de texto de propósito: `type="number"` exige ponto decimal e some com o que a pessoa digita
 * enquanto o valor ainda não é válido ("12," vira vazio). O texto fica aqui dentro; o pai só vê o
 * número. Se o pai trocar o valor por fora (um botão "usar x%"), o texto acompanha.
 */
export function CampoNumerico({
  valor,
  onChange,
  sufixo,
  id,
  className,
  placeholder,
  disabled,
  ariaLabel,
  min,
  max,
}: {
  valor: number | null;
  onChange: (valor: number | null) => void;
  /** "%", "alunos"… — fica à direita, dentro do campo. */
  sufixo?: string;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  min?: number;
  max?: number;
}) {
  const [texto, setTexto] = useState(() => numeroParaCampo(valor));

  // Valor trocado por fora: o texto acompanha. Enquanto a pessoa digita, o texto lido é igual ao
  // valor do pai e nada muda ("12," continua "12,").
  if (!mesmoNumero(lerNumeroBr(texto), valor)) setTexto(numeroParaCampo(valor));

  function limitar(n: number | null): number | null {
    if (n === null) return null;
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  }

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="decimal"
        value={texto}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          const bruto = e.target.value;
          setTexto(bruto);
          const lido = lerNumeroBr(bruto);
          const limitado = limitar(lido);
          onChange(limitado);
          // Fora do limite: o texto acompanha o limite na hora.
          if (limitado !== lido) setTexto(numeroParaCampo(limitado));
        }}
        onBlur={() => setTexto(numeroParaCampo(valor))}
        className={cn("text-right font-mono tabular-nums", sufixo && "pr-9", className)}
      />
      {sufixo && (
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          {sufixo}
        </span>
      )}
    </div>
  );
}
