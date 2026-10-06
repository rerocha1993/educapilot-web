/**
 * Datas do calendário escolar.
 *
 * Todo dia aqui é texto "yyyy-MM-dd", do começo ao fim. `new Date("2026-10-08")` é interpretado
 * como UTC e, num navegador no Brasil, vira 07/10 às 21h — o evento aparece no dia errado. Por
 * isso nada daqui passa por Date com string: as contas de calendário usam Date.UTC, que não
 * depende do fuso de quem está olhando.
 */

export const NOMES_DOS_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const DIAS_DA_SEMANA_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const DIAS_DA_SEMANA_LONGOS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

export interface DataSimples {
  ano: number;
  mes: number;
  dia: number;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/** "yyyy-MM-dd..." → { ano, mes, dia }. Texto fora do formato devolve nulo. */
export function lerIso(iso: string | null | undefined): DataSimples | null {
  const achado = iso ? ISO.exec(iso) : null;
  if (!achado) return null;
  return { ano: Number(achado[1]), mes: Number(achado[2]), dia: Number(achado[3]) };
}

export function montarIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Só o dia civil de um instante-texto ou data-texto: "2026-10-08T00:00:00" → "2026-10-08". */
export function diaDe(iso: string): string {
  return iso.slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(iso: string): number {
  const d = lerIso(iso);
  if (!d) return 0;
  return new Date(Date.UTC(d.ano, d.mes - 1, d.dia)).getUTCDay();
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Soma (ou subtrai) dias a uma data-texto. */
export function somarDias(iso: string, dias: number): string {
  const d = lerIso(iso);
  if (!d) return iso;
  const r = new Date(Date.UTC(d.ano, d.mes - 1, d.dia + dias));
  return montarIso(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate());
}

/** Mês anterior ou seguinte, atravessando a virada do ano. */
export function deslocarMes(ano: number, mes: number, passo: -1 | 1): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + passo;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export interface DiaDaGrade {
  iso: string;
  dia: number;
  /** Pertence ao mês exibido (e não ao mês vizinho que completa a semana). */
  doMes: boolean;
}

/**
 * As semanas do mês, de domingo a sábado, completas com os dias dos meses vizinhos.
 * Cinco ou seis linhas, conforme o mês começa.
 */
export function semanasDoMes(ano: number, mes: number): DiaDaGrade[][] {
  const primeiro = montarIso(ano, mes, 1);
  const recuo = diaDaSemana(primeiro);
  const total = Math.ceil((recuo + diasNoMes(ano, mes)) / 7) * 7;
  const inicioDaGrade = somarDias(primeiro, -recuo);

  const semanas: DiaDaGrade[][] = [];
  for (let i = 0; i < total; i++) {
    const iso = somarDias(inicioDaGrade, i);
    const d = lerIso(iso);
    const dia: DiaDaGrade = { iso, dia: d?.dia ?? 0, doMes: d?.mes === mes && d?.ano === ano };
    if (i % 7 === 0) semanas.push([]);
    semanas[semanas.length - 1].push(dia);
  }
  return semanas;
}

/** O evento cobre este dia? Datas em yyyy-MM-dd comparam certo como texto. */
export function cobreODia(evento: { inicio: string; fim: string }, iso: string): boolean {
  return diaDe(evento.inicio) <= iso && iso <= diaDe(evento.fim);
}

/** "12/10" */
export function diaEMes(iso: string): string {
  const d = lerIso(iso);
  return d ? `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}` : "—";
}

/** "12 de outubro" */
export function diaPorExtenso(iso: string): string {
  const d = lerIso(iso);
  return d ? `${d.dia} de ${NOMES_DOS_MESES[d.mes - 1]}` : "—";
}

/** "segunda-feira, 12 de outubro" */
export function diaComSemana(iso: string): string {
  return `${DIAS_DA_SEMANA_LONGOS[diaDaSemana(iso)]}, ${diaPorExtenso(iso)}`;
}

/** "12/10" ou "12/10 a 14/10" quando passa de um dia. */
export function faixaDeDatas(inicio: string, fim: string): string {
  const i = diaDe(inicio);
  const f = diaDe(fim);
  return i === f ? diaEMes(i) : `${diaEMes(i)} a ${diaEMes(f)}`;
}

/** "08:00" de "08:00:00" ou "08:00". Vazio vira nulo. */
export function horaCurta(hora: string | null | undefined): string | null {
  return hora ? hora.slice(0, 5) : null;
}

/** "08:00 – 10:00", "a partir das 08:00" ou nulo quando é dia inteiro. */
export function faixaDeHorario(
  horaInicio: string | null | undefined,
  horaFim: string | null | undefined
): string | null {
  const i = horaCurta(horaInicio);
  const f = horaCurta(horaFim);
  if (i && f) return `${i} – ${f}`;
  if (i) return `a partir das ${i}`;
  if (f) return `até ${f}`;
  return null;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
