import { posicaoDaRefeicao, posicaoDoDia } from "./cardapio-vocabulario";
import type { PratoDoCardapio } from "./use-cardapio";

/**
 * A grade em edição: um mapa "dia|refeição" → prato. A tela mexe nele célula a célula e só na hora
 * de salvar vira a lista que o servidor espera (célula sem prato não vai).
 */
export interface CelulaEditada {
  descricao: string;
  etiquetas: string[];
}

export type GradeEditada = Record<string, CelulaEditada>;

export const chaveDaCelula = (dia: string, refeicao: string) => `${dia}|${refeicao}`;

export function gradeDosPratos(itens: readonly PratoDoCardapio[]): GradeEditada {
  const grade: GradeEditada = {};
  for (const i of itens) grade[chaveDaCelula(i.dia, i.refeicao)] = { descricao: i.descricao, etiquetas: [...i.etiquetas] };
  return grade;
}

/** Só as células com prato, na ordem da semana e do dia. */
export function pratosDaGrade(grade: GradeEditada): PratoDoCardapio[] {
  return Object.entries(grade)
    .filter(([, c]) => c.descricao.trim())
    .map(([chave, c]) => {
      const [dia, refeicao] = chave.split("|");
      return { dia, refeicao, descricao: c.descricao.trim(), etiquetas: [...c.etiquetas].sort() };
    })
    .sort((a, b) => posicaoDoDia(a.dia) - posicaoDoDia(b.dia) || posicaoDaRefeicao(a.refeicao) - posicaoDaRefeicao(b.refeicao));
}

export function contarPratos(grade: GradeEditada): number {
  return Object.values(grade).filter((c) => c.descricao.trim()).length;
}

/** As duas grades dizem a mesma coisa? (espaço sobrando e célula vazia não contam) */
export function gradesIguais(a: GradeEditada, b: GradeEditada): boolean {
  return JSON.stringify(pratosDaGrade(a)) === JSON.stringify(pratosDaGrade(b));
}

/** As etiquetas escritas no texto de impressão: "Leite, ovo". */
export function etiquetasPorExtenso(etiquetas: readonly string[], rotulo: (id: string) => string): string {
  return etiquetas.map((e) => rotulo(e).toLowerCase()).join(", ");
}
