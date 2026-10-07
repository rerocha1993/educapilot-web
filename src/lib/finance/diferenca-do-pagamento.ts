/**
 * Regra única de "classificar a diferença" (F5): quando o valor que de fato entrou ou saiu não é
 * o valor do lançamento, a diferença se divide em juros, multa e desconto.
 *
 * Vale igual para despesa, receita, cobrança e conciliação, e espelha a regra do servidor:
 * valor pago = valor + juros + multa − desconto. Tudo aqui em CENTAVOS inteiros, para a soma
 * nunca falhar por arredondamento de ponto flutuante.
 */

export interface DivisaoDaDiferenca {
  juros: number;
  multa: number;
  desconto: number;
}

export type CampoDaDivisao = keyof DivisaoDaDiferenca;

export const SEM_DIVISAO: DivisaoDaDiferenca = { juros: 0, multa: 0, desconto: 0 };

const MENOS = "−";

/** "R$ 1.234,56" a partir dos centavos. */
export function moedaDeCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "+ R$ 12,00" ou "− R$ 5,00"; zero sai sem sinal. */
export function diferencaComSinal(centavos: number): string {
  if (centavos === 0) return moedaDeCentavos(0);
  return `${centavos > 0 ? "+" : MENOS} ${moedaDeCentavos(Math.abs(centavos))}`;
}

/** Reais (do servidor) para centavos inteiros. */
export function paraCentavos(reais: number | null | undefined): number {
  return reais == null ? 0 : Math.round(reais * 100);
}

/** Centavos para o número em reais que a API espera. */
export function paraReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

/** Quanto passou (positivo) ou faltou (negativo) do valor do lançamento. */
export function diferencaEmCentavos(pagoEmCentavos: number, valorEmCentavos: number): number {
  return pagoEmCentavos - valorEmCentavos;
}

/**
 * A divisão que já vem preenchida: pago a mais vira juros, pago a menos vira desconto. A pessoa
 * ajusta (por exemplo, parte do acréscimo era multa).
 */
export function divisaoSugerida(diferenca: number): DivisaoDaDiferenca {
  if (diferenca > 0) return { juros: diferenca, multa: 0, desconto: 0 };
  if (diferenca < 0) return { juros: 0, multa: 0, desconto: -diferenca };
  return SEM_DIVISAO;
}

/** O que a divisão soma: juros + multa − desconto. Tem que ser igual à diferença. */
export function totalDaDivisao(d: DivisaoDaDiferenca): number {
  return d.juros + d.multa - d.desconto;
}

/** Mensagem de por que a divisão não fecha com a diferença; nulo quando fecha. */
export function validarDivisao(diferenca: number, d: DivisaoDaDiferenca): string | null {
  if (d.juros < 0 || d.multa < 0 || d.desconto < 0) return "Juros, multa e desconto não podem ser negativos.";
  const soma = totalDaDivisao(d);
  if (soma === diferenca) return null;
  return `A soma não fecha: juros + multa − desconto dá ${diferencaComSinal(soma)}, e a diferença é ${diferencaComSinal(diferenca)}.`;
}

/**
 * Valores para o corpo da API. Sem diferença, só o valor pago (o servidor entende que foi o
 * valor cheio). Com diferença, a divisão vai explícita — os três campos, mesmo zerados —, que é
 * o que o servidor exige para aceitar a divisão que a pessoa escolheu.
 */
export function corpoDaDivisao(
  valorEmCentavos: number,
  pagoEmCentavos: number,
  divisao: DivisaoDaDiferenca
): { valorPago: number; juros?: number; multa?: number; desconto?: number } {
  if (pagoEmCentavos === valorEmCentavos) return { valorPago: paraReais(pagoEmCentavos) };
  return {
    valorPago: paraReais(pagoEmCentavos),
    juros: paraReais(divisao.juros),
    multa: paraReais(divisao.multa),
    desconto: paraReais(divisao.desconto),
  };
}

// ------------------------------------------------------------------ situação pela data

export type TipoDeSituacao = "noDia" | "antecipado" | "atrasado";

export interface SituacaoDoPagamento {
  tipo: TipoDeSituacao;
  dias: number;
}

function diaEmMs(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(ano, (mes ?? 1) - 1, dia ?? 1);
}

/** Dias de calendário entre duas datas "aaaa-mm-dd" (positivo quando `depois` vem depois). */
export function diasEntre(antes: string, depois: string): number {
  return Math.round((diaEmMs(depois) - diaEmMs(antes)) / 86_400_000);
}

/** Em dia, antecipado ou atrasado, comparando o vencimento com a data do pagamento. */
export function situacaoPelaData(vencimento: string, pagamento: string): SituacaoDoPagamento | null {
  if (!vencimento || !pagamento) return null;
  const dias = diasEntre(vencimento, pagamento);
  if (dias > 0) return { tipo: "atrasado", dias };
  if (dias < 0) return { tipo: "antecipado", dias: -dias };
  return { tipo: "noDia", dias: 0 };
}

/** A situação como o servidor a devolve (`situacaoDoPagamento` e `diasDeAtraso`). */
export function situacaoDoServidor(situacao: string | null | undefined, diasDeAtraso: number | null | undefined): SituacaoDoPagamento | null {
  if (situacao === "atrasado") return { tipo: "atrasado", dias: diasDeAtraso ?? 0 };
  if (situacao === "antecipado") return { tipo: "antecipado", dias: 0 };
  if (situacao === "noDia") return { tipo: "noDia", dias: 0 };
  return null;
}

function plural(n: number, singular: string, pluralDe: string) {
  return `${n} ${n === 1 ? singular : pluralDe}`;
}

/** Para o diálogo, ao vivo: "Em dia", "Antecipado 3 dias", "Atrasado 5 dias". */
export function rotuloDaSituacao(s: SituacaoDoPagamento): string {
  if (s.tipo === "noDia") return "Em dia";
  if (s.tipo === "antecipado") return s.dias > 0 ? `Antecipado ${plural(s.dias, "dia", "dias")}` : "Antecipado";
  return `Atrasado ${plural(s.dias, "dia", "dias")}`;
}

/** Para a lista: "no dia", "antecipado", "5 dias de atraso". */
export function rotuloCurtoDaSituacao(s: SituacaoDoPagamento): string {
  if (s.tipo === "noDia") return "no dia";
  if (s.tipo === "antecipado") return "antecipado";
  return `${plural(s.dias, "dia", "dias")} de atraso`;
}

// ------------------------------------------------------------------ resumo para as listas

export interface TextosDaDiferenca {
  /** "+ R$ 12,00 juros/multa", quando houve acréscimo. */
  acrescimo: string | null;
  /** "− R$ 5,00 desconto", quando houve desconto. */
  desconto: string | null;
}

/** Os rótulos da diferença de um lançamento já pago, em reais como vêm do servidor. */
export function textosDaDiferenca(
  juros: number | null | undefined,
  multa: number | null | undefined,
  desconto: number | null | undefined
): TextosDaDiferenca {
  const acrescimo = paraCentavos(juros) + paraCentavos(multa);
  const abatimento = paraCentavos(desconto);
  return {
    acrescimo: acrescimo > 0 ? `+ ${moedaDeCentavos(acrescimo)} juros/multa` : null,
    desconto: abatimento > 0 ? `${MENOS} ${moedaDeCentavos(abatimento)} desconto` : null,
  };
}
