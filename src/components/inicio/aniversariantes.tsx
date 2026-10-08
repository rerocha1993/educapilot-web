"use client";

import { useState } from "react";
import { Cake } from "lucide-react";

import { EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAniversariantes,
  type AlunoAniversariante,
  type MembroDaEquipeAniversariante,
  type ResponsavelAniversariante,
} from "@/lib/inicio/use-aniversariantes";
import { cn } from "@/lib/utils";

/**
 * O bloco Aniversariantes da tela Início.
 *
 * Quais listas aparecem (alunos, mães e responsáveis, equipe) já chega decidido: é a escolha da pessoa
 * filtrada pela permissão dela (ver inicio/page.tsx). O servidor também recorta — professora só
 * recebe os alunos das turmas dela —, então lista vazia aqui quer dizer "ninguém" e não "sem acesso".
 *
 * Datas ficam como texto "yyyy-MM-dd" do começo ao fim: "08/10" sai de fatiar a string, nunca de
 * um Date, que no fuso errado empurraria o aniversário para o dia vizinho.
 */

/**
 * Os períodos. "Hoje" pede 1 dia ao servidor (o mínimo) e recorta no cliente quem faz hoje; o
 * limite é o último `diasRestantes` que entra na lista.
 */
const PERIODOS = [
  { rotulo: "Hoje", limite: 0, vazio: "Ninguém faz aniversário hoje." },
  { rotulo: "7 dias", limite: 7, vazio: "Ninguém faz aniversário nos próximos 7 dias." },
  { rotulo: "30 dias", limite: 30, vazio: "Ninguém faz aniversário nos próximos 30 dias." },
] as const;

/** Quantas linhas cada lista mostra antes do "Ver todos". */
const LINHAS_VISIVEIS = 6;

/** "2026-10-08" → "08/10", sem passar por Date. */
function diaEMes(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split("-");
  return mes && dia ? `${dia}/${mes}` : "—";
}

function quando(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

const porProximidade = <T extends { diasRestantes: number; nome: string }>(a: T, b: T) =>
  a.diasRestantes - b.diasRestantes || a.nome.localeCompare(b.nome, "pt-BR");

export function Aniversariantes({ listas }: { listas: string[] }) {
  const [periodo, setPeriodo] = useState(2);
  const { limite, vazio } = PERIODOS[periodo];
  const { data, isLoading, isError } = useAniversariantes(Math.max(1, limite));

  const mostraAlunos = listas.includes("alunos");
  const mostraResponsaveis = listas.includes("responsaveis");
  const mostraEquipe = listas.includes("equipe");
  if (!mostraAlunos && !mostraResponsaveis && !mostraEquipe) return null;

  const alunos = mostraAlunos
    ? (data?.alunos ?? []).filter((a) => a.diasRestantes <= limite).sort(porProximidade)
    : [];
  const responsaveis = mostraResponsaveis
    ? (data?.responsaveis ?? []).filter((r) => r.diasRestantes <= limite).sort(porProximidade)
    : [];
  const equipe = mostraEquipe
    ? (data?.equipe ?? []).filter((m) => m.diasRestantes <= limite).sort(porProximidade)
    : [];
  const total = alunos.length + responsaveis.length + equipe.length;
  const colunas = Number(mostraAlunos) + Number(mostraResponsaveis) + Number(mostraEquipe);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-b border-muted px-4.5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-[17px] font-semibold md:text-[15.5px]">
            Aniversariantes
          </span>
          {data && total > 0 && <EtiquetaDoCartao tom="action">{total}</EtiquetaDoCartao>}
        </div>

        {/* Botões e não links: trocar o período não muda de tela, só o recorte do cartão. */}
        <div
          role="group"
          aria-label="Período"
          className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1"
        >
          {PERIODOS.map((p, i) => (
            <button
              key={p.rotulo}
              type="button"
              aria-pressed={i === periodo}
              onClick={() => setPeriodo(i)}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors md:min-h-8",
                i === periodo
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={cn("grid gap-4 p-4.5", colunas > 1 && "md:grid-cols-2", colunas > 2 && "xl:grid-cols-3")}>
          {Array.from({ length: colunas }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="px-4.5 py-6 text-[13.5px] text-muted-foreground">
          Não foi possível carregar os aniversariantes agora.
        </p>
      ) : total === 0 ? (
        <div className="flex items-center gap-3 px-4.5 py-6">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Cake className="size-4" />
          </span>
          <p className="text-[14px] text-muted-foreground">{vazio}</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-x-6 gap-y-5 p-4.5",
            colunas > 1 && "md:grid-cols-2",
            colunas > 2 && "xl:grid-cols-3"
          )}
        >
          {mostraAlunos && (
            <ColunaDeAniversariantes
              titulo="Alunos"
              vazio="Nenhum aluno neste período."
              linhas={alunos.map(linhaDoAluno)}
            />
          )}
          {mostraResponsaveis && (
            <ColunaDeAniversariantes
              titulo="Mães e responsáveis"
              vazio="Nenhum responsável neste período."
              linhas={responsaveis.map(linhaDoResponsavel)}
            />
          )}
          {mostraEquipe && (
            <ColunaDeAniversariantes
              titulo="Equipe"
              vazio="Nenhum funcionário neste período."
              linhas={equipe.map(linhaDoMembro)}
            />
          )}
        </div>
      )}
    </section>
  );
}

interface Linha {
  id: string;
  nome: string;
  sub: string;
  data: string;
  dias: number;
  /** "faz 5 anos" — só o aluno tem. */
  idade?: string;
}

function linhaDoAluno(a: AlunoAniversariante): Linha {
  return {
    id: `aluno-${a.studentId}`,
    nome: a.nome,
    sub: a.turma ?? "Sem turma",
    data: diaEMes(a.proximoAniversario),
    dias: a.diasRestantes,
    idade: `faz ${a.idadeQueFaz} ${a.idadeQueFaz === 1 ? "ano" : "anos"}`,
  };
}

function linhaDoResponsavel(r: ResponsavelAniversariante): Linha {
  const alunos = r.alunos.join(", ");
  const detalhe = [r.parentesco, alunos && (r.parentesco ? `de ${alunos}` : alunos)]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `responsavel-${r.guardianId}`,
    nome: r.nome,
    sub: detalhe || "Responsável",
    data: diaEMes(r.proximoAniversario),
    dias: r.diasRestantes,
  };
}

function linhaDoMembro(m: MembroDaEquipeAniversariante): Linha {
  return {
    id: `equipe-${m.funcionarioId}`,
    nome: m.nome,
    sub: m.cargo ?? "Equipe",
    data: diaEMes(m.proximoAniversario),
    dias: m.diasRestantes,
  };
}

function ColunaDeAniversariantes({
  titulo,
  vazio,
  linhas,
}: {
  titulo: string;
  vazio: string;
  linhas: Linha[];
}) {
  const [aberta, setAberta] = useState(false);
  const visiveis = aberta ? linhas : linhas.slice(0, LINHAS_VISIVEIS);

  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
        {titulo}
        {linhas.length > 0 && <span className="ml-1.5 font-mono tabular-nums">{linhas.length}</span>}
      </h3>

      {linhas.length === 0 ? (
        <p className="text-[13.5px] text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visiveis.map((l) => {
            const hoje = l.dias <= 0;
            return (
              <li
                key={l.id}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-2.5 py-2",
                  hoje && "bg-action-soft"
                )}
              >
                <span
                  className={cn(
                    "w-11 shrink-0 font-mono text-[13px] tabular-nums",
                    hoje ? "font-semibold text-action-soft-foreground" : "text-muted-foreground"
                  )}
                >
                  {l.data}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium md:text-[13.5px]">
                    {l.nome}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground md:text-[12px]">
                    {l.sub}
                    {l.idade && ` · ${l.idade}`}
                  </span>
                </span>
                <EtiquetaDoCartao tom={hoje ? "action" : "neutro"}>{quando(l.dias)}</EtiquetaDoCartao>
              </li>
            );
          })}
        </ul>
      )}

      {linhas.length > LINHAS_VISIVEIS && (
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          className="mt-2 min-h-10 px-2.5 text-[13px] font-semibold text-primary hover:underline md:min-h-8 md:text-[12.5px]"
        >
          {aberta ? "Ver menos" : `Ver todos (${linhas.length})`}
        </button>
      )}
    </div>
  );
}
