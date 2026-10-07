import { useCallback, useSyncExternalStore } from "react";

/**
 * Datas e relógio do ponto pelo celular, sempre no horário da escola (Brasília). Datas são texto
 * "yyyy-MM-dd" e não passam por fuso — ver calendario-datas.ts.
 */

const FUSO = "America/Sao_Paulo";

const fmtHoraComSegundos = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const fmtDiaIso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const fmtPorExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtCurta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

/** Meio-dia UTC do dia: longe o bastante da virada para nenhum fuso mudar o dia. */
function meioDia(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(ano, (mes ?? 1) - 1, dia ?? 1, 12));
}

/** "2026-10-07" → "quarta-feira, 7 de outubro de 2026". */
export function dataPorExtenso(iso: string): string {
  return iso ? fmtPorExtenso.format(meioDia(iso)) : "";
}

/** "2026-10-07" → "qua., 07/10". */
export function dataCurta(iso: string): string {
  return iso ? fmtCurta.format(meioDia(iso)) : "";
}

/** O dia (yyyy-MM-dd) de um instante, no horário da escola. */
export function diaIsoDe(ms: number): string {
  return fmtDiaIso.format(new Date(ms));
}

/** Soma (ou subtrai) dias de uma data "yyyy-MM-dd". */
export function somarDias(iso: string, dias: number): string {
  const d = meioDia(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "14:32:07" → { horaMinuto: "14:32", segundos: "07" }. */
export function relogioDe(ms: number): { horaMinuto: string; segundos: string } {
  const [h, m, s] = fmtHoraComSegundos.format(new Date(ms)).split(":");
  return { horaMinuto: `${h}:${m}`, segundos: s };
}

const semAssinatura = () => () => {};

/**
 * "Agora", em ms, no relógio do servidor: o do celular mais o deslocamento medido na última
 * resposta. Atualiza a cada segundo. Relógio de celular costuma estar errado em minutos; quem bate
 * o ponto precisa ver a hora que o servidor vai gravar.
 */
export function useAgoraDaEscola(deslocamentoMs: number): number {
  const assinar = useCallback((aoMudar: () => void) => {
    const id = window.setInterval(aoMudar, 1000);
    return () => window.clearInterval(id);
  }, []);

  // O snapshot é o segundo inteiro: estável dentro do segundo, como o React exige.
  const segundo = useSyncExternalStore(
    assinar,
    () => Math.floor((Date.now() + deslocamentoMs) / 1000),
    () => 0
  );
  return segundo * 1000;
}

/** O app já foi hidratado no navegador? Para o que depende de window (não renderizar no servidor). */
export function useNoNavegador(): boolean {
  return useSyncExternalStore(semAssinatura, () => true, () => false);
}
