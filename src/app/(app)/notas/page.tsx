"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, FileText, Settings } from "lucide-react";

import { CampoSelect } from "@/components/notas/campos";
import { ComportamentoDaTurmaPainel } from "@/components/notas/comportamento-da-turma";
import { GradeDeLancamento } from "@/components/notas/grade-de-lancamento";
import { PublicacaoDoBoletim } from "@/components/notas/publicacao-do-boletim";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErroDeCarga } from "@/components/rh/campo";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { ROTULO_DO_TIPO, useAnosLetivos, useComportamento, useLancamento, useMinhasTurmas } from "@/lib/notas/use-notas";

type Aba = "notas" | "comportamento";

/**
 * Rotina → Notas: escolha a turma, a matéria e o período e lance as notas numa grade rápida. A aba
 * Comportamento é da turma no período. A gestão também publica o boletim para as famílias.
 *
 * O professor só vê as matérias dele (a API já filtra em minhas-turmas). O que está digitado e não foi
 * salvo é protegido: trocar a turma, a matéria, o período ou a aba pergunta antes de descartar.
 */
export default function NotasPage() {
  const sessao = useSessaoLocal();
  const ehProfessor = sessao?.role === "Teacher";

  const anos = useAnosLetivos();
  const [anoEscolhido, setAnoEscolhido] = useState<string | null>(null);
  const [classEscolhida, setClassEscolhida] = useState<number | null>(null);
  const [materiaEscolhida, setMateriaEscolhida] = useState<string | null>(null);
  const [periodoEscolhido, setPeriodoEscolhido] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("notas");
  const [sujo, setSujo] = useState(false);
  const aoMudarSujo = useCallback((v: boolean) => setSujo(v), []);

  const lista = anos.data ?? [];
  const anoAtual = new Date().getFullYear();
  const ano = lista.find((a) => a.id === anoEscolhido) ?? lista.find((a) => a.ativo) ?? lista.find((a) => a.ano === anoAtual) ?? lista[0] ?? null;

  const turmas = useMinhasTurmas(ano?.ano ?? null);
  const turmasLista = useMemo(() => turmas.data ?? [], [turmas.data]);
  const turma = turmasLista.find((t) => t.classId === classEscolhida) ?? turmasLista[0] ?? null;
  const materia = turma?.materias.find((m) => m.materiaDaTurmaId === materiaEscolhida) ?? turma?.materias[0] ?? null;

  const hoje = hojeIsoBrasilia();
  const periodos = ano?.periodos ?? [];
  const periodo =
    periodos.find((p) => p.id === periodoEscolhido) ??
    periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ??
    periodos[0] ??
    null;

  const lancamento = useLancamento(aba === "notas" ? (materia?.materiaDaTurmaId ?? null) : null, aba === "notas" ? (periodo?.id ?? null) : null);
  const comportamento = useComportamento(aba === "comportamento" ? (turma?.classId ?? null) : null, aba === "comportamento" ? (periodo?.id ?? null) : null);

  /** Troca de escolha: se há algo digitado e não salvo, pergunta antes. */
  function trocar(acao: () => void) {
    if (sujo && !window.confirm("Há alterações não salvas. Descartar e continuar?")) return;
    setSujo(false);
    acao();
  }

  const carregandoBase = anos.isLoading || (ano != null && turmas.isLoading);
  const semAno = !anos.isLoading && !anos.isError && lista.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Notas"
        apoio="Lance as notas por matéria e período, o comportamento da turma e publique o boletim para as famílias."
      />

      {anos.isError && <ErroDeCarga texto={anos.error instanceof Error ? anos.error.message : "Não foi possível carregar os anos letivos."} onTentar={() => void anos.refetch()} />}

      {carregandoBase && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      )}

      {semAno && (
        <EstadoVazio
          icone={<ClipboardList />}
          titulo="Nenhum ano letivo cadastrado"
          texto="A escola precisa cadastrar o ano letivo, os períodos e as matérias antes de lançar notas."
          acao={
            !ehProfessor ? (
              <Link href="/admin/avaliacao" className={buttonVariants({ variant: "action" })}>
                <Settings className="size-4" /> Configurar em Administração
              </Link>
            ) : undefined
          }
        />
      )}

      {ano && !turmas.isLoading && (
        <>
          {turmas.isError ? (
            <ErroDeCarga texto={turmas.error instanceof Error ? turmas.error.message : "Não foi possível carregar as turmas."} onTentar={() => void turmas.refetch()} />
          ) : turmasLista.length === 0 ? (
            <EstadoVazio
              icone={<ClipboardList />}
              titulo={ehProfessor ? "Você ainda não tem matérias em nenhuma turma" : "Nenhuma turma configurada neste ano"}
              texto={
                ehProfessor
                  ? "Peça à gestão para indicar você como professor das matérias da sua turma."
                  : "Em Administração, escolha o tipo de avaliação e as matérias de cada turma."
              }
              acao={
                !ehProfessor ? (
                  <Link href="/admin/avaliacao" className={buttonVariants({ variant: "action" })}>
                    <Settings className="size-4" /> Configurar turmas
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
                <CampoSelect
                  rotulo="Ano letivo"
                  value={ano.id}
                  onChange={(v) => trocar(() => { setAnoEscolhido(v); setPeriodoEscolhido(null); setClassEscolhida(null); setMateriaEscolhida(null); })}
                  opcoes={lista.map((a) => ({ valor: a.id, rotulo: String(a.ano) }))}
                />
                <CampoSelect
                  rotulo="Turma"
                  value={String(turma?.classId ?? "")}
                  onChange={(v) => trocar(() => { setClassEscolhida(Number(v)); setMateriaEscolhida(null); })}
                  opcoes={turmasLista.map((t) => ({ valor: String(t.classId), rotulo: `${t.turma} · ${ROTULO_DO_TIPO[t.tipo].split(" ")[0]}` }))}
                />
                <CampoSelect
                  rotulo={aba === "notas" ? "Matéria" : "Matéria (só na aba Notas)"}
                  value={materia?.materiaDaTurmaId ?? ""}
                  disabled={aba !== "notas" || !turma || turma.materias.length === 0}
                  onChange={(v) => trocar(() => setMateriaEscolhida(v))}
                  vazio={turma && turma.materias.length === 0 ? "Sem matérias" : undefined}
                  opcoes={(turma?.materias ?? []).map((m) => ({
                    valor: m.materiaDaTurmaId,
                    rotulo: m.professor ? `${m.materia} · ${m.professor}` : m.materia,
                  }))}
                />
                <CampoSelect
                  rotulo="Período"
                  value={periodo?.id ?? ""}
                  onChange={(v) => trocar(() => setPeriodoEscolhido(v))}
                  opcoes={periodos.map((p) => ({ valor: p.id, rotulo: p.nome }))}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Tabs value={aba} onValueChange={(v) => trocar(() => setAba(v as Aba))}>
                  <TabsList>
                    <TabsTrigger value="notas" className="px-4">
                      Notas
                    </TabsTrigger>
                    <TabsTrigger value="comportamento" className="px-4">
                      Comportamento
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {turma && (
                  <p className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
                    <FileText className="size-3.5" /> Clique no nome de uma criança para abrir o boletim
                  </p>
                )}
              </div>

              {!ehProfessor && turma && periodo && (
                <PublicacaoDoBoletim classId={turma.classId} periodoId={periodo.id} turma={turma.turma} periodo={periodo.nome} />
              )}

              {!periodo && (
                <EstadoVazio icone={<ClipboardList />} titulo="Este ano ainda não tem períodos" texto="Cadastre os períodos em Administração." />
              )}

              {periodo && aba === "notas" && (
                <>
                  {!materia ? (
                    <EstadoVazio
                      icone={<ClipboardList />}
                      titulo="Esta turma ainda não tem matérias"
                      texto={ehProfessor ? "Peça à gestão para configurar as matérias da turma." : "Adicione as matérias da turma em Administração."}
                      acao={
                        !ehProfessor ? (
                          <Link href="/admin/avaliacao" className={buttonVariants({ variant: "action" })}>
                            <Settings className="size-4" /> Configurar turmas
                          </Link>
                        ) : undefined
                      }
                    />
                  ) : lancamento.isLoading ? (
                    <Skeleton className="h-64 rounded-xl" />
                  ) : lancamento.isError ? (
                    <ErroDeCarga
                      texto={lancamento.error instanceof Error ? lancamento.error.message : "Não foi possível carregar o lançamento."}
                      onTentar={() => void lancamento.refetch()}
                    />
                  ) : lancamento.data ? (
                    <>
                      {lancamento.data.publicado && (
                        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] text-muted-foreground">
                          {lancamento.data.podeEditar
                            ? "Este período já foi publicado para as famílias. Mudanças aparecem no portal, sem novo aviso."
                            : "Este período já foi publicado para as famílias. Só a gestão pode alterar as notas agora."}
                        </p>
                      )}
                      {/* key: trocar de matéria/período recomeça a grade, sem herdar digitação. */}
                      <GradeDeLancamento
                        key={`${lancamento.data.materiaDaTurmaId}|${lancamento.data.periodoId}`}
                        lancamento={lancamento.data}
                        onSujo={aoMudarSujo}
                      />
                    </>
                  ) : null}
                </>
              )}

              {periodo && aba === "comportamento" && turma && (
                <>
                  {!turma.podeLancarComportamento && (
                    <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] text-muted-foreground">
                      Você só vê o comportamento das turmas em que está cadastrado como professor.
                    </p>
                  )}
                  {comportamento.isLoading ? (
                    <Skeleton className="h-64 rounded-xl" />
                  ) : comportamento.isError ? (
                    <ErroDeCarga
                      texto={comportamento.error instanceof Error ? comportamento.error.message : "Não foi possível carregar o comportamento."}
                      onTentar={() => void comportamento.refetch()}
                    />
                  ) : comportamento.data ? (
                    <ComportamentoDaTurmaPainel
                      key={`${comportamento.data.classId}|${comportamento.data.periodoId}`}
                      dados={comportamento.data}
                      onSujo={aoMudarSujo}
                    />
                  ) : null}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
