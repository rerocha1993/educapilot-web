"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Plus, Printer } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { ErroDeCarga } from "@/components/rh/campo";
import { IMPRESSAO_PADRAO, ResumoDoAlunoFolha, type OpcoesDeImpressao } from "@/components/tasks/resumo-do-aluno";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
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
  const [impressao, setImpressao] = useState<OpcoesDeImpressao>(IMPRESSAO_PADRAO);
  const [caixaDeImpressao, setCaixaDeImpressao] = useState(false);

  // A caixa precisa estar fechada antes de imprimir, senão ela sai no papel. As seções abertas ou fechadas na tela
  // não mudam: o papel abre todas por CSS (print:block) e a tela fica como estava.
  function imprimir() {
    setCaixaDeImpressao(false);
    window.setTimeout(() => window.print(), 250);
  }
  const ano = anoEscolhido ?? anoInicial;
  const anos = Array.from({ length: ANOS_NA_LISTA }, (_, i) => anoCorrente - i);

  const studentId = Number(id);
  const idValido = Number.isInteger(studentId) && studentId > 0;
  const { data, isLoading, isError, error, refetch } = useResumoDoAluno(idValido ? studentId : null, ano);
  const { data: painel } = usePainelInicio();
  // Os atalhos da ficha para outras telas só aparecem para quem tem a área delas (a área "Ficha do aluno" só lê).
  const { data: meuAcesso } = useMeuAcesso();

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
              {data && podeVerArea(meuAcesso, "tasks", "reunioes-pais") && !data.ocultos.some((o) => o === "Reuniões com os pais" || o === "Reuniões e atendimentos") && (
                <Link
                  href={`/reunioes-e-atendimentos/nova?turma=${data.aluno.classId}&aluno=${data.aluno.id}`}
                  className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}
                >
                  <Plus className="size-4" />
                  Registrar reunião
                </Link>
              )}
              {podeVerArea(meuAcesso, "tasks", "notas") && (
                <Link
                  href={`/notas/boletim/${studentId}?ano=${ano}`}
                  className={buttonVariants({ variant: "outline", className: "w-full md:w-auto" })}
                >
                  <ClipboardList className="size-4" />
                  Boletim
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => setCaixaDeImpressao(true)}
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
        <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
          <span className="sr-only">Carregando a ficha do aluno…</span>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))]">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))]">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {data && <ResumoDoAlunoFolha resumo={data} escola={painel?.escolaNome ?? null} impressao={impressao} />}

      <Dialog open={caixaDeImpressao} onOpenChange={setCaixaDeImpressao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir ficha</DialogTitle>
            <DialogDescription>
              Sai em A4, com todas as seções abertas, cabeçalho e aviso de confidencialidade em todas as páginas. Para guardar em
              PDF, escolha “Salvar como PDF” na janela de impressão.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={impressao.incluirTextos}
                onCheckedChange={(v) => setImpressao((o) => ({ ...o, incluirTextos: v === true }))}
              />
              <span>
                <span className="font-medium">Incluir texto das atas e respostas dos formulários</span>
                <span className="block text-xs text-muted-foreground">
                  A anamnese é dado de saúde da criança e as atas são internas. Desligado, o papel mostra que o texto foi omitido.
                  Ligue só se for entregar a ficha a quem pode ler.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={impressao.incluirSaude}
                onCheckedChange={(v) => setImpressao((o) => ({ ...o, incluirSaude: v === true }))}
              />
              <span>
                <span className="font-medium">Incluir dados de saúde</span>
                <span className="block text-xs text-muted-foreground">Alergias, medicação, restrição alimentar e convênio do cadastro.</span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaixaDeImpressao(false)}>
              Cancelar
            </Button>
            <Button variant="action" onClick={imprimir}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
