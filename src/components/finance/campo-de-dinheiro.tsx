"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de dinheiro em real: a pessoa digita os números e a vírgula aparece sozinha.
 *
 * O campo era `type="number"`, que no Brasil é um problema de verdade: ele exige ponto como
 * separador decimal ("1768.29"), e quem trabalha com dinheiro aqui digita vírgula. Resultado:
 * ou o valor era recusado, ou entrava errado — e errado, aqui, é mensalidade errada na conta da
 * família.
 *
 * O texto é montado a partir dos centavos: digitar "176829" mostra "1.768,29". Não existe estado
 * intermediário inválido, e apagar volta pelo mesmo caminho.
 */
export function CampoDeDinheiro({
  valorEmCentavos,
  onChange,
  id,
  className,
  placeholder = "0,00",
}: {
  valorEmCentavos: number | null;
  onChange: (centavos: number | null) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}) {
  const texto =
    valorEmCentavos == null
      ? ""
      : (valorEmCentavos / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        // inputMode numérico abre o teclado de números no celular sem herdar as setinhas e a
        // validação do type="number", que é justamente o que atrapalhava.
        inputMode="numeric"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "");
          onChange(digitos === "" ? null : Number(digitos));
        }}
        className={cn("pl-9 text-right font-mono tabular-nums", className)}
      />
    </div>
  );
}

/** Reais a partir dos centavos guardados no campo. */
export function emReais(centavos: number | null): number {
  return centavos == null ? 0 : centavos / 100;
}

/** Centavos a partir do valor que veio do servidor. */
export function emCentavos(reais: number | null | undefined): number | null {
  return reais == null ? null : Math.round(reais * 100);
}
