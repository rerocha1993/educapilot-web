/**
 * "Repete todo mês" (F4): limites e a frase de prévia da série, que a tela mostra antes de criar.
 * O servidor cria as parcelas mantendo o dia do vencimento (limitado aos dias de cada mês).
 */

export const MINIMO_DE_MESES = 2;
export const MAXIMO_DE_MESES = 60;
export const PADRAO_DE_MESES = 12;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** A quantidade, se for um número inteiro entre 2 e 60. */
export function mesesValidos(meses: number): boolean {
  return Number.isInteger(meses) && meses >= MINIMO_DE_MESES && meses <= MAXIMO_DE_MESES;
}

function mesEAno(iso: string, somarMeses: number): { mes: number; ano: number; dia: number } {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const indice = ano * 12 + (mes - 1) + somarMeses;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1, dia };
}

function abreviado({ mes, ano }: { mes: number; ano: number }) {
  return `${MESES[mes - 1]}/${ano}`;
}

/**
 * "Serão 12 despesas de R$ 100,00, de out/2026 a set/2027, vencendo todo dia 10." Nulo enquanto
 * faltar vencimento ou a quantidade for inválida.
 */
export function previaDaSerie(vencimento: string, meses: number, valorEmReais: number | null): string | null {
  if (!vencimento || !mesesValidos(meses)) return null;

  const primeira = mesEAno(vencimento, 0);
  const ultima = mesEAno(vencimento, meses - 1);
  const valor =
    valorEmReais && valorEmReais > 0
      ? ` de ${valorEmReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      : "";
  const dia =
    primeira.dia > 28
      ? `vencendo todo dia ${primeira.dia} (no último dia do mês, quando o mês for mais curto)`
      : `vencendo todo dia ${primeira.dia}`;

  return `Serão ${meses} despesas${valor}, de ${abreviado(primeira)} a ${abreviado(ultima)}, ${dia}.`;
}
