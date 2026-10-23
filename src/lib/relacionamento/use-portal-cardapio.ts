import { useQuery } from "@tanstack/react-query";

import { responsavelJson } from "@/lib/reception/api-responsavel";
import { consulta } from "./api";
import { posicaoDaRefeicao, posicaoDoDia } from "./cardapio-vocabulario";
import { pratos, type PratoDoCardapio } from "./use-cardapio";

/**
 * Cardápio semanal no portal da família (2026-10) — /api/Responsavel/cardapio.
 *
 * Só o que a escola publicou e só da escola toda ou da turma de um filho do responsável. O da
 * turma do filho vale no lugar do da escola toda. É vitrine: não há marcação de leitura. As
 * etiquetas são do prato, nunca da criança.
 */

const CHAVE = ["responsavel", "portal", "cardapio"] as const;

const dia = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

export interface DiaDoCardapioDaFamilia {
  /** Segunda, Terca... */
  dia: string;
  /** yyyy-MM-dd */
  data: string;
  hoje: boolean;
  itens: PratoDoCardapio[];
}

export interface FilhoDoCardapio {
  studentId: number;
  nome: string;
  turma: string;
}

export interface CardapioDaFamilia {
  id: string;
  semana: string;
  titulo: string | null;
  observacao: string | null;
  escolaToda: boolean;
  /** A escola editou depois de publicar. */
  atualizado: boolean;
  filhos: FilhoDoCardapio[];
  dias: DiaDoCardapioDaFamilia[];
  /** As refeições que aparecem, na ordem do dia. */
  refeicoes: string[];
}

export interface CardapiosDaFamilia {
  /** Hoje em Brasília (yyyy-MM-dd). */
  hoje: string;
  semana: string;
  semanaAnterior: string;
  proximaSemana: string;
  temSemanaAnterior: boolean;
  temProximaSemana: boolean;
  cardapios: CardapioDaFamilia[];
}

type CardapioCru = Partial<Omit<CardapioDaFamilia, "dias" | "filhos">> & {
  filhos?: Partial<FilhoDoCardapio>[];
  dias?: (Partial<Omit<DiaDoCardapioDaFamilia, "itens">> & { itens?: Partial<PratoDoCardapio>[] })[];
};

function cardapio(c: CardapioCru): CardapioDaFamilia {
  return {
    id: c.id ?? "",
    semana: dia(c.semana),
    titulo: c.titulo?.trim() ? c.titulo : null,
    observacao: c.observacao?.trim() ? c.observacao : null,
    escolaToda: c.escolaToda ?? true,
    atualizado: c.atualizado ?? false,
    filhos: (c.filhos ?? []).map((f) => ({ studentId: f.studentId ?? 0, nome: f.nome ?? "", turma: f.turma ?? "" })),
    dias: (c.dias ?? [])
      .map((d) => ({ dia: d.dia ?? "", data: dia(d.data), hoje: d.hoje ?? false, itens: pratos(d.itens) }))
      .sort((a, b) => posicaoDoDia(a.dia) - posicaoDoDia(b.dia)),
    refeicoes: (c.refeicoes ?? []).slice().sort((a, b) => posicaoDaRefeicao(a) - posicaoDaRefeicao(b)),
  };
}

/** O cardápio da semana (qualquer dia dela vale; vazio é a semana de hoje). */
export function useCardapioDoPortal(semana?: string | null, ativo = true) {
  return useQuery({
    queryKey: [...CHAVE, semana ?? "atual"],
    enabled: ativo,
    staleTime: 60_000,
    queryFn: async (): Promise<CardapiosDaFamilia> => {
      const r = await responsavelJson<
        (Partial<Omit<CardapiosDaFamilia, "cardapios">> & { cardapios?: CardapioCru[] }) | null
      >(`/cardapio${consulta({ semana })}`, {}, "Não foi possível carregar o cardápio.");
      return {
        hoje: dia(r?.hoje),
        semana: dia(r?.semana),
        semanaAnterior: dia(r?.semanaAnterior),
        proximaSemana: dia(r?.proximaSemana),
        temSemanaAnterior: r?.temSemanaAnterior ?? false,
        temProximaSemana: r?.temProximaSemana ?? false,
        cardapios: (r?.cardapios ?? []).map(cardapio),
      };
    },
  });
}
