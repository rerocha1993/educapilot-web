import { FRASES } from "./frases.ts";

/** Dia em Brasília como "yyyy-MM-dd" (fuso fixo: não depende do relógio do computador). */
const formatoBrasilia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function diaEmBrasilia(agora: Date): string {
  return formatoBrasilia.format(agora);
}

/** Quantos dias inteiros desde 1970-01-01 tem o dia "yyyy-MM-dd" (calendário puro, sem fuso). */
export function numeroDoDia(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(ano, mes - 1, dia) / 86_400_000);
}

/**
 * A frase do dia. Determinística: a mesma data de Brasília dá a mesma frase em qualquer
 * computador e em qualquer recarga, e dias seguidos dão frases diferentes — a lista é percorrida
 * em ordem, uma por dia, e recomeça quando acaba (virada de mês e de ano não quebram a sequência).
 */
export function fraseDoDia(agora: Date = new Date(), frases: readonly string[] = FRASES): string {
  if (frases.length === 0) return "";
  const n = numeroDoDia(diaEmBrasilia(agora));
  return frases[((n % frases.length) + frases.length) % frases.length];
}
