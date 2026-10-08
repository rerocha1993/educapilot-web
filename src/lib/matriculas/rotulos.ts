import type { TipoDePeriodo } from "@/lib/reception/use-portaria";
import type { EtapaDoFunil, LeadResumo, OrigemDoLead, QuemAtende, SinalDaFamilia } from "./tipos";

export const ORDEM_DAS_ETAPAS: EtapaDoFunil[] = [
  "Novo",
  "Conversou",
  "ChamarNovamente",
  "VisitaAgendada",
  "Reagendar",
  "Visitou",
  "Reserva",
  "Matriculado",
  "Perdido",
];

/** Títulos padrão, para quando o quadro ainda não carregou (o do quadro traz o nome que a escola deu). */
export const TITULO_PADRAO_DA_ETAPA: Record<EtapaDoFunil, string> = {
  Novo: "Novos",
  Conversou: "Em conversa",
  ChamarNovamente: "Chamar novamente",
  VisitaAgendada: "Visita agendada",
  Reagendar: "Reagendar",
  Visitou: "Visitou",
  Reserva: "Reserva",
  Matriculado: "Matriculado",
  Perdido: "Perdido",
};

/** Variável de cor de cada coluna (globals.css, --etapa-*). */
export const COR_DA_ETAPA: Record<EtapaDoFunil, string> = {
  Novo: "var(--etapa-novo)",
  Conversou: "var(--etapa-conversou)",
  ChamarNovamente: "var(--etapa-chamar)",
  VisitaAgendada: "var(--etapa-visita)",
  Reagendar: "var(--etapa-reagendar)",
  Visitou: "var(--etapa-visitou)",
  Reserva: "var(--etapa-reserva)",
  Matriculado: "var(--etapa-matriculado)",
  Perdido: "var(--etapa-perdido)",
};

export const ETAPAS_FINAIS: EtapaDoFunil[] = ["Matriculado", "Perdido"];

export const ROTULO_DA_ORIGEM: Record<OrigemDoLead, string> = {
  AnuncioMeta: "Anúncio Meta",
  Instagram: "Instagram",
  Indicacao: "Indicação",
  Google: "Google",
  Site: "Site",
  Porta: "Veio à escola",
  Outro: "Outro",
};

/**
 * De que anúncio a família veio, "anúncio · conjunto · campanha", só com o que a escola sabe. Nulo: a família
 * não veio de anúncio, ou o anúncio ainda não está no cache e o chamador cai no rótulo da origem.
 */
export function textoDoAnuncio(lead: Pick<LeadResumo, "anuncioId" | "anuncioNome" | "conjuntoNome" | "campanhaNome">): string | null {
  if (!lead.anuncioId) return null;
  const partes = [lead.anuncioNome, lead.conjuntoNome, lead.campanhaNome].filter((p): p is string => !!p);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** Opções fechadas: cada uma já é a resposta a "por que essa família está ou não fechando". */
export const ROTULO_DO_SINAL: Record<SinalDaFamilia, string> = {
  QuerMatricular: "Quer fechar / pediu matrícula",
  AnalisandoValor: "Analisando o valor",
  VaiFalarComFamilia: "Vai conversar com a família",
  VaiVisitarOutras: "Vai visitar outras escolas",
  EsperandoDataCerta: "Esperando a data certa",
  HorarioNaoEncaixou: "Horário não encaixou",
  AchouLonge: "Achou longe",
  AchouCaro: "Achou caro",
  Evasiva: "Saiu sem dar sinal",
};

/** Versão curta, que cabe no rodapé do card. */
export const SINAL_CURTO: Record<SinalDaFamilia, string> = {
  QuerMatricular: "Quer fechar",
  AnalisandoValor: "Vendo valor",
  VaiFalarComFamilia: "Vai conversar",
  VaiVisitarOutras: "Vendo outras",
  EsperandoDataCerta: "Esperando data",
  HorarioNaoEncaixou: "Horário",
  AchouLonge: "Longe",
  AchouCaro: "Caro",
  Evasiva: "Evasiva",
};

/** Sinal bom, neutro ou de risco: decide a cor do chip. */
export const TOM_DO_SINAL: Record<SinalDaFamilia, "bom" | "neutro" | "risco"> = {
  QuerMatricular: "bom",
  AnalisandoValor: "neutro",
  VaiFalarComFamilia: "neutro",
  VaiVisitarOutras: "neutro",
  EsperandoDataCerta: "neutro",
  HorarioNaoEncaixou: "risco",
  AchouLonge: "risco",
  AchouCaro: "risco",
  Evasiva: "risco",
};

export const PERIODO_CURTO: Record<TipoDePeriodo, string> = {
  Integral: "Integral",
  MeioPeriodoManha: "Manhã",
  MeioPeriodoTarde: "Tarde",
  SeisHoras: "6 horas",
  OitoHoras: "8 horas",
  DezHoras: "10 horas",
};

export const ROTULO_DE_QUEM_ATENDE: Record<QuemAtende, string> = {
  Assistente: "Assistente respondendo",
  Equipe: "Aguardando a equipe",
  Encerrado: "Conversa encerrada",
};

/** Motivos de perda mais comuns no Colégio. "Outro" abre o campo de texto. */
export const MOTIVOS_DE_PERDA = [
  "Achou caro",
  "Achou longe",
  "Escolheu outra escola",
  "Horário não serve",
  "Parou de responder",
  "Não é matrícula (currículo, fornecedor, engano)",
] as const;

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase() || "?";
}

/** "11m", "1a 8m", "3a". */
export function idadeCurta(meses: number | null | undefined): string | null {
  if (meses == null) return null;
  if (meses < 1) return "recém-nascido";
  if (meses < 12) return `${meses}m`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto === 0 ? `${anos}a` : `${anos}a ${resto}m`;
}

/** "agora", "12 min", "3 h", "2 d". O que cabe no canto de um card sem competir com o nome. */
export function tempoDesde(iso: string | null | undefined, agora: number): string | null {
  if (!iso) return null;
  const minutos = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return `${Math.floor(horas / 24)} d`;
}

/** "há 3 min", "há 1h20". Para a faixa de quem espera a equipe. */
export function esperaEmTexto(minutos: number): string {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto === 0 ? `há ${horas}h` : `há ${horas}h${String(resto).padStart(2, "0")}`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há mais de 1 dia" : `há ${dias} dias`;
}

const FUSO = "America/Sao_Paulo";
const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short" });
const diaDoMes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit" });
const mesCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "short" });
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const dataCompleta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Partes do mini calendário da visita, no horário de Brasília. */
export function partesDaVisita(iso: string) {
  const data = new Date(iso);
  return {
    semana: diaDaSemana.format(data).replace(".", "").toUpperCase(),
    dia: diaDoMes.format(data),
    mes: mesCurto.format(data).replace(".", ""),
    hora: hora.format(data),
  };
}

export function dataHoraCurta(iso: string): string {
  return dataCompleta.format(new Date(iso));
}

/**
 * Valor de um <input type="datetime-local"> lido como horário de Brasília, em UTC.
 *
 * Brasília é UTC-3 o ano inteiro desde 2019 (sem horário de verão), então a conversão é fixa. Não
 * usar `new Date(valor)`: leria no fuso do computador de quem está usando.
 */
export function brasiliaParaUtc(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const [, a, mes, d, h, min] = m.map(Number);
  return new Date(Date.UTC(a, mes - 1, d, h + 3, min)).toISOString();
}

/** O contrário: UTC para o valor do <input type="datetime-local"> em Brasília. */
export function utcParaBrasilia(iso: string | null | undefined): string {
  if (!iso) return "";
  const data = new Date(new Date(iso).getTime() - 3 * 60 * 60_000);
  return data.toISOString().slice(0, 16);
}
