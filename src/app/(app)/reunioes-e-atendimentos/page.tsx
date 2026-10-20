"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, Search, UsersRound } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Estatistica } from "@/components/padroes/estatistica";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Escolha } from "@/components/tasks/escolha";
import { ChipDeEnvolvido } from "@/components/tasks/reuniao-pecas";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import {
  ROTULO_DO_ENVOLVIDO,
  ROTULO_DO_STATUS,
  STATUS_DA_LISTA,
  VARIANTE_DO_STATUS,
  textoDasNotas,
  useEnvolviveis,
  useOpcoesDeReuniao,
  useReunioes,
  type Envolvivel,
  type ReuniaoDoResumo,
  type StatusDaReuniao,
} from "@/lib/tasks/use-reunioes-e-atendimentos";

const LABEL = "text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground";

/** Agendada para um dia que já passou: falta finalizar ou cancelar. */
function estaAtrasada(r: ReuniaoDoResumo, hoje: string) {
  return r.atrasada === true || (r.status === "Agendada" && r.data < hoje);
}

/** Filtro por pessoa: busca o aluno (ou o funcionário, para a gestão) e fica como um chip. */
function FiltroDePessoa({ valor, aoMudar }: { valor: Envolvivel | null; aoMudar: (e: Envolvivel | null) => void }) {
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data } = useEnvolviveis(valor ? "" : termo, "");
  const opcoes = (data ?? []).filter((e) => e.tipo === "Aluno" || e.tipo === "Funcionario");

  return (
    <div className="grid content-start gap-1 sm:col-span-2">
      <span className={LABEL}>Pessoa na reunião</span>
      {valor ? (
        <div className="flex items-center gap-2">
          <ChipDeEnvolvido tipo={valor.tipo} nome={valor.nome} detalhe={valor.detalhe} aoRemover={() => aoMudar(null)} />
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar aluno ou funcionário"
            value={texto}
            placeholder="Buscar aluno ou funcionário"
            className="h-10 pl-8 md:h-9"
            autoComplete="off"
            onChange={(e) => {
              setTexto(e.target.value);
              if (espera.current) clearTimeout(espera.current);
              espera.current = setTimeout(() => setTermo(e.target.value), 250);
            }}
          />
          {termo.trim().length >= 2 && opcoes.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
              {opcoes.map((e) => (
                <li key={`${e.tipo}-${e.studentId ?? e.funcionarioId}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      aoMudar(e);
                      setTexto("");
                      setTermo("");
                    }}
                  >
                    <span className="font-medium">{e.nome}</span>
                    <span className="text-[12.5px] text-muted-foreground">
                      {ROTULO_DO_ENVOLVIDO[e.tipo]}
                      {e.detalhe ? ` · ${e.detalhe}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Pessoas({ r }: { r: ReuniaoDoResumo }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {r.envolvidos.map((e, i) => (
        <li key={`${e.tipo}-${e.nome}-${i}`} className="break-words text-sm">
          <span className="sr-only">{ROTULO_DO_ENVOLVIDO[e.tipo]}: </span>
          <span title={ROTULO_DO_ENVOLVIDO[e.tipo]}>{e.nome}</span>
          <span className="text-[12px] text-muted-foreground"> · {ROTULO_DO_ENVOLVIDO[e.tipo].toLowerCase()}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Reuniões e atendimentos: a agenda e o histórico das conversas da escola com famílias, alunos e equipe. Cada
 * reunião é uma linha, com quem esteve nela e quem conduziu. As notas aparecem só para a gestão ("3 · 8").
 */
export default function ReunioesEAtendimentosPage() {
  const [assunto, setAssunto] = useState("");
  const [status, setStatus] = useState<StatusDaReuniao | "">("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pessoa, setPessoa] = useState<Envolvivel | null>(null);

  const { data: opcoes } = useOpcoesDeReuniao();
  const souGestao = opcoes?.souGestao === true;
  const podeDarNota = opcoes?.podeDarNota === true;

  const { data, isLoading, isError, error, refetch, isFetching } = useReunioes({
    assunto,
    status,
    de,
    ate,
    studentId: pessoa?.tipo === "Aluno" ? (pessoa.studentId ?? null) : null,
    funcionarioId: pessoa?.tipo === "Funcionario" ? (pessoa.funcionarioId ?? null) : null,
  });

  const hoje = hojeIsoBrasilia();
  const itens = data ?? [];
  const filtrando = !!assunto || !!status || !!de || !!ate || !!pessoa;
  const agendadas = itens.filter((r) => r.status === "Agendada").length;
  const realizadas = itens.filter((r) => r.status === "Realizada").length;
  const atrasadas = itens.filter((r) => estaAtrasada(r, hoje)).length;
  const comNotas = podeDarNota || itens.some((r) => r.notaDoAssunto != null || r.notaDoDesfecho != null);

  const assuntos = (opcoes?.assuntos ?? []).filter((a) => !a.soGestao || souGestao);

  function limpar() {
    setAssunto("");
    setStatus("");
    setDe("");
    setAte("");
    setPessoa(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Reuniões e atendimentos"
        apoio="Conversas da escola com famílias, alunos e equipe: quem esteve, o que ficou combinado e como terminou. Registro interno."
        acoes={
          <Link href="/reunioes-e-atendimentos/nova" className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}>
            <Plus className="size-4" />
            Nova reunião
          </Link>
        }
        acoesClassName="w-full md:w-auto"
      />

      <section aria-label="Resumo do filtro" className="grid grid-cols-3 gap-3">
        <Estatistica rotulo="Agendadas" valor={data ? agendadas : "—"} />
        <Estatistica rotulo="Realizadas" valor={data ? realizadas : "—"} />
        <Estatistica rotulo="Pedem registro" valor={data ? atrasadas : "—"} rodape={data && atrasadas > 0 ? "dia passou, falta finalizar ou cancelar" : undefined} tom={data && atrasadas > 0 ? "danger" : undefined} />
      </section>

      <section aria-label="Filtros" className="rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid content-start gap-1">
            <span className={LABEL}>Assunto</span>
            <Escolha
              rotuloAcessivel="Assunto"
              valor={assunto}
              aoMudar={(v) => setAssunto(v === "__todos__" ? "" : v)}
              placeholder="Todos"
              opcoes={[{ valor: "__todos__", rotulo: "Todos" }, ...assuntos.map((a) => ({ valor: a.valor, rotulo: a.valor }))]}
            />
          </div>
          <div className="grid content-start gap-1">
            <span className={LABEL}>Situação</span>
            <Escolha
              rotuloAcessivel="Situação"
              valor={status}
              aoMudar={(v) => setStatus(v === "__todas__" ? "" : (v as StatusDaReuniao))}
              placeholder="Todas"
              opcoes={[{ valor: "__todas__", rotulo: "Todas" }, ...STATUS_DA_LISTA.map((s) => ({ valor: s, rotulo: ROTULO_DO_STATUS[s] }))]}
            />
          </div>
          <label className="grid content-start gap-1">
            <span className={LABEL}>De</span>
            <Input type="date" value={de} className="h-10 font-numeric md:h-9" onChange={(e) => setDe(e.target.value)} />
          </label>
          <label className="grid content-start gap-1">
            <span className={LABEL}>Até</span>
            <Input type="date" value={ate} className="h-10 font-numeric md:h-9" onChange={(e) => setAte(e.target.value)} />
          </label>
          <FiltroDePessoa valor={pessoa} aoMudar={setPessoa} />
        </div>
        {filtrando && (
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={limpar}>
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      {isError && <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar as reuniões."} onTentar={() => void refetch()} />}

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <span className="sr-only">Carregando as reuniões…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && itens.length === 0 && (
        <EstadoVazio
          icone={<UsersRound />}
          titulo={filtrando ? "Nenhuma reunião com esses filtros" : "Nenhuma reunião registrada"}
          texto={filtrando ? "Mude ou limpe os filtros para ver outras reuniões." : "Agende a primeira reunião ou registre uma que já aconteceu."}
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : (
              <Link href="/reunioes-e-atendimentos/nova" className={buttonVariants({ variant: "action" })}>
                <Plus className="size-4" />
                Nova reunião
              </Link>
            )
          }
          textoClassName="max-w-[340px]"
        />
      )}

      {data && itens.length > 0 && (
        <>
          {/* Computador: tabela. */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Reuniões e atendimentos</caption>
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="w-24 px-4 py-2.5 font-semibold">Dia</th>
                  <th scope="col" className="w-[22%] px-4 py-2.5 font-semibold">Assunto</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Quem esteve</th>
                  <th scope="col" className="w-[18%] px-4 py-2.5 font-semibold">Conduziu</th>
                  <th scope="col" className="w-36 px-4 py-2.5 font-semibold">Situação</th>
                  {comNotas && <th scope="col" className="w-20 px-4 py-2.5 font-semibold">Notas</th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-3 align-top font-numeric">
                      {formatarSoData(r.data)}
                      {r.hora && <span className="block text-xs text-muted-foreground">{r.hora}</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/reunioes-e-atendimentos/${r.id}`} className="font-medium hover:underline">
                        {r.assunto}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Pessoas r={r} />
                    </td>
                    <td className="break-words px-4 py-3 align-top text-muted-foreground">{r.condutores.join(", ")}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={VARIANTE_DO_STATUS[r.status]}>{ROTULO_DO_STATUS[r.status]}</Badge>
                        {estaAtrasada(r, hoje) && <Badge variant="pending">Finalizar ou cancelar</Badge>}
                        {(r.encaminhamentosVencidos ?? 0) > 0 && <Badge variant="overdue">{r.encaminhamentosVencidos} vencido(s)</Badge>}
                      </div>
                    </td>
                    {comNotas && <td className="px-4 py-3 align-top font-numeric">{textoDasNotas(r.notaDoAssunto, r.notaDoDesfecho) || <span className="text-muted-foreground">—</span>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: um cartão por reunião. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {itens.map((r) => (
              <li key={r.id}>
                <Link href={`/reunioes-e-atendimentos/${r.id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
                  <CartaoDaLista
                    titulo={r.assunto}
                    subtitulo={r.envolvidos.map((e) => e.nome).join(", ")}
                    etiquetas={<Badge variant={VARIANTE_DO_STATUS[r.status]}>{ROTULO_DO_STATUS[r.status]}</Badge>}
                    detalhes={
                      <>
                        <span className="flex items-center gap-1.5 font-numeric">
                          <CalendarClock aria-hidden className="size-3.5" />
                          {formatarSoData(r.data)}
                          {r.hora ? ` · ${r.hora}` : ""}
                        </span>
                        {r.condutores.length > 0 && <span className="break-words">Conduziu: {r.condutores.join(", ")}</span>}
                        {comNotas && textoDasNotas(r.notaDoAssunto, r.notaDoDesfecho) && (
                          <span>
                            Notas: <span className="font-numeric">{textoDasNotas(r.notaDoAssunto, r.notaDoDesfecho)}</span>
                          </span>
                        )}
                        {estaAtrasada(r, hoje) && (
                          <span>
                            <Badge variant="pending">Finalizar ou cancelar</Badge>
                          </span>
                        )}
                      </>
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-numeric">{itens.length}</span> {itens.length === 1 ? "reunião" : "reuniões"}
            {isFetching && " · atualizando…"}
          </p>
        </>
      )}
    </div>
  );
}
