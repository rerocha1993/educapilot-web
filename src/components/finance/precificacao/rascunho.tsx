"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { AlvoDeMensalidade, EstudoDetalhe, LinhaDeCusto, Premissas } from "@/lib/finance/use-precificacao";

/**
 * Edição ainda não salva de uma parte do estudo.
 *
 * Fica no editor (e não em cada passo) porque os passos são abas: trocar de aba não pode jogar fora
 * o que a pessoa digitou. `valor` é o rascunho quando existe e o que veio do servidor quando não
 * existe — assim não há efeito sincronizando estado, e quando o servidor devolve o estudo salvo
 * basta descartar o rascunho.
 */
export interface Rascunho<T> {
  valor: T;
  sujo: boolean;
  editar: (mudar: (atual: T) => T) => void;
  descartar: () => void;
}

export function useRascunho<T>(base: T): Rascunho<T> {
  const [rascunho, setRascunho] = useState<T | null>(null);
  return {
    valor: rascunho ?? base,
    sujo: rascunho !== null,
    editar: (mudar) => setRascunho((atual) => mudar(atual ?? base)),
    descartar: () => setRascunho(null),
  };
}

// ------------------------------------------------------------------ linhas de custo

export interface LinhaEditavel {
  /** Chave estável da linha na tela (o id do servidor, ou um id local para a linha nova). */
  chave: string;
  id?: string;
  nome: string;
  grupo: string;
  origem: "Automatica" | "Manual";
  base: number;
  aumento: number | null;
  observacao: string;
  /** O que o servidor tem hoje; sem isto (linha nova) o projetado ainda não existe. */
  salva?: { base: number; aumento: number | null; projetado: number };
}

export function linhaEditavel(l: LinhaDeCusto): LinhaEditavel {
  return {
    chave: l.id,
    id: l.id,
    nome: l.nome,
    grupo: l.grupo,
    origem: l.origem,
    base: l.valorMensalBase,
    aumento: l.aumentoPercentual ?? null,
    observacao: l.observacao ?? "",
    salva: { base: l.valorMensalBase, aumento: l.aumentoPercentual ?? null, projetado: l.valorMensalProjetado },
  };
}

/** O projetado só vale enquanto a linha é a que o servidor calculou. */
export function projetadoDaLinha(l: LinhaEditavel): number | null {
  if (!l.salva) return null;
  return l.salva.base === l.base && l.salva.aumento === l.aumento ? l.salva.projetado : null;
}

// ------------------------------------------------------------------ turmas

export interface AlvoEditavel {
  id: string;
  capacidadeMeta: number;
  mensalidadeDefinida: number | null;
}

export function alvoEditavel(a: AlvoDeMensalidade): AlvoEditavel {
  return { id: a.id, capacidadeMeta: a.capacidadeMeta, mensalidadeDefinida: a.mensalidadeDefinida ?? null };
}

/** Tudo o que os passos editam, de uma vez, e o que o servidor diz hoje. */
export interface EdicaoDoEstudo {
  linhas: Rascunho<LinhaEditavel[]>;
  premissas: Rascunho<Premissas>;
  alvos: Rascunho<AlvoEditavel[]>;
  somenteLeitura: boolean;
  estudo: EstudoDetalhe;
}

/** Faixa "alterações não salvas" com Salvar e Descartar, no pé de cada passo editável. */
export function BarraDeSalvar({
  sujo,
  salvando,
  onSalvar,
  onDescartar,
  extra,
}: {
  sujo: boolean;
  salvando: boolean;
  onSalvar: () => void;
  onDescartar: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-[0_6px_18px_-10px_rgba(42,37,48,.35)]">
      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        {sujo ? (
          <span className="font-medium text-action-soft-foreground">Alterações não salvas</span>
        ) : (
          "Tudo salvo"
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <Button variant="outline" disabled={!sujo || salvando} onClick={onDescartar}>
          Descartar
        </Button>
        <Button variant="action" disabled={!sujo || salvando} onClick={onSalvar}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
