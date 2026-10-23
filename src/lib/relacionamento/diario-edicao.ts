import type { TipoDeRegistro } from "./diario-vocabulario";
import type { RegistroDoDiario, RegistroParaSalvar } from "./use-diario";

/**
 * O que a tela do aluno edita antes de gravar. Cada linha é um `Item` com uma `chave` só da tela
 * (para a lista do React); o servidor não recebe a chave nem o id da linha: o bloco inteiro é
 * substituído a cada gravação.
 *
 * A temperatura fica como texto enquanto se digita ("36,", "36,8"): só vira número na hora de
 * enviar.
 */
export interface Item {
  chave: string;
  subtipo: string;
  nivel: string;
  horaInicio: string;
  horaFim: string;
  /** Temperatura como o usuário digita (vírgula ou ponto). */
  valor: string;
  dose: string;
  texto: string;
}

/** Os blocos que se editam linha a linha. O Recado geral é um texto à parte. */
export const BLOCOS_EDITAVEIS = ["Alimentacao", "Sono", "Higiene", "Humor", "Saude", "Reposicao"] as const satisfies readonly TipoDeRegistro[];
export type BlocoEditavel = (typeof BLOCOS_EDITAVEIS)[number];

export type Edicao = Record<BlocoEditavel, Item[]>;

let contador = 0;

export function novoItem(parcial: Partial<Omit<Item, "chave">> = {}): Item {
  contador += 1;
  return {
    chave: `i${contador}`,
    subtipo: "",
    nivel: "",
    horaInicio: "",
    horaFim: "",
    valor: "",
    dose: "",
    texto: "",
    ...parcial,
  };
}

/** Os registros do servidor, separados por bloco, na ordem em que vieram. */
export function paraEdicao(registros: readonly RegistroDoDiario[]): Edicao {
  const edicao: Edicao = { Alimentacao: [], Sono: [], Higiene: [], Humor: [], Saude: [], Reposicao: [] };
  for (const r of registros) {
    if (!(BLOCOS_EDITAVEIS as readonly string[]).includes(r.tipo)) continue;
    edicao[r.tipo as BlocoEditavel].push(
      novoItem({
        subtipo: r.subtipo ?? "",
        nivel: r.nivel ?? "",
        horaInicio: r.horaInicio ?? "",
        horaFim: r.horaFim ?? "",
        valor: r.valor === null ? "" : String(r.valor).replace(".", ","),
        dose: r.dose ?? "",
        texto: r.texto ?? "",
      })
    );
  }
  return edicao;
}

/** "36,8" ou "36.8" → 36.8; vazio ou inválido → null. */
export function lerTemperatura(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** O registro como o servidor espera; vazio vira nulo para o JSON ficar enxuto. */
export function paraSalvar(item: Item): RegistroParaSalvar {
  const ou = (v: string) => (v.trim() ? v.trim() : null);
  return {
    subtipo: ou(item.subtipo),
    nivel: ou(item.nivel),
    horaInicio: ou(item.horaInicio),
    horaFim: ou(item.horaFim),
    valor: lerTemperatura(item.valor),
    dose: ou(item.dose),
    texto: ou(item.texto),
  };
}

/** Uma assinatura estável do bloco, sem a chave da tela: igual antes e depois = nada a gravar. */
export function assinatura(itens: readonly Item[]): string {
  return JSON.stringify(itens.map((i) => paraSalvar(i)));
}

/** Os blocos cujo conteúdo mudou desde `base`. */
export function blocosAlterados(base: Edicao, atual: Edicao, ligados: readonly BlocoEditavel[]): BlocoEditavel[] {
  return ligados.filter((b) => assinatura(itensValidos(b, base[b])) !== assinatura(itensValidos(b, atual[b])));
}

/** Itens sem nada útil (uma linha de sono sem hora, por exemplo) não vão para o servidor. */
export function itensValidos(bloco: BlocoEditavel, itens: readonly Item[]): Item[] {
  return itens.filter((i) => {
    switch (bloco) {
      case "Sono":
        return !!i.horaInicio;
      case "Saude":
        return i.subtipo === "Temperatura" ? lerTemperatura(i.valor) !== null : !!i.texto.trim();
      default:
        return true;
    }
  });
}
