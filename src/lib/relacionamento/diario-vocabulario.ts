import {
  Camera,
  HeartPulse,
  MessageSquareText,
  Moon,
  PackagePlus,
  Smile,
  Toilet,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * O vocabulário do Diário do aluno: os blocos, o que cada um aceita e como se escreve em português.
 *
 * Os ids são os nomes que o servidor grava (sem acento): é o servidor quem valida, aqui só se
 * oferece o que ele aceita. A escola e o portal dos pais usam este mesmo arquivo para a leitura
 * ser igual dos dois lados.
 */

export const TIPOS_DE_REGISTRO = ["Alimentacao", "Sono", "Higiene", "Humor", "Saude", "Reposicao", "Recado"] as const;
export type TipoDeRegistro = (typeof TIPOS_DE_REGISTRO)[number];

export function tipoConhecido(v: string | null | undefined): TipoDeRegistro | null {
  return (TIPOS_DE_REGISTRO as readonly string[]).includes(v ?? "") ? (v as TipoDeRegistro) : null;
}

export const ROTULO_DO_TIPO: Record<TipoDeRegistro, string> = {
  Alimentacao: "Alimentação",
  Sono: "Sono",
  Higiene: "Higiene",
  Humor: "Humor",
  Saude: "Saúde",
  Reposicao: "Reposição",
  Recado: "Recado",
};

export const ICONE_DO_TIPO: Record<TipoDeRegistro, LucideIcon> = {
  Alimentacao: UtensilsCrossed,
  Sono: Moon,
  Higiene: Toilet,
  Humor: Smile,
  Saude: HeartPulse,
  Reposicao: PackagePlus,
  Recado: MessageSquareText,
};

export const ICONE_DE_FOTOS = Camera;

interface Opcao<T extends string = string> {
  id: T;
  rotulo: string;
  /** Versão curta para chip apertado. */
  curto?: string;
}

export const REFEICOES = [
  { id: "CafeDaManha", rotulo: "Café da manhã", curto: "Café" },
  { id: "LancheDaManha", rotulo: "Lanche da manhã", curto: "Lanche manhã" },
  { id: "Almoco", rotulo: "Almoço" },
  { id: "LancheDaTarde", rotulo: "Lanche da tarde", curto: "Lanche tarde" },
  { id: "Jantar", rotulo: "Jantar" },
  { id: "Mamadeira", rotulo: "Mamadeira" },
] as const satisfies readonly Opcao[];
export type Refeicao = (typeof REFEICOES)[number]["id"];

/** Do pior para o melhor: a ordem dos botões e o peso da barrinha. */
export const ACEITACOES = [
  { id: "Recusou", rotulo: "Recusou", peso: 0 },
  { id: "Pouco", rotulo: "Pouco", peso: 1 },
  { id: "Metade", rotulo: "Metade", peso: 2 },
  { id: "Bem", rotulo: "Bem", peso: 3 },
  { id: "Tudo", rotulo: "Tudo", peso: 4 },
] as const satisfies readonly (Opcao & { peso: number })[];
export type Aceitacao = (typeof ACEITACOES)[number]["id"];

export const HIGIENES = [
  { id: "Xixi", rotulo: "Xixi" },
  { id: "Coco", rotulo: "Cocô" },
  { id: "TrocaDeFralda", rotulo: "Troca de fralda", curto: "Fralda" },
  { id: "Banho", rotulo: "Banho" },
  { id: "Escovacao", rotulo: "Escovação", curto: "Escovou" },
] as const satisfies readonly Opcao[];
export type Higiene = (typeof HIGIENES)[number]["id"];

export const HUMORES = [
  { id: "Feliz", rotulo: "Feliz" },
  { id: "Calmo", rotulo: "Calmo" },
  { id: "Agitado", rotulo: "Agitado" },
  { id: "Choroso", rotulo: "Choroso" },
  { id: "Sonolento", rotulo: "Sonolento" },
] as const satisfies readonly Opcao[];
export type Humor = (typeof HUMORES)[number]["id"];

export const SAUDES = [
  { id: "Temperatura", rotulo: "Temperatura" },
  { id: "Medicamento", rotulo: "Medicamento" },
  { id: "Observacao", rotulo: "Observação" },
] as const satisfies readonly Opcao[];
export type Saude = (typeof SAUDES)[number]["id"];

export const REPOSICOES = [
  { id: "Fralda", rotulo: "Fralda" },
  { id: "Lenco", rotulo: "Lenço umedecido", curto: "Lenço" },
  { id: "Pomada", rotulo: "Pomada" },
  { id: "Roupa", rotulo: "Roupa" },
  { id: "Leite", rotulo: "Leite" },
  { id: "Outro", rotulo: "Outro" },
] as const satisfies readonly Opcao[];
export type Reposicao = (typeof REPOSICOES)[number]["id"];

const LISTAS: Partial<Record<TipoDeRegistro, readonly Opcao[]>> = {
  Alimentacao: REFEICOES,
  Higiene: HIGIENES,
  Humor: HUMORES,
  Saude: SAUDES,
  Reposicao: REPOSICOES,
};

/** O rótulo de um subtipo ("LancheDaManha" → "Lanche da manhã"); desconhecido volta como veio. */
export function rotuloDoSubtipo(tipo: TipoDeRegistro, id: string | null | undefined, curto = false): string {
  if (!id) return "";
  const achada = LISTAS[tipo]?.find((o) => o.id === id);
  return achada ? ((curto && achada.curto) || achada.rotulo) : id;
}

export function rotuloDaAceitacao(id: string | null | undefined): string {
  return ACEITACOES.find((a) => a.id === id)?.rotulo ?? id ?? "";
}

/** "1h30" / "45 min" / "2h". */
export function duracaoLegivel(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || minutos <= 0) return "";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Minutos entre dois "HH:mm"; nulo quando falta um ou o fim não é depois do início. */
export function minutosEntre(inicio: string | null | undefined, fim: string | null | undefined): number | null {
  if (!inicio || !fim) return null;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return null;
  const total = hf * 60 + mf - (hi * 60 + mi);
  return total > 0 ? total : null;
}

/** "36,8 °C". */
export function temperaturaLegivel(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`;
}
