import { diaDaSemana, lerIso, NOMES_DOS_MESES, somarDias } from "@/lib/tasks/calendario-datas";

/**
 * O vocabulário do Cardápio semanal: os dias da grade, as refeições e as etiquetas de ingrediente.
 *
 * Os ids são os nomes que o servidor grava (sem acento); o servidor é quem valida, aqui só se
 * oferece o que ele aceita. A escola e o portal dos pais usam este mesmo arquivo para a leitura
 * ser igual dos dois lados. Etiqueta é informação do PRATO ("tem leite"), nunca da criança: não
 * existe cadastro de restrição alimentar neste módulo.
 */

export const DIAS_DO_CARDAPIO = [
  { id: "Segunda", rotulo: "Segunda-feira", curto: "Seg" },
  { id: "Terca", rotulo: "Terça-feira", curto: "Ter" },
  { id: "Quarta", rotulo: "Quarta-feira", curto: "Qua" },
  { id: "Quinta", rotulo: "Quinta-feira", curto: "Qui" },
  { id: "Sexta", rotulo: "Sexta-feira", curto: "Sex" },
  { id: "Sabado", rotulo: "Sábado", curto: "Sáb" },
] as const;

export type DiaDoCardapio = (typeof DIAS_DO_CARDAPIO)[number]["id"];

/** Segunda = 0 ... Sábado = 5: quantos dias depois da segunda-feira da semana. */
export function posicaoDoDia(dia: string): number {
  const i = DIAS_DO_CARDAPIO.findIndex((d) => d.id === dia);
  return i < 0 ? 0 : i;
}

export const REFEICOES_DO_CARDAPIO = [
  { id: "CafeDaManha", rotulo: "Café da manhã", curto: "Café" },
  { id: "LancheDaManha", rotulo: "Lanche da manhã", curto: "Lanche manhã" },
  { id: "Almoco", rotulo: "Almoço", curto: "Almoço" },
  { id: "LancheDaTarde", rotulo: "Lanche da tarde", curto: "Lanche tarde" },
  { id: "Jantar", rotulo: "Jantar", curto: "Jantar" },
  { id: "Mamadeira", rotulo: "Mamadeira", curto: "Mamadeira" },
  { id: "Papa", rotulo: "Papa", curto: "Papa" },
] as const;

export type RefeicaoDoCardapio = (typeof REFEICOES_DO_CARDAPIO)[number]["id"];

export function rotuloDaRefeicao(id: string): string {
  return REFEICOES_DO_CARDAPIO.find((r) => r.id === id)?.rotulo ?? id;
}

export function posicaoDaRefeicao(id: string): number {
  const i = REFEICOES_DO_CARDAPIO.findIndex((r) => r.id === id);
  return i < 0 ? 99 : i;
}

export const ETIQUETAS_DO_PRATO = [
  { id: "Leite", rotulo: "Leite" },
  { id: "Ovo", rotulo: "Ovo" },
  { id: "Gluten", rotulo: "Glúten" },
  { id: "Amendoim", rotulo: "Amendoim" },
  { id: "Soja", rotulo: "Soja" },
  { id: "Peixe", rotulo: "Peixe" },
  { id: "FrutosDoMar", rotulo: "Frutos do mar" },
  { id: "Castanhas", rotulo: "Castanhas" },
  { id: "Vegetariano", rotulo: "Vegetariano" },
] as const;

export function rotuloDaEtiqueta(id: string): string {
  return ETIQUETAS_DO_PRATO.find((e) => e.id === id)?.rotulo ?? id;
}

/** A etiqueta só diz o que o prato tem; "Vegetariano" é a única que é uma boa notícia. */
export function etiquetaEhPositiva(id: string): boolean {
  return id === "Vegetariano";
}

// ------------------------------------------------------------------ semana

/** A segunda-feira da semana do dia dado ("yyyy-MM-dd"). */
export function segundaDe(iso: string): string {
  const d = lerIso(iso);
  if (!d) return iso;
  // diaDaSemana: 0 = domingo ... 6 = sábado.
  const deslocamento = (diaDaSemana(iso) + 6) % 7;
  return somarDias(iso, -deslocamento);
}

/** A data de um dia da grade dentro da semana que começa na segunda dada. */
export function dataDoDiaDaGrade(segunda: string, dia: string): string {
  return somarDias(segunda, posicaoDoDia(dia));
}

/** "12 a 16 de outubro" (ou "28 de set. a 2 de out." na virada do mês), até o último dia útil da grade. */
export function rotuloDaSemana(segunda: string, ate: DiaDoCardapio = "Sexta"): string {
  const inicio = lerIso(segunda);
  const fimIso = dataDoDiaDaGrade(segunda, ate);
  const fim = lerIso(fimIso);
  if (!inicio || !fim) return segunda;

  const mes = (m: number) => NOMES_DOS_MESES[m - 1]?.toLowerCase() ?? "";
  if (inicio.mes === fim.mes) return `${inicio.dia} a ${fim.dia} de ${mes(fim.mes)}`;
  return `${inicio.dia} de ${mes(inicio.mes).slice(0, 3)}. a ${fim.dia} de ${mes(fim.mes).slice(0, 3)}.`;
}
