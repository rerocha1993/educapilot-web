"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, Send, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";

import { CartaoDoAluno } from "@/components/relacionamento/diario/cartao-do-aluno";
import { somarDias } from "@/components/relacionamento/diario/comum";
import { DialogDeBlocos } from "@/components/relacionamento/diario/dialog-de-blocos";
import { nomeDoModelo } from "@/lib/relacionamento/diario-modelos";
import { LancamentoRapido } from "@/components/relacionamento/diario/lancamento-rapido";
import { PainelDoAluno } from "@/components/relacionamento/diario/painel-do-aluno";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { usePainelDaTurma, usePublicarProntos } from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

/**
 * Diário do aluno, pelo lado da escola: o dia da turma inteira numa tela só.
 *
 * Em cima, o dia e a turma, quantos já foram lançados e o botão de publicar todos os prontos. No
 * meio, um cartão pequeno por aluno (ícones de bloco cheio ou pendente). Marcando vários cartões,
 * a barra de lançamento rápido aplica uma refeição, o sono, a higiene ou o humor a todos de uma
 * vez, sem sobrescrever o que já foi lançado. Tocando um cartão, abre o painel do aluno.
 *
 * O professor vê só as turmas dele (o seletor já vem recortado e o servidor confere de novo).
 */
export default function DiarioPage() {
  const hoje = hojeIsoBrasilia();
  const [data, setData] = useState(hoje);
  const [turmaEscolhida, setTurmaEscolhida] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<{ chave: string; ids: number[] }>({ chave: "", ids: [] });
  const [aberto, setAberto] = useState<{ studentId: number; nome: string } | null>(null);
  const [blocosAberto, setBlocosAberto] = useState(false);

  const { data: classes, isLoading: carregandoTurmas, isError: erroDeTurmas, refetch: recarregarTurmas } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })),
    [classes]
  );

  // A turma escolhida, ou a primeira da lista enquanto ninguém escolheu.
  const turmaId = turmaEscolhida && turmas.some((t) => String(t.id) === turmaEscolhida) ? Number(turmaEscolhida) : (turmas[0]?.id ?? null);
  const turma = turmas.find((t) => t.id === turmaId);

  const painel = usePainelDaTurma(turmaId, data);
  const publicarProntos = usePublicarProntos();

  const chave = `${turmaId}|${data}`;
  const selecionados = selecao.chave === chave ? selecao.ids : [];
  const dadosDoPainel = painel.data;
  const futuro = data > hoje;

  function alternar(studentId: number) {
    setSelecao({ chave, ids: selecionados.includes(studentId) ? selecionados.filter((i) => i !== studentId) : [...selecionados, studentId] });
  }

  async function publicarTodos() {
    if (!dadosDoPainel || turmaId === null || dadosDoPainel.prontos === 0) return;
    const n = dadosDoPainel.prontos;
    const ok = window.confirm(
      `Publicar ${n} ${n === 1 ? "diário" : "diários"} da turma ${dadosDoPainel.turma}? As famílias recebem um aviso na primeira publicação de cada criança.`
    );
    if (!ok) return;

    try {
      const publicados = await publicarProntos.mutateAsync({ classId: turmaId, data });
      toast.success(publicados === 1 ? "1 diário publicado." : `${publicados} diários publicados.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar os diários.");
    }
  }

  const lancados = dadosDoPainel?.lancados ?? 0;
  const total = dadosDoPainel?.total ?? 0;
  const percentual = total > 0 ? Math.round((lancados / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <RelacionamentoNav />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="mr-auto min-w-0">
          <p className="text-[11.5px] font-bold tracking-[.16em] text-action uppercase">Relacionamento</p>
          <h1 className="font-heading text-[clamp(22px,5vw,28px)] leading-tight font-semibold tracking-[-.03em]">Diário</h1>
        </div>

        <div role="group" aria-label="Dia do diário" className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label="Dia anterior" onClick={() => setData(somarDias(data, -1))}>
            <ChevronLeft />
          </Button>
          <Input
            type="date"
            aria-label="Data do diário"
            value={data}
            max={hoje}
            onChange={(e) => e.target.value && setData(e.target.value)}
            className="w-40"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Dia seguinte"
            disabled={data >= hoje}
            onClick={() => setData(somarDias(data, 1))}
          >
            <ChevronRight />
          </Button>
          <AtalhoDeDia ativo={data === somarDias(hoje, -1)} onClick={() => setData(somarDias(hoje, -1))}>
            Ontem
          </AtalhoDeDia>
          <AtalhoDeDia ativo={data === hoje} onClick={() => setData(hoje)}>
            Hoje
          </AtalhoDeDia>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="diario-turma" className="text-xs font-medium text-muted-foreground">
            Turma
          </label>
          <Select value={turmaId === null ? "" : String(turmaId)} onValueChange={(v) => v && setTurmaEscolhida(v)}>
            <SelectTrigger id="diario-turma" className="w-48">
              <SelectValue>{() => turma?.nome ?? "Escolha a turma"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {erroDeTurmas && <ErroDeCarga texto="Não foi possível carregar as turmas." onTentar={() => recarregarTurmas()} />}
      {carregandoTurmas && <Skeleton className="h-12 w-full rounded-xl" />}

      {!carregandoTurmas && !erroDeTurmas && turmas.length === 0 && (
        <EstadoVazio
          icone={<NotebookPen />}
          titulo="Nenhuma turma para lançar o diário"
          texto="Quando você estiver vinculado a uma turma, os alunos dela aparecem aqui."
        />
      )}

      {turmaId !== null && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-3 py-2">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-semibold tabular-nums" aria-live="polite">
                {painel.isLoading ? (
                  "Carregando..."
                ) : (
                  <>
                    {lancados} de {total} lançados <span className="font-normal text-muted-foreground">·</span> {dadosDoPainel?.publicados ?? 0}{" "}
                    publicados
                  </>
                )}
              </p>
              <div
                role="progressbar"
                aria-label="Alunos com diário lançado"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentual}
                className="mt-1.5 h-1.5 overflow-hidden rounded-[4px] bg-muted"
              >
                <div className="h-full rounded-[4px] bg-primary transition-[width] duration-300" style={{ width: `${percentual}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!dadosDoPainel || total === 0}
                onClick={() => {
                  if (!dadosDoPainel) return;
                  const todos = dadosDoPainel.alunos.map((a) => a.studentId);
                  setSelecao({ chave, ids: selecionados.length === todos.length ? [] : todos });
                }}
              >
                <Users /> {dadosDoPainel && selecionados.length === total && total > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!dadosDoPainel || dadosDoPainel.alunos.every((a) => a.status !== "SemDiario")}
                onClick={() => dadosDoPainel && setSelecao({ chave, ids: dadosDoPainel.alunos.filter((a) => a.status === "SemDiario").map((a) => a.studentId) })}
              >
                Só quem falta
              </Button>
              <Button type="button" variant="default" size="sm" onClick={() => setBlocosAberto(true)}>
                <SlidersHorizontal /> Formato do diário da turma{dadosDoPainel ? ` · ${nomeDoModelo(dadosDoPainel.blocos)}` : ""}
              </Button>
              <Button
                type="button"
                variant="action"
                size="sm"
                disabled={!dadosDoPainel || dadosDoPainel.prontos === 0 || publicarProntos.isPending || futuro}
                onClick={() => void publicarTodos()}
              >
                <Send /> Publicar todos os prontos{dadosDoPainel && dadosDoPainel.prontos > 0 ? ` (${dadosDoPainel.prontos})` : ""}
              </Button>
            </div>
          </div>

          {painel.isError && <ErroDeCarga texto="Não foi possível carregar o diário da turma." onTentar={() => painel.refetch()} />}

          {painel.isLoading && (
            <ul aria-busy="true" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-[88px] w-full rounded-xl" />
                </li>
              ))}
            </ul>
          )}

          {dadosDoPainel && dadosDoPainel.alunos.length === 0 && (
            <EstadoVazio
              icone={<Users />}
              titulo="Esta turma ainda não tem alunos"
              texto="Cadastre os alunos da turma em Administração para lançar o diário deles."
            />
          )}

          {dadosDoPainel && dadosDoPainel.alunos.length > 0 && (
            <ul className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5")}>
              {dadosDoPainel.alunos.map((a) => (
                <CartaoDoAluno
                  key={a.studentId}
                  aluno={a}
                  blocos={dadosDoPainel.blocos}
                  selecionado={selecionados.includes(a.studentId)}
                  onSelecionar={() => alternar(a.studentId)}
                  onAbrir={() => setAberto({ studentId: a.studentId, nome: a.nome })}
                />
              ))}
            </ul>
          )}

          {futuro && (
            <p role="status" className="text-sm text-muted-foreground">
              Este dia ainda não chegou: dá para consultar, mas não para lançar.
            </p>
          )}

          {dadosDoPainel && selecionados.length > 0 && !futuro && (
            <LancamentoRapido
              classId={turmaId}
              data={data}
              blocos={dadosDoPainel.blocos}
              selecionados={selecionados}
              onLimpar={() => setSelecao({ chave, ids: [] })}
            />
          )}
        </>
      )}

      <PainelDoAluno aluno={aberto} data={data} onFechar={() => setAberto(null)} />
      <DialogDeBlocos classId={turmaId} turma={turma?.nome ?? ""} aberto={blocosAberto} onFechar={() => setBlocosAberto(false)} />
    </div>
  );
}

function AtalhoDeDia({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8",
        ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
