import type { EscalaItem, Instrumento, TipoDeAvaliacao, ValorLancado } from "./use-notas";

/**
 * Contas da tela de lançamento. O servidor é quem manda: isto só mostra a média na hora em que a
 * pessoa digita, com a mesma regra do contrato (média ponderada dos instrumentos com nota lançada,
 * 1 casa, meio para cima; no conceito, o de valor mais próximo, empate para o maior).
 */

/** Meio para cima em 1 casa, sem o erro de 7,05 * 10 = 70,49999. */
export function arredondar1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** "7,5" ou "7.5" vira 7.5. Vazio é null; texto que não é número é NaN (inválido). */
export function lerNota(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  if (!/^\d+(\.\d+)?$/.test(limpo)) return Number.NaN;
  return Number(limpo);
}

/** 7.5 -> "7,5"; 10 -> "10"; null -> "". */
export function formatarNota(n: number | null | undefined): string {
  if (n == null) return "";
  return arredondar1(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** O conceito cujo valor está mais perto do número (empate: o maior). */
export function conceitoMaisProximo(media: number, escala: EscalaItem[]): EscalaItem | null {
  let melhor: EscalaItem | null = null;
  for (const item of escala) {
    if (
      melhor == null ||
      Math.abs(item.valor - media) < Math.abs(melhor.valor - media) ||
      (Math.abs(item.valor - media) === Math.abs(melhor.valor - media) && item.valor > melhor.valor)
    ) {
      melhor = item;
    }
  }
  return melhor;
}

/** Texto que a célula mostra a partir do que o servidor mandou. */
export function textoDaCelula(valor: ValorLancado, tipo: TipoDeAvaliacao): string {
  if (valor == null) return "";
  if (tipo === "Nota") return typeof valor === "number" ? formatarNota(valor) : String(valor).replace(".", ",");
  return String(valor);
}

export interface MediaCalculada {
  media: number | null;
  conceito: string | null;
}

/** Média do aluno a partir do que está digitado (texto por instrumento). */
export function mediaDoAluno(
  textos: Record<string, string>,
  instrumentos: Instrumento[],
  tipo: TipoDeAvaliacao,
  escala: EscalaItem[]
): MediaCalculada {
  let soma = 0;
  let pesos = 0;
  for (const inst of instrumentos) {
    const texto = (textos[inst.id] ?? "").trim();
    if (texto === "") continue;
    let valor: number | null = null;
    if (tipo === "Nota") {
      const n = lerNota(texto);
      valor = n == null || Number.isNaN(n) || n > 10 ? null : n;
    } else {
      valor = escala.find((e) => e.sigla.toLowerCase() === texto.toLowerCase())?.valor ?? null;
    }
    if (valor == null) continue;
    soma += valor * inst.peso;
    pesos += inst.peso;
  }
  if (pesos === 0) return { media: null, conceito: null };
  const media = arredondar1(soma / pesos);
  return { media, conceito: tipo === "Conceito" ? (conceitoMaisProximo(media, escala)?.sigla ?? null) : null };
}

/** Cor da nota: abaixo da média mínima chama atenção. */
export function abaixoDaMedia(media: number | null | undefined, minima: number | null | undefined): boolean {
  return media != null && minima != null && media < minima;
}
