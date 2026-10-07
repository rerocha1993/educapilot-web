import type { StatusDaCobranca } from "@/lib/finance/use-projetos";

/**
 * Pequenos auxiliares das telas de pagamentos: datas em texto "yyyy-MM-dd" (nunca passam pelo
 * fuso do navegador), nomes de mês e o texto sem acento para busca.
 */

export const MESES = [
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
];

/** "outubro de 2026" a partir de "yyyy-MM". */
export function nomeDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES[(mes || 1) - 1]} de ${ano}`;
}

/** Só o mês, "outubro", a partir de "yyyy-MM". */
export function soNomeDoMes(competencia: string): string {
  const [, mes] = competencia.split("-").map(Number);
  return MESES[(mes || 1) - 1];
}

/** Minúsculas e sem acento, para comparar nomes na busca. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** `iso` mais `dias` dias, como "yyyy-MM-dd". */
export function maisDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export type AtalhoDePeriodo = "este-mes" | "mes-passado" | "proximos-30" | "tudo";

export const ATALHOS_DE_PERIODO: readonly { id: AtalhoDePeriodo; rotulo: string }[] = [
  { id: "este-mes", rotulo: "Este mês" },
  { id: "mes-passado", rotulo: "Mês passado" },
  { id: "proximos-30", rotulo: "Próximos 30 dias" },
  { id: "tudo", rotulo: "Tudo" },
];

/** As duas pontas do período de um atalho ("" = sem limite), a partir do dia de hoje. */
export function periodoDoAtalho(atalho: AtalhoDePeriodo, hoje: string): { de: string; ate: string } {
  const [ano, mes] = hoje.split("-").map(Number);
  if (atalho === "este-mes") return { de: dataIso(ano, mes, 1), ate: dataIso(ano, mes, ultimoDiaDoMes(ano, mes)) };
  if (atalho === "mes-passado") {
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    return { de: dataIso(anoAnterior, mesAnterior, 1), ate: dataIso(anoAnterior, mesAnterior, ultimoDiaDoMes(anoAnterior, mesAnterior)) };
  }
  if (atalho === "proximos-30") return { de: hoje, ate: maisDias(hoje, 30) };
  return { de: "", ate: "" };
}

/** Qual atalho corresponde ao período escolhido; nulo quando as datas são personalizadas. */
export function atalhoDoPeriodo(de: string, ate: string, hoje: string): AtalhoDePeriodo | null {
  return ATALHOS_DE_PERIODO.find((a) => {
    const p = periodoDoAtalho(a.id, hoje);
    return p.de === de && p.ate === ate;
  })?.id ?? null;
}

/** "5 dias" / "1 dia" de atraso. */
export function diasDeAtraso(dias: number): string {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

/** Só os dígitos de um telefone, para o link do WhatsApp (com o 55 do Brasil na frente). */
export function linkDoWhatsApp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 8) return null;
  const comPais = digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}`;
}

export function estaEmAberto(status: StatusDaCobranca): boolean {
  return status === "Pendente" || status === "Vencida";
}

/** Último dia do mês de uma competência "yyyy-MM", como "yyyy-MM-dd". */
export function fimDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return dataIso(ano, mes, ultimoDiaDoMes(ano, mes));
}

/** Primeiro dia do mês de uma competência "yyyy-MM", como "yyyy-MM-dd". */
export function inicioDoMes(competencia: string): string {
  return `${competencia.slice(0, 7)}-01`;
}
