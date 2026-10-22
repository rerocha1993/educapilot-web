"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { BoletimDoAluno } from "@/components/notas/boletim-do-aluno";
import { CampoSelect } from "@/components/notas/campos";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ErroDeCarga } from "@/components/rh/campo";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { usePainelInicio } from "@/lib/kernel/use-painel";
import { useAnosLetivos, useBoletimDoAluno } from "@/lib/notas/use-notas";

/**
 * Boletim do aluno (gestão e professor da turma): todas as matérias, períodos, médias, situação e
 * comportamento, mesmo dos períodos ainda não publicados. Imprime em A4. O ano vem de ?ano=.
 */
export default function BoletimDoAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const busca = useQueryStringLocal();
  const studentId = Number(id);
  const idValido = Number.isInteger(studentId) && studentId > 0;

  const anos = useAnosLetivos();
  const anoDaUrl = Number(busca.get("ano"));
  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null);
  const anosDisponiveis = (anos.data ?? []).map((a) => a.ano);
  const anoCorrente = new Date().getFullYear();
  const ano =
    anoEscolhido ??
    (Number.isInteger(anoDaUrl) && anoDaUrl > 2000 ? anoDaUrl : null) ??
    (anos.data?.find((a) => a.ativo)?.ano ?? anosDisponiveis[0] ?? anoCorrente);

  const { data, isLoading, isError, error, refetch } = useBoletimDoAluno(idValido ? studentId : null, ano);
  const { data: painel } = usePainelInicio();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="md:hidden print:hidden">
        <RotinaNav />
      </div>

      <div className="print:hidden">
        <CabecalhoDaPagina
          eyebrow="← Notas"
          eyebrowHref="/notas"
          titulo={data ? `Boletim · ${data.aluno.nome}` : "Boletim do aluno"}
          apoio="Todas as matérias e períodos, inclusive os que ainda não foram publicados para a família."
          acoesClassName="w-full md:w-auto"
          acoes={
            <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
              {anosDisponiveis.length > 0 && (
                <CampoSelect
                  rotulo="Ano"
                  value={String(ano)}
                  onChange={(v) => setAnoEscolhido(Number(v))}
                  opcoes={anosDisponiveis.map((a) => ({ valor: String(a), rotulo: String(a) }))}
                />
              )}
              <Button variant="outline" className="w-full md:w-auto" onClick={() => window.print()} disabled={!data}>
                <Printer className="size-4" />
                Imprimir boletim
              </Button>
            </div>
          }
        />
      </div>

      {!idValido && <ErroDeCarga texto="Aluno inválido." />}

      {isError && (
        <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar o boletim."} onTentar={() => void refetch()} />
      )}

      {isLoading && (
        <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[210mm] flex-col gap-4">
          <span className="sr-only">Carregando o boletim…</span>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {data && <BoletimDoAluno boletim={data} escola={painel?.escolaNome ?? null} />}
    </div>
  );
}
