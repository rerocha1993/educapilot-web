import type { OrigemDoLead } from "./tipos";
import type { FiltroDasMetricas } from "./use-metricas";

/**
 * O período do Painel e das Métricas. Tudo em "AAAA-MM-DD" do calendário de Brasília e sem passar por Date
 * local: somar dias num Date do navegador cairia no dia errado perto da meia-noite ou na virada de horário.
 */

export type AtalhoDePeriodo = "semana" | "semana-passada" | "mes" | "mes-passado" | "30" | "90" | "tudo";

export const ATALHOS: { id: AtalhoDePeriodo; rotulo: string }[] = [
  { id: "semana", rotulo: "Esta semana" },
  { id: "semana-passada", rotulo: "Semana passada" },
  { id: "mes", rotulo: "Este mês" },
  { id: "mes-passado", rotulo: "Mês passado" },
  { id: "30", rotulo: "Últimos 30 dias" },
  { id: "90", rotulo: "Últimos 90 dias" },
  { id: "tudo", rotulo: "Tudo" },
];

export const ORIGENS: OrigemDoLead[] = ["AnuncioMeta", "Instagram", "Indicacao", "Google", "Site", "Porta", "Outro"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const paraUtc = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
const deUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function ehDiaValido(iso: string | null | undefined): iso is string {
  return !!iso && ISO.test(iso) && deUtc(paraUtc(iso)) === iso;
}

export function somarDias(iso: string, dias: number): string {
  return deUtc(paraUtc(iso) + dias * 86_400_000);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / 86_400_000) + 1;
}

/** Segunda-feira da semana de `iso`: no Brasil a semana de reunião vai de segunda a domingo. */
function segundaDe(iso: string): string {
  const diaDaSemana = new Date(paraUtc(iso)).getUTCDay(); // 0 = domingo
  return somarDias(iso, -((diaDaSemana + 6) % 7));
}

function ultimoDiaDoMes(ano: number, mes: number): string {
  return deUtc(Date.UTC(ano, mes, 0));
}

/**
 * Os dias de cada atalho. "Esta semana" e "este mês" vão até o fim da semana e do mês, mesmo que ainda não
 * tenham chegado: o período anterior é então a semana ou o mês inteiro de antes, e é isso que a reunião compara.
 */
export function periodoDoAtalho(atalho: AtalhoDePeriodo, hoje: string): { de: string | null; ate: string | null } {
  const [ano, mes] = hoje.split("-").map(Number);
  switch (atalho) {
    case "semana": {
      const segunda = segundaDe(hoje);
      return { de: segunda, ate: somarDias(segunda, 6) };
    }
    case "semana-passada": {
      const segunda = somarDias(segundaDe(hoje), -7);
      return { de: segunda, ate: somarDias(segunda, 6) };
    }
    case "mes":
      return { de: `${ano}-${String(mes).padStart(2, "0")}-01`, ate: ultimoDiaDoMes(ano, mes) };
    case "mes-passado": {
      const anoAnterior = mes === 1 ? ano - 1 : ano;
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      return { de: `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01`, ate: ultimoDiaDoMes(anoAnterior, mesAnterior) };
    }
    case "30":
      return { de: somarDias(hoje, -29), ate: hoje };
    case "90":
      return { de: somarDias(hoje, -89), ate: hoje };
    default:
      return { de: null, ate: null };
  }
}

/** Qual atalho produz exatamente estes dias. Nenhum: o período é personalizado. */
export function atalhoAtivo(filtro: Pick<FiltroDasMetricas, "de" | "ate">, hoje: string): AtalhoDePeriodo | "personalizado" {
  const achado = ATALHOS.find((a) => {
    const p = periodoDoAtalho(a.id, hoje);
    return p.de === filtro.de && p.ate === filtro.ate;
  });
  return achado?.id ?? "personalizado";
}

/** Lê o filtro da URL. O que vier inválido vira "sem filtro" em vez de quebrar a tela. */
export function lerFiltro(params: Pick<URLSearchParams, "get">): FiltroDasMetricas {
  const de = params.get("de");
  const ate = params.get("ate");
  const origem = params.get("origem");
  const periodoValido = ehDiaValido(de) && ehDiaValido(ate) && de <= ate && diasEntre(de, ate) <= 3660;
  return {
    de: periodoValido ? de : null,
    ate: periodoValido ? ate : null,
    origem: ORIGENS.includes(origem as OrigemDoLead) ? (origem as OrigemDoLead) : null,
  };
}

/** A query da URL (com o "?" na frente, ou vazia). */
export function paraQuery(filtro: FiltroDasMetricas): string {
  const q = new URLSearchParams();
  if (filtro.de && filtro.ate) {
    q.set("de", filtro.de);
    q.set("ate", filtro.ate);
  }
  if (filtro.origem) q.set("origem", filtro.origem);
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}
