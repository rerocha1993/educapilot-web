"use client";

import { useState } from "react";

import { CampoDeDinheiro } from "@/components/finance/campo-de-dinheiro";
import { ClassificarDiferenca, useDivisaoDaDiferenca } from "@/components/finance/classificar-diferenca";
import { Campo } from "@/components/rh/campo";
import {
  corpoDaDivisao,
  diferencaEmCentavos,
  moedaDeCentavos,
  paraCentavos,
} from "@/lib/finance/diferenca-do-pagamento";

/**
 * O "valor pago" de uma baixa e a divisão da diferença, num estado só.
 *
 * Nasce com o valor do lançamento. Se a pessoa muda o valor, a diferença aparece já dividida
 * (a mais vira juros, a menos vira desconto) e ela ajusta. `problema` é a frase do que impede
 * de confirmar, ou nulo; `corpo()` traz os números prontos para a API.
 */
export function useValorPago(valorEmReais: number) {
  const valorEmCentavos = paraCentavos(valorEmReais);
  const [pago, setPago] = useState<number | null>(valorEmCentavos);
  const diferenca = diferencaEmCentavos(pago ?? 0, valorEmCentavos);
  const { divisao, mudar, erro } = useDivisaoDaDiferenca(diferenca);

  return {
    valorEmCentavos,
    pago,
    setPago,
    diferenca,
    divisao,
    mudar,
    erro,
    problema: !pago ? "Informe o valor." : erro,
    corpo: () => corpoDaDivisao(valorEmCentavos, pago ?? 0, divisao),
  };
}

/** O campo do valor pago mais o bloco "Como classificar a diferença?", quando o valor muda. */
export function CamposDoValorPago({
  id,
  estado,
  rotulo = "Valor pago",
  verbo = "pago",
  lancamento = "cobrança",
  desabilitado = false,
}: {
  id: string;
  estado: ReturnType<typeof useValorPago>;
  rotulo?: string;
  verbo?: "pago" | "recebido";
  lancamento?: string;
  desabilitado?: boolean;
}) {
  const { pago, setPago, diferenca, divisao, mudar, erro, valorEmCentavos } = estado;

  return (
    <>
      <Campo
        id={`${id}-valor`}
        rotulo={rotulo}
        dica={diferenca === 0 ? `Igual ao valor da ${lancamento} (${moedaDeCentavos(valorEmCentavos)}). Mude se foi diferente.` : undefined}
      >
        <CampoDeDinheiro id={`${id}-valor`} valorEmCentavos={pago} onChange={setPago} disabled={desabilitado} />
      </Campo>

      <ClassificarDiferenca
        diferenca={diferenca}
        divisao={divisao}
        onMudar={mudar}
        erro={erro}
        desabilitado={desabilitado}
        idBase={`${id}-diferenca`}
        frase={
          diferenca > 0
            ? `Foi ${verbo} ${moedaDeCentavos(diferenca)} a mais que o valor da ${lancamento}.`
            : `Foi ${verbo} ${moedaDeCentavos(-diferenca)} a menos que o valor da ${lancamento}.`
        }
      />
    </>
  );
}
