import type { RelatoParaEnviar } from "./tipos";

// O relato da visita ("Como foi a visita"): opções, textos de ajuda e a conferência que espelha a do
// servidor. A do servidor é a que vale; esta só evita a ida e volta.

export interface Opcao {
  id: string;
  rotulo: string;
}

export const QUEM_VEIO: Opcao[] = [
  { id: "mae", rotulo: "Mãe" },
  { id: "pai", rotulo: "Pai" },
  { id: "casal", rotulo: "Mãe e pai juntos" },
  { id: "avos", rotulo: "Avó / avô" },
  { id: "crianca", rotulo: "A criança veio junto" },
  { id: "outro", rotulo: "Outra pessoa" },
];

export const ASSUNTOS: Opcao[] = [
  { id: "adaptacao", rotulo: "Adaptação" },
  { id: "alimentacao", rotulo: "Alimentação" },
  { id: "seguranca", rotulo: "Segurança" },
  { id: "preco", rotulo: "Preço e pagamento" },
  { id: "rotina", rotulo: "Rotina e horários" },
  { id: "professoras", rotulo: "Professoras / quem cuida" },
  { id: "pedagogico", rotulo: "Método e pedagógico" },
  { id: "estrutura", rotulo: "Estrutura e espaço" },
  { id: "sono_fraldas", rotulo: "Sono, fralda, mamadeira" },
  { id: "material", rotulo: "Material e uniforme" },
];

export const ROTULO_DE_QUEM_VEIO = Object.fromEntries(QUEM_VEIO.map((o) => [o.id, o.rotulo])) as Record<string, string>;
export const ROTULO_DO_ASSUNTO = Object.fromEntries(ASSUNTOS.map((o) => [o.id, o.rotulo])) as Record<string, string>;

export const ESCALA_DE_INTERESSE: { nota: number; frase: string; curto: string }[] = [
  { nota: 0, frase: "Veio por educação, não quer a vaga", curto: "Não quer" },
  { nota: 1, frase: "Saiu sem dar sinal nenhum", curto: "Sem sinal" },
  { nota: 2, frase: "Gostou, mas está pesquisando escolas", curto: "Pesquisando" },
  { nota: 3, frase: "Gostou de verdade, mas tem uma pedra no caminho", curto: "Tem uma pedra" },
  { nota: 4, frase: "Quer a vaga, falta resolver uma coisa só", curto: "Falta pouco" },
  { nota: 5, frase: "Pediu para matricular", curto: "Pediu matrícula" },
];

export type CampoDoRelato =
  | "quemVeio"
  | "interesse"
  | "assuntos"
  | "sinal"
  | "objecao"
  | "medo"
  | "virada"
  | "sala"
  | "imprevisto"
  | "prometido";

export interface PerguntaAberta {
  id: "objecao" | "medo" | "virada" | "sala" | "imprevisto" | "prometido";
  rotulo: string;
  ajuda: string;
  exemplo: string;
  obrigatoria: boolean;
}

export const PERGUNTAS: PerguntaAberta[] = [
  {
    id: "objecao",
    rotulo: "Qual foi a maior objeção — nas palavras dela, não nas suas",
    ajuda:
      'Escreva o que a família disse, do jeito que disse. "Achou caro" é a sua tradução e já perdeu a informação; a frase inteira dela ainda tem tudo.',
    exemplo: 'Ela falou: "é que a gente tinha se programado pra uns 900, aí complica"',
    obrigatoria: true,
  },
  {
    id: "medo",
    rotulo: "E qual é o medo por trás disso?",
    ajuda:
      "A objeção é o que ela fala. O medo é o que ela não fala e decide por ela. Se você não souber, escreva o que te deu essa impressão.",
    exemplo: "Acho que é medo de deixar o bebê com estranho — ela repetiu duas vezes que nunca deixou com ninguém",
    obrigatoria: true,
  },
  {
    id: "virada",
    rotulo: "Teve um momento em que a visita virou — ou travou?",
    ajuda: "O instante exato em que você viu a cara mudar, para bem ou para mal.",
    exemplo: "Virou no parquinho: ela chamou o marido no vídeo. Travou quando falei da taxa de material.",
    obrigatoria: false,
  },
  {
    id: "sala",
    rotulo: "Como reagiram ao ver a sala onde a criança ficaria?",
    ajuda: "É o momento em que a escola deixa de ser conversa e vira lugar real.",
    exemplo: 'A mãe ficou na porta olhando as crianças dormindo e disse "ai, que paz"',
    obrigatoria: false,
  },
  {
    id: "imprevisto",
    rotulo: "Saiu algo do esperado? Como você contornou?",
    ajuda: "Pergunta difícil, criança chorando, sala em obra, comparação com outra escola. Deixe em branco se a visita correu normal.",
    exemplo: "Perguntou por que a professora do Berçário II saiu. Falei a verdade e mostrei a substituta.",
    obrigatoria: false,
  },
  {
    id: "prometido",
    rotulo: "O que você prometeu mandar ou confirmar?",
    ajuda:
      "É o que a família está esperando agora. Família esperando promessa que ninguém anotou é como se perde matrícula depois de uma visita boa.",
    exemplo: "Prometi mandar o valor do integral com desconto de irmão até amanhã",
    obrigatoria: false,
  },
];

export const ROTULO_DA_PERGUNTA = Object.fromEntries(PERGUNTAS.map((p) => [p.id, p.rotulo])) as Record<string, string>;

export const MINIMO_DE_CARACTERES = 15;

export const ERROS_DO_RELATO = {
  quemVeio: "Marque quem esteve na visita.",
  interesse: "Escolha de 0 a 5 o quanto essa família saiu querendo a vaga.",
  assuntos: "Marque pelo menos um assunto que eles puxaram.",
  sinal: "Diga como a família saiu daqui.",
  obrigatoria: "Esta é uma das que a escola precisa saber.",
} as const;

const curto = (texto: string) =>
  `Escreva com um pouco mais de detalhe — daqui a um mês ninguém lembra do que "${texto}" queria dizer.`;

export const colapsar = (texto: string) => texto.replace(/\s+/g, " ").trim();

export type ErrosDoRelato = Partial<Record<CampoDoRelato, string>>;

/** Ordem em que os campos aparecem na folha; serve para rolar até o primeiro erro. */
export const ORDEM_DOS_CAMPOS: CampoDoRelato[] = ["quemVeio", "interesse", "assuntos", "sinal", "objecao", "medo", "virada", "sala", "imprevisto", "prometido"];

/** Espelha as regras do servidor. Devolve um erro por campo, ou objeto vazio quando está válido. */
export function conferirRelato(r: RelatoParaEnviar): ErrosDoRelato {
  const erros: ErrosDoRelato = {};
  if (r.quemVeio.length < 1) erros.quemVeio = ERROS_DO_RELATO.quemVeio;
  if (r.interesse == null || r.interesse < 0 || r.interesse > 5) erros.interesse = ERROS_DO_RELATO.interesse;
  if (r.assuntos.length < 1) erros.assuntos = ERROS_DO_RELATO.assuntos;
  if (!r.sinal) erros.sinal = ERROS_DO_RELATO.sinal;

  for (const p of PERGUNTAS) {
    if (p.id === "prometido" && r.nadaPrometido) continue;
    const texto = colapsar(r.respostas[p.id] ?? "");
    if (!texto) {
      if (p.obrigatoria) erros[p.id] = ERROS_DO_RELATO.obrigatoria;
    } else if (texto.length < MINIMO_DE_CARACTERES) {
      erros[p.id] = curto(texto);
    }
  }
  return erros;
}
