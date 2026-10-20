"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Printer } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ErroDeCarga } from "@/components/rh/campo";
import { ResumoDoAlunoFolha } from "@/components/tasks/resumo-do-aluno";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { usePainelInicio } from "@/lib/kernel/use-painel";
import { useResumoDoAluno } from "@/lib/tasks/use-resumo-do-aluno";

const ANOS_NA_LISTA = 3;

/**
 * Ficha do aluno (evolução do resumo anual): ficha, frequência, ocorrências, reuniões com os pais,
 * diário, portaria e a linha do tempo, de 1º de janeiro até hoje. Abre a partir de Ocorrências e imprime
 * em A4 com capa (o menu e os controles levam `print:hidden`; a folha cuida do resto). A rota continua
 * /ocorrencias/aluno/[id] para não quebrar os atalhos que já existem.
 *
 * O ano vem de ?ano= e pode ser trocado aqui; sem ele, vale o ano corrente (até hoje). Ano passado vem
 * fechado, de 1º de janeiro a 31 de dezembro.
 */
export default function ResumoDoAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const busca = useQueryStringLocal();

  const anoCorrente = competenciaDeIso(hojeIsoBrasilia()).ano;
  const anoDaUrl = Number(busca.get("ano"));
  const anoInicial = Number.isInteger(anoDaUrl) && anoDaUrl >= anoCorrente - ANOS_NA_LISTA + 1 && anoDaUrl <= anoCorrente ? anoDaUrl : anoCorrente;

  // O que a pessoa escolheu aqui vale por cima da URL.
  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null);
  const ano = anoEscolhido ?? anoInicial;
  const anos = Array.from({ length: ANOS_NA_LISTA }, (_, i) => anoCorrente - i);

  const studentId = Number(id);
  const idValido = Number.isInteger(studentId) && studentId > 0;
  const { data, isLoading, isError, error, refetch } = useResumoDoAluno(idValido ? studentId : null, ano);
  const { data: painel } = usePainelInicio();

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden print:hidden">
        <RotinaNav />
      </div>

      <div className="print:hidden">
        <CabecalhoDaPagina
          eyebrow="← Ficha do aluno"
          eyebrowHref="/ficha-do-aluno"
          titulo={data ? `Ficha · ${data.aluno.nome}` : "Ficha do aluno"}
          apoio={
            data ? (
              <>
                De <span className="font-numeric">{formatarSoData(data.periodo.inicio)}</span> a{" "}
                {data.periodo.ateHoje ? "hoje" : <span className="font-numeric">{formatarSoData(data.periodo.fim)}</span>}.
              </>
            ) : (
              "Ficha, frequência, ocorrências, reuniões com os pais, diário e linha do tempo do ano."
            )
          }
          acoesClassName="w-full md:w-auto"
          acoes={
            <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
              <label className="flex flex-col gap-1 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Ano
                <select
                  value={ano}
                  onChange={(e) => setAnoEscolhido(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-2.5 text-sm font-normal normal-case tracking-normal text-foreground md:h-9"
                >
                  {anos.map((a) => (
                    <option key={a} value={a}>
                      {a === anoCorrente ? `${a} (até hoje)` : a}
                    </option>
                  ))}
                </select>
              </label>
              {data && !data.ocultos.some((o) => o === "Reuniões com os pais" || o === "Reuniões e atendimentos") && (
                <Link
                  href={`/reunioes-e-atendimentos/nova?turma=${data.aluno.classId}&aluno=${data.aluno.id}`}
                  className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}
                >
                  <Plus className="size-4" />
                  Registrar reunião
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => window.print()}
                disabled={!data}
              >
                <Printer className="size-4" />
                Imprimir ficha
              </Button>
            </div>
          }
        />
      </div>

      {!idValido && <ErroDeCarga texto="Aluno inválido." />}

      {isError && (
        <ErroDeCarga
          texto={error instanceof Error ? error.message : "Não foi possível carregar a ficha do aluno."}
          onTentar={() => void refetch()}
        />
      )}

      {isLoading && (
        <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[210mm] flex-col gap-4">
          <span className="sr-only">Carregando a ficha do aluno…</span>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {data && <ResumoDoAlunoFolha resumo={data} escola={painel?.escolaNome ?? null} />}
    </div>
  );
}
