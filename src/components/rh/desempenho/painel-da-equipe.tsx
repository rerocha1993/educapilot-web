"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarCheck, Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Estatistica } from "@/components/padroes/estatistica";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import {
  formatarNota,
  useDesempenhoDaEquipe,
  useEncerrarCiclo,
  useFecharMes,
  type LinhaDoDesempenho,
} from "@/lib/rh/use-desempenho";
import { cn } from "@/lib/utils";

import { Campo, ErroDeCarga } from "../campo";
import { Confirmacao } from "../confirmacao";
import { AvisoDeApoio, FaixaBadge, MiniLinha, Variacao, useTomDaFaixa } from "./pecas";

const TODOS = "todos";
type Chave = "nome" | "cargo" | "nota" | "variacao" | "baixo";
const ROTULO_DO_FEEDBACK = { SemAvaliacao: "Sem feedback", Rascunho: "Em rascunho", Concluida: "Concluído" } as const;

function Filtro({
  rotulo,
  valor,
  opcoes,
  onChange,
  todos,
}: {
  rotulo: string;
  valor: string;
  opcoes: string[];
  onChange: (v: string) => void;
  todos: string;
}) {
  return (
    <Select value={valor} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={rotulo} className="w-full md:w-48">
        <SelectValue>{() => (valor === TODOS ? todos : valor)}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectItem value={TODOS}>{todos}</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Ordenar({ rotulo, chave, ordem, onOrdenar, className }: { rotulo: string; chave: Chave; ordem: { chave: Chave; asc: boolean }; onOrdenar: (c: Chave) => void; className?: string }) {
  const ativa = ordem.chave === chave;
  return (
    <TableHead className={className} aria-sort={ativa ? (ordem.asc ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onOrdenar(chave)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {rotulo}
        {ativa ? ordem.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
      </button>
    </TableHead>
  );
}

/** Mês anterior ao de hoje, "aaaa-mm": o que "fechar mês" propõe. */
function mesAnterior(): string {
  const [a, m] = hojeIsoBrasilia().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function DialogFecharMes({ onFechar }: { onFechar: () => void }) {
  const fechar = useFecharMes();
  const [mes, setMes] = useState(mesAnterior);

  async function confirmar() {
    try {
      const r = await fechar.mutateAsync(mes);
      toast.success(`Mês fechado: ${r.gravados} nota(s) gravada(s)${r.semNota > 0 ? `, ${r.semNota} sem dado suficiente` : ""}.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível fechar o mês.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !fechar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar o mês</DialogTitle>
          <DialogDescription>
            Grava a nota de cada funcionário com os pesos de hoje, para o gráfico de evolução não mudar depois. Repetir o mesmo
            mês regrava (é o &quot;recalcular&quot;).
          </DialogDescription>
        </DialogHeader>
        <Campo id="fechar-mes" rotulo="Mês">
          <Input id="fechar-mes" type="month" value={mes} max={hojeIsoBrasilia().slice(0, 7)} onChange={(e) => setMes(e.target.value)} className="max-w-48" />
        </Campo>
        <DialogFooter>
          <Button variant="outline" disabled={fechar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={fechar.isPending || !mes} onClick={confirmar}>
            {fechar.isPending ? "Gravando..." : "Fechar mês"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Visão da equipe: faixa do ciclo, filtros, cartões-resumo (média, distribuição por faixa, quem está sem feedback) e uma
 * tabela densa com nota, variação, mini-linha da evolução e o componente mais baixo. Clique abre o funcionário.
 */
export function PainelDaEquipe() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useDesempenhoDaEquipe({});
  const encerrar = useEncerrarCiclo();
  const tom = useTomDaFaixa();

  const [cargo, setCargo] = useState(TODOS);
  const [departamento, setDepartamento] = useState(TODOS);
  const [faixa, setFaixa] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<{ chave: Chave; asc: boolean }>({ chave: "nome", asc: true });
  const [dialogo, setDialogo] = useState<"mes" | "encerrar" | null>(null);

  const linhas = useMemo(() => data?.linhas ?? [], [data]);
  const cargos = useMemo(() => [...new Set(linhas.map((l) => l.cargo).filter(Boolean))].sort(), [linhas]);
  const departamentos = useMemo(() => [...new Set(linhas.map((l) => l.departamento).filter((d): d is string => !!d))].sort(), [linhas]);

  // Cartões e distribuição seguem cargo, departamento e busca; a faixa só filtra a tabela.
  const doRecorte = useMemo(
    () =>
      linhas.filter(
        (l) =>
          (cargo === TODOS || l.cargo === cargo) &&
          (departamento === TODOS || l.departamento === departamento) &&
          (!busca.trim() || l.nome.toLowerCase().includes(busca.trim().toLowerCase()))
      ),
    [linhas, cargo, departamento, busca]
  );
  const tabela = useMemo(() => {
    const filtradas = doRecorte.filter((l) => faixa === TODOS || l.faixa === faixa);
    const f = ordem.asc ? 1 : -1;
    const num = (n: number | null) => n ?? Number.NEGATIVE_INFINITY;
    return [...filtradas].sort((a, b) => {
      switch (ordem.chave) {
        case "cargo":
          return f * a.cargo.localeCompare(b.cargo, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");
        case "nota":
          return f * (num(a.nota) - num(b.nota)) || a.nome.localeCompare(b.nome, "pt-BR");
        case "variacao":
          return f * (num(a.variacao) - num(b.variacao)) || a.nome.localeCompare(b.nome, "pt-BR");
        case "baixo":
          return f * (num(a.componenteMaisBaixoNota) - num(b.componenteMaisBaixoNota)) || a.nome.localeCompare(b.nome, "pt-BR");
        default:
          return f * a.nome.localeCompare(b.nome, "pt-BR");
      }
    });
  }, [doRecorte, faixa, ordem]);

  const comNota = doRecorte.filter((l) => l.nota != null);
  const media = comNota.length ? comNota.reduce((s, l) => s + l.nota!, 0) / comNota.length : null;
  const semFeedback = doRecorte.filter((l) => l.avaliacaoNoCiclo !== null && l.avaliacaoNoCiclo !== "Concluida").length;
  const distribuicao = (data?.faixas ?? []).map((nome) => ({ nome, n: comNota.filter((l) => l.faixa === nome).length }));
  const corDaFaixa = (nome: string) => {
    const t = tom(nome);
    return t === "success" ? "bg-success" : t === "waiting" ? "bg-chart-3" : t === "pending" ? "bg-action-brand" : t === "overdue" ? "bg-destructive" : "bg-muted-foreground";
  };

  const ordenar = (chave: Chave) => setOrdem((o) => (o.chave === chave ? { chave, asc: !o.asc } : { chave, asc: chave === "nome" || chave === "cargo" }));
  const abrir = (l: LinhaDoDesempenho) => router.push(`/rh/funcionarios/${l.funcionarioId}?aba=desempenho`);

  async function confirmarEncerramento() {
    if (!data?.ciclo) return;
    try {
      const r = await encerrar.mutateAsync(data.ciclo.id);
      toast.success(`Ciclo encerrado: ${r.gravados} nota(s) gravada(s) no histórico.`);
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível encerrar o ciclo.");
      setDialogo(null);
    }
  }

  const ciclo = data?.ciclo ?? null;

  return (
    <div className="flex flex-col gap-3">
      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Desempenho"
        apoio="Nota de mérito, feedback e trajetória da equipe. É apoio à decisão, nunca a decisão."
        acoesClassName="w-full md:w-auto"
        acoes={
          <>
            <Button variant="outline" onClick={() => setDialogo("mes")}>
              <CalendarCheck /> Fechar mês
            </Button>
            <Link href="/rh/desempenho/configuracao" className={buttonVariants({ variant: "outline" })}>
              <Settings2 /> Configuração
            </Link>
          </>
        }
      />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar o desempenho da equipe." onTentar={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
            {ciclo ? (
              <>
                <span className="font-heading font-semibold">{ciclo.nome}</span>
                <span className="font-mono text-[12.5px] tabular-nums text-muted-foreground">
                  {formatarSoData(ciclo.inicio)} a {formatarSoData(ciclo.fim)}
                </span>
                <Badge variant={ciclo.status === "Aberto" ? "success" : "outline"}>{ciclo.status === "Aberto" ? "Aberto" : "Encerrado"}</Badge>
                <span className="text-muted-foreground">{ciclo.avaliacoesConcluidas > 0 ? `${ciclo.avaliacoesConcluidas} feedback(s) concluído(s)` : ""}</span>
                {ciclo.status === "Aberto" && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setDialogo("encerrar")}>
                    Encerrar ciclo
                  </Button>
                )}
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Nenhum ciclo de avaliação ainda.</span>
                <Link href="/rh/desempenho/configuracao" className={buttonVariants({ size: "sm", variant: "action" })}>
                  Abrir o primeiro ciclo
                </Link>
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              Nota calculada de {formatarSoData(data.de)} a {formatarSoData(data.ate)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 md:flex md:flex-wrap md:items-center">
            <Input aria-label="Buscar por nome" placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} className="md:w-52" />
            <Filtro rotulo="Cargo" valor={cargo} opcoes={cargos} onChange={setCargo} todos="Todos os cargos" />
            <Filtro rotulo="Departamento" valor={departamento} opcoes={departamentos} onChange={setDepartamento} todos="Todos os departamentos" />
            <Filtro rotulo="Faixa" valor={faixa} opcoes={data.faixas} onChange={setFaixa} todos="Todas as faixas" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Estatistica rotulo="Média da escola" valor={formatarNota(media)} total={media == null ? undefined : "100"} rodape={`${comNota.length} com nota`} proporcao={media ?? undefined} alertarAbaixoDe={50} />
            <div className="col-span-2 rounded-xl border border-border bg-card px-4.5 pt-4.5 pb-4 lg:col-span-2">
              <span className="text-[13px] font-medium text-muted-foreground md:text-[12.5px]">Distribuição por faixa</span>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={distribuicao.map((d) => `${d.nome}: ${d.n}`).join("; ")}>
                {distribuicao.map((d) => (
                  <div key={d.nome} className={cn("h-full border-r border-card last:border-r-0", corDaFaixa(d.nome))} style={{ width: `${comNota.length ? (d.n / comNota.length) * 100 : 0}%` }} title={`${d.nome}: ${d.n}`} />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {distribuicao.map((d) => (
                  <li key={d.nome} className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", corDaFaixa(d.nome))} />
                    {d.nome} <span className="font-mono font-semibold tabular-nums">{d.n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Estatistica
              rotulo={ciclo ? `Sem feedback em ${ciclo.nome}` : "Sem feedback no ciclo"}
              valor={ciclo ? String(semFeedback) : "—"}
              total={ciclo ? String(doRecorte.length) : undefined}
              rodape={data.semNota > 0 ? `${data.semNota} sem dado para nota` : undefined}
              proporcao={ciclo && doRecorte.length ? ((doRecorte.length - semFeedback) / doRecorte.length) * 100 : undefined}
              alertarAbaixoDe={60}
            />
          </div>

          {tabela.length === 0 ? (
            <EstadoVazio icone={<TrendingUp />} titulo="Nenhum funcionário neste filtro" texto="Ajuste os filtros ou cadastre a equipe em Funcionários." />
          ) : (
            <>
              <div className="flex flex-col gap-1.5 md:hidden">
                {tabela.map((l) => (
                  <button key={l.funcionarioId} type="button" onClick={() => abrir(l)} className="grid gap-1 rounded-xl border border-border bg-card p-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{l.nome}</p>
                        <p className="text-[12.5px] text-muted-foreground">{l.cargo}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-heading text-lg font-semibold tabular-nums">{formatarNota(l.nota)}</span>
                        <Variacao valor={l.variacao} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <FaixaBadge faixa={l.faixa} />
                      <MiniLinha valores={l.evolucao} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden rounded-xl border border-border bg-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <Ordenar rotulo="Funcionário" chave="nome" ordem={ordem} onOrdenar={ordenar} />
                      <Ordenar rotulo="Cargo" chave="cargo" ordem={ordem} onOrdenar={ordenar} />
                      <Ordenar rotulo="Nota" chave="nota" ordem={ordem} onOrdenar={ordenar} className="text-right" />
                      <TableHead>Faixa</TableHead>
                      <Ordenar rotulo="Variação" chave="variacao" ordem={ordem} onOrdenar={ordenar} className="text-right" />
                      <TableHead>Evolução</TableHead>
                      <Ordenar rotulo="Mais baixo" chave="baixo" ordem={ordem} onOrdenar={ordenar} />
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabela.map((l) => (
                      <TableRow key={l.funcionarioId} onClick={() => abrir(l)} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <Link href={`/rh/funcionarios/${l.funcionarioId}?aba=desempenho`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                            {l.nome}
                          </Link>
                          {l.poucosDados && (
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground" title="Poucos dados: a nota ainda é pouco confiável">
                              ·poucos dados
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-muted-foreground">{l.cargo}</TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">{formatarNota(l.nota)}</TableCell>
                        <TableCell>
                          <FaixaBadge faixa={l.faixa} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Variacao valor={l.variacao} />
                        </TableCell>
                        <TableCell>
                          <MiniLinha valores={l.evolucao} />
                        </TableCell>
                        <TableCell className="max-w-44 truncate text-[12.5px] text-muted-foreground" title={l.componenteMaisBaixo ?? undefined}>
                          {l.componenteMaisBaixo ? `${l.componenteMaisBaixo} (${formatarNota(l.componenteMaisBaixoNota)})` : "—"}
                        </TableCell>
                        <TableCell>
                          {l.avaliacaoNoCiclo ? (
                            <Badge variant={l.avaliacaoNoCiclo === "Concluida" ? "success" : l.avaliacaoNoCiclo === "Rascunho" ? "waiting" : "outline"}>
                              {ROTULO_DO_FEEDBACK[l.avaliacaoNoCiclo]}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <AvisoDeApoio texto={data.apoioADecisao || undefined} />
        </>
      )}

      {dialogo === "mes" && <DialogFecharMes onFechar={() => setDialogo(null)} />}
      {dialogo === "encerrar" && ciclo && (
        <Confirmacao
          titulo={`Encerrar o ciclo ${ciclo.nome}?`}
          descricao="Os feedbacks do ciclo deixam de ser editados e a nota de cada funcionário é gravada no histórico, congelada com os pesos de hoje. Rascunhos não concluídos ficam de fora."
          rotuloConfirmar="Encerrar ciclo"
          pendente={encerrar.isPending}
          onConfirmar={confirmarEncerramento}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
