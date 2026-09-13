// Formatação de datas centralizada no fuso da escola (Brasília).
//
// Há dois tipos de campo vindos da API:
// - INSTANTES (createdAt, assinadoEm, ...): UTC com "Z". Precisam ser exibidos
//   com timeZone America/Sao_Paulo, senão aparecem 3h adiantados / no dia seguinte.
//   Se algum ainda vier sem "Z"/offset, o JS interpreta como horário local do
//   navegador — em um navegador no Brasil é o mesmo relógio de parede, então a
//   exibição continua correta.
// - SÓ DATA (vencimento, nascimento, ...): "yyyy-MM-ddT00:00:00" sem "Z". Esses
//   não passam por Date/fuso; formatamos com aritmética de string para nunca
//   "voltar um dia".

const FUSO_ESCOLA = "America/Sao_Paulo";
const VAZIO = "—";

type ValorData = string | Date | null | undefined;

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_ESCOLA,
  dateStyle: "short",
  timeStyle: "short",
});

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_ESCOLA,
  hour: "2-digit",
  minute: "2-digit",
});

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_ESCOLA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// en-CA formata como yyyy-MM-dd.
const fmtIso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_ESCOLA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function paraDate(valor: ValorData): Date | null {
  if (valor == null || valor === "") return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Instante → "dd/MM/yyyy HH:mm" no horário de Brasília. `opcoes` permite manter
 * layouts específicos (ex.: sem ano); o fuso é sempre forçado para Brasília.
 */
export function formatarDataHora(valor: ValorData, opcoes?: Intl.DateTimeFormatOptions): string {
  const d = paraDate(valor);
  if (!d) return VAZIO;
  if (!opcoes) return fmtDataHora.format(d);
  return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: FUSO_ESCOLA }).format(d);
}

/** Instante → "HH:mm" no horário de Brasília. */
export function formatarHora(valor: ValorData): string {
  const d = paraDate(valor);
  return d ? fmtHora.format(d) : VAZIO;
}

/** Instante → "dd/MM/yyyy" do dia em Brasília (`opcoes` como em formatarDataHora). */
export function formatarData(valor: ValorData, opcoes?: Intl.DateTimeFormatOptions): string {
  const d = paraDate(valor);
  if (!d) return VAZIO;
  if (!opcoes) return fmtData.format(d);
  return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: FUSO_ESCOLA }).format(d);
}

/** Campo só-data ("yyyy-MM-dd..." ) → "dd/MM/yyyy" sem conversão de fuso. */
export function formatarSoData(valor: string | null | undefined): string {
  if (valor == null || valor === "") return VAZIO;
  const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return VAZIO;
  return `${dia}/${mes}/${ano}`;
}

/** Data de hoje em Brasília como "yyyy-MM-dd". */
export function hojeIsoBrasilia(): string {
  return fmtIso.format(new Date());
}

/**
 * "yyyy-MM-dd" a partir dos componentes LOCAIS de um Date. Usar para query
 * params montados com Date locais (ex.: segunda-feira da semana) — toISOString
 * converteria para UTC e poderia pular para o dia seguinte à noite.
 */
export function dataLocalIso(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** "yyyy-MM-dd" → competência { mes, ano } sem passar por Date (evita cair no mês anterior). */
export function competenciaDeIso(iso: string): { mes: number; ano: number } {
  const [ano, mes] = iso.slice(0, 10).split("-");
  return { mes: Number(mes), ano: Number(ano) };
}
