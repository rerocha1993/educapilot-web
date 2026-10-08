"use client";

import { useState } from "react";

import { CampoDeDinheiro } from "@/components/finance/campo-de-dinheiro";
import { Label } from "@/components/ui/label";
import {
  diferencaComSinal,
  divisaoSugerida,
  validarDivisao,
  type CampoDaDivisao,
  type DivisaoDaDiferenca,
} from "@/lib/finance/diferenca-do-pagamento";

/**
 * Estado da divisão de uma diferença. Nasce da sugestão (a mais vira juros, a menos vira
 * desconto) e vale até a pessoa editar; se a diferença mudar, volta a sugerir — sem efeito para
 * ressincronizar, porque a edição guarda a diferença para a qual foi feita.
 */
export function useDivisaoDaDiferenca(diferenca: number) {
  const [editada, setEditada] = useState<{ para: number; divisao: DivisaoDaDiferenca } | null>(null);

  const divisao = editada && editada.para === diferenca ? editada.divisao : divisaoSugerida(diferenca);
  const erro = diferenca === 0 ? null : validarDivisao(diferenca, divisao);

  function mudar(campo: CampoDaDivisao, centavos: number | null) {
    setEditada({ para: diferenca, divisao: { ...divisao, [campo]: centavos ?? 0 } });
  }

  return { divisao, mudar, erro };
}

const CAMPOS: { campo: CampoDaDivisao; rotulo: string }[] = [
  { campo: "juros", rotulo: "Juros" },
  { campo: "multa", rotulo: "Multa" },
  { campo: "desconto", rotulo: "Desconto" },
];

/**
 * "Como classificar a diferença?": a diferença entre o valor do lançamento e o que de fato
 * entrou ou saiu, dividida em juros, multa e desconto. Compartilhado por despesa, receita,
 * cobrança e conciliação; a regra e a validação ficam em `diferenca-do-pagamento.ts`.
 *
 * Só aparece quando há diferença. `frase` conta o que aconteceu ("Foi pago R$ 12,00 a mais…").
 */
export function ClassificarDiferenca({
  diferenca,
  divisao,
  onMudar,
  erro,
  frase,
  desabilitado = false,
  idBase = "diferenca",
}: {
  diferenca: number;
  divisao: DivisaoDaDiferenca;
  onMudar: (campo: CampoDaDivisao, centavos: number | null) => void;
  erro: string | null;
  frase?: string;
  desabilitado?: boolean;
  idBase?: string;
}) {
  if (diferenca === 0) return null;

  return (
    <section
      aria-label="Como classificar a diferença"
      className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3.5"
    >
      <div>
        <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
          <span>Como classificar a diferença?</span>
          <span className="font-mono tabular-nums">{diferencaComSinal(diferenca)}</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {frase ?? "O valor não é o do lançamento."} Já deixamos preenchido; mude se for o caso. Juros + multa −
          desconto precisa dar a diferença.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {CAMPOS.map(({ campo, rotulo }) => (
          <div key={campo} className="grid content-start gap-1.5">
            <Label htmlFor={`${idBase}-${campo}`} className="text-xs text-muted-foreground">
              {rotulo}
            </Label>
            <CampoDeDinheiro
              id={`${idBase}-${campo}`}
              valorEmCentavos={divisao[campo]}
              onChange={(c) => onMudar(campo, c)}
              disabled={desabilitado}
            />
          </div>
        ))}
      </div>

      {erro ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {erro}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">A soma fecha com a diferença.</p>
      )}
    </section>
  );
}
