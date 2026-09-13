/**
 * Datas da Portaria sempre no horário de Brasília.
 *
 * O backend manda os instantes em UTC ("...Z"). Fixar o fuso aqui, em vez de usar o do navegador,
 * mantém o registro igual para todo mundo — inclusive para quem abre o relatório de outro estado.
 */
const FUSO = "America/Sao_Paulo";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
// en-CA formata como yyyy-MM-dd, que é o valor de <input type="date">.
const diaIso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

export function horaBrasilia(iso: string): string {
  return hora.format(new Date(iso));
}

export function dataHoraBrasilia(iso: string): string {
  return dataHora.format(new Date(iso));
}

/** Hoje em Brasília, como yyyy-MM-dd. */
export function hojeEmBrasilia(): string {
  return diaIso.format(new Date());
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function minutosDesde(iso: string, agora: number): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
}

export function formatarCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}
