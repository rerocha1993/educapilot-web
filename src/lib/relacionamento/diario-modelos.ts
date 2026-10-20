import type { BlocosDaTurma } from "@/lib/relacionamento/use-diario";

/**
 * Modelos prontos de "blocos do diário" por etapa (contrato da Ficha v2, seção 5). Cada modelo só liga e
 * desliga os interruptores que a API de blocos já tem; o nome do modelo não é guardado em lugar nenhum,
 * é calculado a partir dos interruptores (por isso, se alguém mexer num deles, vira "Personalizado").
 */
export interface ModeloDoDiario {
  id: "bercario" | "maternal" | "pre" | "fundamental";
  nome: string;
  descricao: string;
  blocos: BlocosDaTurma;
}

const TUDO_LIGADO: BlocosDaTurma = {
  alimentacao: true,
  sono: true,
  higiene: true,
  fralda: true,
  humor: true,
  saude: true,
  reposicao: true,
  fotos: true,
};

export const MODELOS_DO_DIARIO: ModeloDoDiario[] = [
  { id: "bercario", nome: "Berçário", descricao: "Tudo ligado.", blocos: TUDO_LIGADO },
  { id: "maternal", nome: "Maternal", descricao: "Tudo ligado.", blocos: TUDO_LIGADO },
  {
    id: "pre",
    nome: "Pré-escola",
    descricao: "Sem sono e sem troca de fralda; o resto ligado.",
    blocos: { ...TUDO_LIGADO, sono: false, fralda: false },
  },
  {
    id: "fundamental",
    nome: "Fundamental",
    descricao: "Só alimentação, humor, saúde e fotos.",
    blocos: {
      alimentacao: true,
      humor: true,
      saude: true,
      fotos: true,
      sono: false,
      higiene: false,
      fralda: false,
      reposicao: false,
    },
  },
];

export const MODELO_PERSONALIZADO = "Personalizado";

function iguais(a: BlocosDaTurma, b: BlocosDaTurma) {
  return (Object.keys(a) as (keyof BlocosDaTurma)[]).every((k) => a[k] === b[k]);
}

/**
 * A fralda só vale com a higiene ligada (é um item dela): para comparar, o que o servidor trata como
 * desligado conta como desligado.
 */
function efetivos(b: BlocosDaTurma): BlocosDaTurma {
  return { ...b, fralda: b.higiene && b.fralda };
}

/** Nome do(s) modelo(s) que batem com os interruptores, ou "Personalizado". Berçário e Maternal são iguais: aparecem juntos. */
export function nomeDoModelo(blocos: BlocosDaTurma): string {
  const nomes = MODELOS_DO_DIARIO.filter((m) => iguais(efetivos(m.blocos), efetivos(blocos))).map((m) => m.nome);
  return nomes.length > 0 ? nomes.join(" ou ") : MODELO_PERSONALIZADO;
}
