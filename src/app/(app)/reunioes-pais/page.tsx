"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, UsersRound } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Estatistica } from "@/components/padroes/estatistica";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Escolha } from "@/components/tasks/escolha";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudentsByClass } from "@/lib/kernel/use-students";
import {
  ROTULO_DO_STATUS,
  TIPOS_DE_REUNIAO,
  VARIANTE_DO_STATUS,
  useReunioesComPais,
  type ReuniaoComPaisItem,
  type StatusDaReuniao,
} from "@/lib/tasks/use-reunioes-com-pais";

const STATUS: StatusDaReuniao[] = ["Agendada", "Realizada", "ResponsavelNaoCompareceu", "Cancelada"];

/** Situação da reunião e, se houver, o alerta de combinados vencidos ou de agenda esquecida. */
function Etiquetas({ r }: { r: ReuniaoComPaisItem }) {
  return (
    <>
      <Badge variant={VARIANTE_DO_STATUS[r.status]}>{ROTULO_DO_STATUS[r.status]}</Badge>
      {r.atrasada && <Badge variant="pending">Registrar ou cancelar</Badge>}
      {r.encaminhamentosVencidos > 0 && (
        <Badge variant="overdue">
          {r.encaminhamentosVencidos} {r.encaminhamentosVencidos === 1 ? "combinado vencido" : "combinados vencidos"}
        </Badge>
      )}
    </>
  );
}

function textoDosCombinados(r: ReuniaoComPaisItem) {
  if (r.totalDeEncaminhamentos === 0) return "Sem combinados";
  if (r.status === "Cancelada") return "Cancelada";
  return `${r.encaminhamentosEmAberto} em aberto de ${r.totalDeEncaminhamentos}`;
}

/**
 * Reunião com os pais: agenda e histórico das reuniões da escola com as famílias, com os combinados que
 * ainda estão em aberto. Fica em Rotina, ao lado de Reuniões (que são as da turma, internas da equipe),
 * porque é registro de rotina da escola e tem a área de acesso própria.
 */
export default function ReunioesComPaisPage() {
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [alunoId, setAlunoId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusDaReuniao | "">("");
  const [tipo, setTipo] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [comPendencias, setComPendencias] = useState(false);
  const [pagina, setPagina] = useState(1);

  const { data: turmas } = useClasses();
  const { data: alunos } = useStudentsByClass(turmaId);

  // Mudar qualquer filtro volta para a primeira página.
  const mudar = <T,>(definir: (v: T) => void) => (v: T) => {
    definir(v);
    setPagina(1);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useReunioesComPais({
    classId: turmaId,
    studentId: alunoId,
    status,
    tipo,
    de,
    ate,
    comPendencias,
    pagina,
  });

  const resumo = data?.resumo;
  const totalDePaginas = data ? Math.max(1, Math.ceil(data.total / data.tamanho)) : 1;
  const filtrando = turmaId !== null || alunoId !== null || !!status || !!tipo || !!de || !!ate || comPendencias;

  function limpar() {
    setTurmaId(null);
    setAlunoId(null);
    setStatus("");
    setTipo("");
    setDe("");
    setAte("");
    setComPendencias(false);
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Reunião com os pais"
        apoio="Agenda, o que foi conversado e os combinados com cada família. Registro interno da escola: a família não vê."
        acoes={
          <Link href="/reunioes-pais/nova" className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}>
            <Plus className="size-4" />
            Nova reunião
          </Link>
        }
        acoesClassName="w-full md:w-auto"
      />

      {/* Números do filtro atual. Laranja só onde há decisão: combinado vencido. */}
      <section aria-label="Resumo do filtro" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Estatistica
          rotulo="Agendadas"
          valor={resumo ? resumo.agendadas : "—"}
          rodape={resumo && resumo.agendadasAtrasadas > 0 ? `${resumo.agendadasAtrasadas} com o dia vencido, sem registro` : undefined}
        />
        <Estatistica rotulo="Realizadas" valor={resumo ? resumo.realizadas : "—"} rodape={resumo ? `${resumo.naoCompareceu} sem comparecimento · ${resumo.canceladas} canceladas` : undefined} />
        <Estatistica rotulo="Combinados em aberto" valor={resumo ? resumo.encaminhamentosEmAberto : "—"} />
        <Estatistica
          rotulo="Combinados vencidos"
          valor={resumo ? resumo.encaminhamentosVencidos : "—"}
          tom={resumo && resumo.encaminhamentosVencidos > 0 ? "danger" : undefined}
        />
      </section>

      {/* Filtros */}
      <section aria-label="Filtros" className="rounded-xl border border-border bg-card p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid content-start gap-1">
            <span id="f-turma" className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Turma</span>
            <Escolha
              rotuloAcessivel="Turma"
              valor={turmaId === null ? "" : String(turmaId)}
              aoMudar={mudar((v: string) => {
                setTurmaId(v && v !== "__todas__" ? Number(v) : null);
                setAlunoId(null);
              })}
              placeholder="Todas as turmas"
              opcoes={[{ valor: "__todas__", rotulo: "Todas as turmas" }, ...(turmas ?? []).map((t) => ({ valor: String(t.id), rotulo: t.className ?? `Turma ${t.id}` }))]}
            />
          </div>
          <div className="grid content-start gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Aluno</span>
            <Escolha
              rotuloAcessivel="Aluno"
              valor={alunoId === null ? "" : String(alunoId)}
              aoMudar={mudar((v: string) => setAlunoId(v && v !== "__todos__" ? Number(v) : null))}
              desabilitado={turmaId === null}
              placeholder={turmaId === null ? "Escolha a turma" : "Todos os alunos"}
              opcoes={[{ valor: "__todos__", rotulo: "Todos os alunos" }, ...(alunos ?? []).map((a) => ({ valor: String(a.id), rotulo: a.fullName }))]}
            />
          </div>
          <div className="grid content-start gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Situação</span>
            <Escolha
              rotuloAcessivel="Situação"
              valor={status}
              aoMudar={mudar((v: string) => setStatus(v === "__todas__" ? "" : (v as StatusDaReuniao)))}
              placeholder="Todas"
              opcoes={[{ valor: "__todas__", rotulo: "Todas" }, ...STATUS.map((s) => ({ valor: s, rotulo: ROTULO_DO_STATUS[s] }))]}
            />
          </div>
          <div className="grid content-start gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Tipo</span>
            <Escolha
              rotuloAcessivel="Tipo"
              valor={tipo}
              aoMudar={mudar((v: string) => setTipo(v === "__todos__" ? "" : v))}
              placeholder="Todos"
              opcoes={[{ valor: "__todos__", rotulo: "Todos" }, ...TIPOS_DE_REUNIAO.map((t) => ({ valor: t, rotulo: t }))]}
            />
          </div>
          <label className="grid content-start gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">De</span>
            <Input type="date" value={de} className="h-10 font-numeric md:h-9" onChange={(e) => mudar(setDe)(e.target.value)} />
          </label>
          <label className="grid content-start gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Até</span>
            <Input type="date" value={ate} className="h-10 font-numeric md:h-9" onChange={(e) => mudar(setAte)(e.target.value)} />
          </label>
          <label className="flex min-h-10 items-center gap-2.5 text-sm sm:col-span-2 md:min-h-0 lg:self-end">
            <Checkbox checked={comPendencias} onCheckedChange={(v) => mudar(setComPendencias)(v === true)} />
            Só reuniões com combinados em aberto
          </label>
        </div>
        {filtrando && (
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={limpar}>
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      {isError && (
        <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar as reuniões."} onTentar={() => void refetch()} />
      )}

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <span className="sr-only">Carregando as reuniões…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.itens.length === 0 && (
        <EstadoVazio
          icone={<UsersRound />}
          titulo={filtrando ? "Nenhuma reunião com esses filtros" : "Nenhuma reunião registrada"}
          texto={
            filtrando
              ? "Mude ou limpe os filtros para ver outras reuniões."
              : "Agende a primeira reunião ou registre uma que já aconteceu."
          }
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : (
              <Link href="/reunioes-pais/nova" className={buttonVariants({ variant: "action" })}>
                <Plus className="size-4" />
                Nova reunião
              </Link>
            )
          }
          textoClassName="max-w-[340px]"
        />
      )}

      {data && data.itens.length > 0 && (
        <>
          {/* Computador: tabela. */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Reuniões com os pais</caption>
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Dia</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Aluno</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Tipo</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Situação</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Combinados</th>
                </tr>
              </thead>
              <tbody>
                {data.itens.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 align-top font-numeric">
                      {formatarSoData(r.data)}
                      {r.hora && <span className="block text-xs text-muted-foreground">{r.hora}</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/reunioes-pais/${r.id}`} className="font-medium hover:underline">
                        {r.aluno}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {r.turma ?? "Sem turma"}
                        {r.nomesDosResponsaveis.length > 0 && ` · com ${r.nomesDosResponsaveis.join(", ")}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">{r.tipo}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        <Etiquetas r={r} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">{textoDosCombinados(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: um cartão por reunião. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {data.itens.map((r) => (
              <li key={r.id}>
                <Link href={`/reunioes-pais/${r.id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
                  <CartaoDaLista
                    titulo={r.aluno}
                    subtitulo={`${r.turma ?? "Sem turma"} · ${r.tipo}`}
                    etiquetas={<Badge variant={VARIANTE_DO_STATUS[r.status]}>{ROTULO_DO_STATUS[r.status]}</Badge>}
                    detalhes={
                      <>
                        <span className="flex items-center gap-1.5 font-numeric">
                          <CalendarClock aria-hidden className="size-3.5" />
                          {formatarSoData(r.data)}
                          {r.hora ? ` · ${r.hora}` : ""}
                        </span>
                        <span>{textoDosCombinados(r)}</span>
                        {(r.atrasada || r.encaminhamentosVencidos > 0) && (
                          <span className="flex flex-wrap gap-1">
                            {r.atrasada && <Badge variant="pending">Registrar ou cancelar</Badge>}
                            {r.encaminhamentosVencidos > 0 && (
                              <Badge variant="overdue">
                                {r.encaminhamentosVencidos} {r.encaminhamentosVencidos === 1 ? "combinado vencido" : "combinados vencidos"}
                              </Badge>
                            )}
                          </span>
                        )}
                      </>
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>

          <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground" aria-live="polite">
              <span className="font-numeric">{data.total}</span> {data.total === 1 ? "reunião" : "reuniões"}
              {totalDePaginas > 1 && (
                <>
                  {" "}· página <span className="font-numeric">{data.pagina}</span> de <span className="font-numeric">{totalDePaginas}</span>
                </>
              )}
              {isFetching && " · atualizando…"}
            </span>
            {totalDePaginas > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button variant="outline" disabled={pagina >= totalDePaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
