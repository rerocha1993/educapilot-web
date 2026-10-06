/**
 * Números da precificação: percentuais e entrada de texto em pt-BR.
 *
 * O campo numérico da tela é de texto (type="number" exige ponto decimal, e quem digita aqui
 * escreve vírgula). `lerNumeroBr` aceita "12,5", "12.5", "1.234,56" e "R$ 1.500".
 */

const percentual = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** 12.5 → "12,5%". Ausente vira travessão. */
export function formatarPercentual(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : `${percentual.format(valor)}%`;
}

/** Percentual com sinal explícito, para reajuste: +8,5% / -2%. */
export function formatarReajuste(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${valor > 0 ? "+" : ""}${percentual.format(valor)}%`;
}

export function formatarInteiro(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : inteiro.format(valor);
}

/** Alunos (podem vir fracionados no ponto de equilíbrio): "42" ou "42,5". */
export function formatarAlunos(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : decimal1.format(valor);
}

/** Número para o campo de texto: 12.5 → "12,5"; nulo → "". */
export function numeroParaCampo(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "" : percentual.format(valor).replace(/\./g, "");
}

/**
 * O número que o texto representa, ou nulo se vazio/ilegível.
 *
 * Com vírgula, o ponto é separador de milhar. Sem vírgula, "1.500" (três dígitos depois do ponto)
 * é mil e quinhentos, e "12.5" é doze e meio.
 */
export function lerNumeroBr(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,-]/g, "");
  if (limpo === "" || limpo === "-") return null;

  let normal: string;
  if (limpo.includes(",")) {
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normal = limpo.replace(/\./g, "");
  } else {
    normal = limpo;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}
