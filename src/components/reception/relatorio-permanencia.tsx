"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CampoData,
  CartaoVazio,
  CartoesCarregando,
  InfoDoCartao,
  LinhasCarregando,
  LinhaVazia,
  SeletorDeTurma,
  baixarCsv,
  formatarDia,
} from "@/components/reception/relatorio-apoio";
import { ROTULOS_DO_PERIODO } from "@/components/reception/periodo-do-aluno-campos";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useDetalheDePermanencia,
  useRelatorioDePermanencia,
  type DiaDePermanencia,
  type FiltroDePermanencia,
  type LinhaDePermanencia,
  type RelatorioDePermanencia,
  type SituacaoDoDia,
  type TipoDePeriodo,
} from "@/lib/reception/use-portaria";
import { formatarDuracao, horaBrasilia, hojeEmBrasilia } from "@/lib/reception/formatar";
import { formatarMoeda } from "@/lib/reception/numeros";

// Portaria › Relatórios › Permanência por criança. Uma linha por criança no período: quanto tempo ficou
// na escola, quanto passou do contratado (depois da tolerância) e a multa que isso gera. Os valores vêm
// prontos do backend; a tela só ordena e apresenta.

const TODOS = "todos";
const SEM_PERIODO = "sem";

type Atalho = "este-mes" | "mes-passado" | "personalizado";

/** Primeiro e último dia do mês (último = hoje, no mês corrente), em yyyy-MM-dd. */
function intervaloDoAtalho(atalho: Exclude<Atalho, "personalizado">): { de: string; ate: string } {
  const hoje = hojeEmBrasilia();
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  if (atalho === "este-mes") return { de: `${hoje.slice(0, 8)}01`, ate: hoje };

  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const ultimoDia = new Date(anoAnterior, mesAnterior, 0).getDate();
  const m = String(mesAnterior).padStart(2, "0");
  return { de: `${anoAnterior}-${m}-01`, ate: `${anoAnterior}-${m}-${String(ultimoDia).padStart(2, "0")}` };
}

function horasEMinutos(minutos: number): string {
  return minutos > 0 ? formatarDuracao(minutos) : "—";
}

function rotuloDoPeriodo(tipo?: TipoDePeriodo | null): string {
  return tipo ? ROTULOS_DO_PERIODO[tipo] : "Sem período";
}

function horarioPrevisto(l: { entradaPrevista?: string | null; saidaPrevista?: string | null }): string | null {
  return l.entradaPrevista && l.saidaPrevista ? `${l.entradaPrevista}–${l.saidaPrevista}` : null;
}

function semanaDoDia(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(a, m - 1, d).getDay()];
}

function descreverHoras(normais: number, dobradas: number) {
  const partes = [];
  if (normais > 0) partes.push(`${normais}h`);
  if (dobradas > 0) partes.push(`${dobradas}h em dobro`);
  return partes.join(" + ") || "—";
}

// ------------------------------------------------------------------ ordenação

type Coluna = "nome" | "periodo" | "dias" | "tempo" | "media" | "excesso" | "diasExcesso" | "multa";

const VALOR_DA_COLUNA: Record<Coluna, (l: LinhaDePermanencia) => number | string> = {
  nome: (l) => l.alunoNome.toLocaleLowerCase("pt-BR"),
  periodo: (l) => rotuloDoPeriodo(l.periodo),
  dias: (l) => l.diasComPresenca,
  tempo: (l) => l.minutosNaEscola,
  media: (l) => l.mediaMinutosPorDia,
  excesso: (l) => l.minutosAlemDoPrevisto,
  diasExcesso: (l) => l.diasComExcesso,
  multa: (l) => l.valorMulta,
};

interface Ordem {
  coluna: Coluna;
  /** Nulo: a ordem que o servidor mandou (maior multa, depois maior excesso). */
  direcao: "asc" | "desc";
}

function ordenar(linhas: LinhaDePermanencia[], ordem: Ordem | null): LinhaDePermanencia[] {
  if (!ordem) return linhas;
  const valor = VALOR_DA_COLUNA[ordem.coluna];
  const sinal = ordem.direcao === "asc" ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const x = valor(a);
    const y = valor(b);
    const c = typeof x === "string" && typeof y === "string" ? x.localeCompare(y, "pt-BR") : (x as number) - (y as number);
    return c * sinal || a.alunoNome.localeCompare(b.alunoNome, "pt-BR");
  });
}

// ------------------------------------------------------------------ relatório

export function RelatorioDePermanencia() {
  const [atalho, setAtalho] = useState<Atalho>("este-mes");
  const [filtro, setFiltro] = useState<FiltroDePermanencia>(() => ({
    ...intervaloDoAtalho("este-mes"),
    classId: null,
    periodo: "",
    somenteComExcesso: false,
  }));
  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [aberta, setAberta] = useState<LinhaDePermanencia | null>(null);

  const { data, isLoading, isError, error } = useRelatorioDePermanencia(filtro);
  const { data: turmas } = useClasses();

  const linhas = useMemo(() => ordenar(data?.linhas ?? [], ordem), [data, ordem]);
  const maiorExcesso = useMemo(() => Math.max(0, ...linhas.map((l) => l.minutosAlemDoPrevisto)), [linhas]);

  const escolher = (proximo: Atalho) => {
    setAtalho(proximo);
    if (proximo !== "personalizado") setFiltro((f) => ({ ...f, ...intervaloDoAtalho(proximo) }));
  };

  const ordenarPor = (coluna: Coluna) =>
    setOrdem((atual) => {
      if (atual?.coluna !== coluna) return { coluna, direcao: coluna === "nome" || coluna === "periodo" ? "asc" : "desc" };
      if (atual.direcao === "desc" && coluna !== "nome" && coluna !== "periodo") return { coluna, direcao: "asc" };
      return null;
    });

  const periodoInvalido = !!filtro.de && !!filtro.ate && filtro.ate < filtro.de;
  const turmaEscolhida = turmas?.find((t) => t.id === filtro.classId)?.className;
  const semDados = !isLoading && linhas.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Atalhos de período" className="inline-flex rounded-lg border border-border p-0.5">
            {(
              [
                ["este-mes", "Este mês"],
                ["mes-passado", "Mês passado"],
                ["personalizado", "Personalizado"],
              ] as [Atalho, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={atalho === valor}
                onClick={() => escolher(valor)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                  atalho === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => data && exportarPermanencia(data, ordem ? linhas : data.linhas)}
            disabled={!data || data.linhas.length === 0}
          >
            <Download /> Exportar planilha
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data || data.linhas.length === 0}>
            <Printer /> Imprimir
          </Button>
        </div>

        <div className="grid grid-cols-2 items-end gap-3 md:flex md:flex-wrap">
          {atalho === "personalizado" && (
            <>
              <CampoData rotulo="De" valor={filtro.de} onChange={(de) => setFiltro((f) => ({ ...f, de }))} />
              <CampoData rotulo="Até" valor={filtro.ate} onChange={(ate) => setFiltro((f) => ({ ...f, ate }))} />
            </>
          )}
          <SeletorDeTurma classId={filtro.classId} onChange={(classId) => setFiltro((f) => ({ ...f, classId }))} />
          <div className="flex min-w-0 flex-col gap-[5px] md:min-w-48">
            <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Período contratado</Label>
            <Select
              value={filtro.periodo || TODOS}
              onValueChange={(v) => setFiltro((f) => ({ ...f, periodo: !v || v === TODOS ? "" : v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() =>
                    filtro.periodo === SEM_PERIODO
                      ? "Sem período"
                      : filtro.periodo
                        ? (ROTULOS_DO_PERIODO[filtro.periodo as TipoDePeriodo] ?? "Todos")
                        : "Todos"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {(Object.keys(ROTULOS_DO_PERIODO) as TipoDePeriodo[]).map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {ROTULOS_DO_PERIODO[tipo]}
                  </SelectItem>
                ))}
                <SelectItem value={SEM_PERIODO}>Sem período contratado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="col-span-2 flex h-8 items-center gap-2 text-sm md:col-span-1">
            <Switch
              checked={filtro.somenteComExcesso}
              onCheckedChange={(v) => setFiltro((f) => ({ ...f, somenteComExcesso: v }))}
            />
            Só com excesso
          </label>
        </div>
        {atalho !== "personalizado" && (
          <p className="text-xs text-muted-foreground">
            {formatarDia(filtro.de)} a {formatarDia(filtro.ate)}
          </p>
        )}
      </div>

      {/* Só no papel: o que a folha impressa precisa dizer sobre o que está nela. */}
      <div className="hidden print:block">
        <p className="text-base font-semibold">Permanência por criança</p>
        <p className="text-sm">
          Período de {formatarDia(filtro.de)} a {formatarDia(filtro.ate)}
          {turmaEscolhida ? ` · Turma ${turmaEscolhida}` : ""}
          {filtro.periodo === SEM_PERIODO
            ? " · Sem período contratado"
            : filtro.periodo
              ? ` · ${ROTULOS_DO_PERIODO[filtro.periodo as TipoDePeriodo] ?? ""}`
              : ""}
          {filtro.somenteComExcesso ? " · Só com excesso" : ""} · Emitido em {formatarDia(hojeEmBrasilia())}
        </p>
      </div>

      {periodoInvalido && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground print:hidden">
          A data inicial não pode ser depois da data final.
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório de permanência."}
        </div>
      )}

      <FaixaDeTotais data={data} carregando={isLoading} />

      {/* Celular: cartões. */}
      <div className="flex flex-col gap-2 md:hidden print:hidden">
        {isLoading && <CartoesCarregando />}
        {semDados && <CartaoVazio texto={textoVazio(filtro.somenteComExcesso)} />}
        {linhas.map((l) => (
          <button
            key={l.studentId}
            type="button"
            onClick={() => setAberta(l)}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{l.alunoNome}</p>
                <p className="text-xs break-words text-muted-foreground">
                  {l.turmaNome ?? "—"} · {rotuloDoPeriodo(l.periodo)}
                  {horarioPrevisto(l) ? ` ${horarioPrevisto(l)}` : ""}
                </p>
              </div>
              <span
                className={cn("shrink-0 font-mono font-semibold tabular-nums", l.valorMulta > 0 ? "text-destructive-soft-foreground" : "text-muted-foreground")}
              >
                {formatarMoeda(l.valorMulta)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <InfoDoCartao rotulo="Dias">
                <span className="font-mono tabular-nums">{l.diasComPresenca}</span>
              </InfoDoCartao>
              <InfoDoCartao rotulo="Tempo total">
                <span className="font-mono tabular-nums">{horasEMinutos(l.minutosNaEscola)}</span>
              </InfoDoCartao>
              <InfoDoCartao rotulo="Média/dia">
                <span className="font-mono tabular-nums">{horasEMinutos(l.mediaMinutosPorDia)}</span>
              </InfoDoCartao>
              <InfoDoCartao rotulo="Excesso">
                <span className="font-mono tabular-nums">{horasEMinutos(l.minutosAlemDoPrevisto)}</span>
              </InfoDoCartao>
              <InfoDoCartao rotulo="Dias c/ excesso">
                <span className="font-mono tabular-nums">{l.diasComExcesso}</span>
              </InfoDoCartao>
            </div>
            <Avisos linha={l} />
          </button>
        ))}
      </div>

      {/* Computador e papel: tabela. */}
      <div className="hidden rounded-xl border border-border bg-card md:block print:block print:rounded-none print:border-0">
        <Table>
          <TableHeader>
            <TableRow>
              <Cabecalho coluna="nome" ordem={ordem} onOrdenar={ordenarPor}>
                Criança
              </Cabecalho>
              <Cabecalho coluna="periodo" ordem={ordem} onOrdenar={ordenarPor}>
                Período
              </Cabecalho>
              <Cabecalho coluna="dias" ordem={ordem} onOrdenar={ordenarPor} direita>
                Dias
              </Cabecalho>
              <Cabecalho coluna="tempo" ordem={ordem} onOrdenar={ordenarPor} direita>
                Tempo total
              </Cabecalho>
              <Cabecalho coluna="media" ordem={ordem} onOrdenar={ordenarPor} direita>
                Média/dia
              </Cabecalho>
              <Cabecalho coluna="excesso" ordem={ordem} onOrdenar={ordenarPor}>
                Excesso
              </Cabecalho>
              <Cabecalho coluna="diasExcesso" ordem={ordem} onOrdenar={ordenarPor} direita>
                Dias c/ excesso
              </Cabecalho>
              <Cabecalho coluna="multa" ordem={ordem} onOrdenar={ordenarPor} direita>
                Multa
              </Cabecalho>
              <TableHead>Aviso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LinhasCarregando colunas={9} />}
            {semDados && <LinhaVazia colunas={9} texto={textoVazio(filtro.somenteComExcesso)} />}
            {linhas.map((l) => (
              <TableRow
                key={l.studentId}
                tabIndex={0}
                onClick={() => setAberta(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAberta(l);
                  }
                }}
                className="cursor-pointer print:break-inside-avoid"
              >
                <TableCell className="py-1.5">
                  <p className="font-medium">{l.alunoNome}</p>
                  <p className="text-xs text-muted-foreground">{l.turmaNome ?? "—"}</p>
                </TableCell>
                <TableCell className="py-1.5 text-sm">
                  {rotuloDoPeriodo(l.periodo)}
                  {horarioPrevisto(l) && <span className="block font-mono text-xs tabular-nums text-muted-foreground">{horarioPrevisto(l)}</span>}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums">{l.diasComPresenca}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums">{horasEMinutos(l.minutosNaEscola)}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums">{horasEMinutos(l.mediaMinutosPorDia)}</TableCell>
                <TableCell className="min-w-28 py-1.5">
                  <BarraDeExcesso minutos={l.minutosAlemDoPrevisto} maior={maiorExcesso} />
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums">{l.diasComExcesso}</TableCell>
                <TableCell
                  className={cn(
                    "py-1.5 text-right font-mono text-sm font-semibold tabular-nums",
                    l.valorMulta > 0 ? "text-destructive-soft-foreground" : "text-muted-foreground"
                  )}
                >
                  {formatarMoeda(l.valorMulta)}
                </TableCell>
                <TableCell className="max-w-56 py-1.5">
                  <Avisos linha={l} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Excesso é o atraso na saída acima da tolerância da escola; a multa é a que foi calculada no registro de cada saída.
        Dias sem saída ou sem chegada registrada não entram na soma do tempo.
      </p>

      <DetalheDaCrianca linha={aberta} de={filtro.de} ate={filtro.ate} onFechar={() => setAberta(null)} />
    </div>
  );
}

function textoVazio(somenteComExcesso: boolean) {
  return somenteComExcesso ? "Nenhuma criança com excesso no período." : "Nenhuma presença registrada no período.";
}

function Cabecalho({
  coluna,
  ordem,
  onOrdenar,
  direita = false,
  children,
}: {
  coluna: Coluna;
  ordem: Ordem | null;
  onOrdenar: (c: Coluna) => void;
  direita?: boolean;
  children: string;
}) {
  const ativa = ordem?.coluna === coluna;
  const Icone = !ativa ? ChevronsUpDown : ordem.direcao === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={direita ? "text-right" : undefined}
      aria-sort={ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground print:pointer-events-none", direita && "flex-row-reverse")}
      >
        {children}
        <Icone className={cn("size-3 print:hidden", ativa ? "text-foreground" : "text-muted-foreground/60")} />
      </button>
    </TableHead>
  );
}

function BarraDeExcesso({ minutos, maior }: { minutos: number; maior: number }) {
  if (minutos <= 0) return <span className="font-mono text-sm text-muted-foreground">—</span>;
  const pct = maior > 0 ? Math.max(6, Math.round((minutos / maior) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-sm tabular-nums">{formatarDuracao(minutos)}</span>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-destructive" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Avisos({ linha }: { linha: LinhaDePermanencia }) {
  if (linha.avisos.length === 0) return null;
  return (
    <div className="flex flex-col items-start gap-1">
      {linha.pendente && (
        <Badge variant="pending">
          <AlertTriangle /> Dado faltando
        </Badge>
      )}
      <ul className="text-xs text-muted-foreground">
        {linha.avisos.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

function FaixaDeTotais({ data, carregando }: { data?: RelatorioDePermanencia; carregando: boolean }) {
  const t = data?.totais;
  const itens: { rotulo: string; valor: string | undefined; alerta?: boolean }[] = [
    { rotulo: "Crianças com excesso", valor: t ? `${t.criancasComExcesso} de ${t.criancas}` : undefined },
    { rotulo: "Minutos de excesso", valor: t ? (t.minutosDeExcesso > 0 ? `${t.minutosDeExcesso} min · ${formatarDuracao(t.minutosDeExcesso)}` : "0") : undefined },
    { rotulo: "Multa total", valor: t ? formatarMoeda(t.valorTotalDeMultas) : undefined },
    { rotulo: "Dias sem saída registrada", valor: t ? String(t.diasSemSaida) : undefined, alerta: (t?.diasSemSaida ?? 0) > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 print:grid-cols-4">
      {itens.map((i) => (
        <div
          key={i.rotulo}
          className={cn("flex flex-col gap-1 rounded-xl border bg-card px-3 py-2", i.alerta ? "border-warning-border bg-warning-soft" : "border-border")}
        >
          <span className="text-[11.5px] font-medium text-muted-foreground">{i.rotulo}</span>
          {carregando ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <span className="font-mono text-lg leading-tight font-semibold tabular-nums tracking-[-.02em]">{i.valor ?? "—"}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ detalhe por dia

const ROTULO_DA_SITUACAO: Record<SituacaoDoDia, { texto: string; variante: "success" | "pending" | "overdue" | "waiting" | "outline" }> = {
  ok: { texto: "No horário", variante: "success" },
  tolerancia: { texto: "Dentro da tolerância", variante: "waiting" },
  excesso: { texto: "Com excesso", variante: "overdue" },
  "sem-saida": { texto: "Sem saída registrada", variante: "pending" },
  "sem-chegada": { texto: "Sem chegada registrada", variante: "pending" },
  "sem-periodo": { texto: "Sem período contratado", variante: "outline" },
  "em-andamento": { texto: "Na escola agora", variante: "waiting" },
  inconsistente: { texto: "Horários inconsistentes", variante: "pending" },
};

/** Painel lateral (em tela cheia no celular) com os dias da criança no período. */
function DetalheDaCrianca({ linha, de, ate, onFechar }: { linha: LinhaDePermanencia | null; de: string; ate: string; onFechar: () => void }) {
  const { data, isLoading, isError, error } = useDetalheDePermanencia(linha?.studentId ?? null, de, ate);
  const resumo = data?.resumo ?? linha;

  return (
    <Dialog open={linha != null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 content-start rounded-none sm:max-w-lg print:hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{linha?.alunoNome}</DialogTitle>
          <DialogDescription>
            {linha?.turmaNome ?? "—"} · {rotuloDoPeriodo(linha?.periodo)}
            {linha && horarioPrevisto(linha) ? ` ${horarioPrevisto(linha)}` : ""}
            <span className="block">
              {formatarDia(de)} a {formatarDia(ate)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {resumo && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            <InfoDoCartao rotulo="Tempo total">
              <span className="font-mono tabular-nums">{horasEMinutos(resumo.minutosNaEscola)}</span>
            </InfoDoCartao>
            <InfoDoCartao rotulo="Excesso">
              <span className="font-mono tabular-nums">{horasEMinutos(resumo.minutosAlemDoPrevisto)}</span>
            </InfoDoCartao>
            <InfoDoCartao rotulo="Multa">
              <span className="font-mono font-semibold tabular-nums">{formatarMoeda(resumo.valorMulta)}</span>
            </InfoDoCartao>
            <InfoDoCartao rotulo="Horas cobradas">
              <span className="font-mono tabular-nums">{descreverHoras(resumo.horasCobradas, resumo.horasCobradasDobradas)}</span>
            </InfoDoCartao>
            <InfoDoCartao rotulo="Previsto">
              <span className="font-mono tabular-nums">{horasEMinutos(resumo.minutosPrevistos)}</span>
            </InfoDoCartao>
            <InfoDoCartao rotulo="Maior excesso">
              <span className="font-mono tabular-nums">
                {resumo.maiorExcessoNoDiaMinutos > 0 ? formatarDuracao(resumo.maiorExcessoNoDiaMinutos) : "—"}
              </span>
            </InfoDoCartao>
          </div>
        )}

        {resumo && resumo.avisos.length > 0 && (
          <div className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
            {resumo.avisos.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {error instanceof Error ? error.message : "Não foi possível abrir os dias da criança."}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          {data && data.dias.length === 0 && <p className="text-sm text-muted-foreground">Nenhum dia com presença no período.</p>}
          {data?.dias.map((d) => <LinhaDoDia key={d.data} dia={d} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinhaDoDia({ dia }: { dia: DiaDePermanencia }) {
  const situacao = ROTULO_DA_SITUACAO[dia.situacao];
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-medium tabular-nums">
          {formatarDia(dia.data).slice(0, 5)} <span className="font-sans text-xs font-normal text-muted-foreground">{semanaDoDia(dia.data)}</span>
          <span className="ml-2">
            {dia.chegadaEm ? horaBrasilia(dia.chegadaEm) : "?"}
            {" → "}
            {dia.saidaEm ? horaBrasilia(dia.saidaEm) : "?"}
          </span>
        </p>
        <Badge variant={situacao.variante}>{situacao.texto}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          Na escola <b className="font-mono font-medium text-foreground tabular-nums">{dia.minutosNaEscola != null ? formatarDuracao(dia.minutosNaEscola) : "—"}</b>
        </span>
        <span>
          Previsto até <b className="font-mono font-medium text-foreground tabular-nums">{dia.saidaPrevista ?? "—"}</b>
        </span>
        {dia.minutosAlemDoPrevisto > 0 && (
          <span>
            Excesso <b className="font-mono font-medium text-foreground tabular-nums">{formatarDuracao(dia.minutosAlemDoPrevisto)}</b>
          </span>
        )}
        {dia.valorMulta > 0 && (
          <span>
            {descreverHoras(dia.horasCobradas, dia.horasCobradasDobradas)} ·{" "}
            <b className="font-mono font-medium text-foreground tabular-nums">{formatarMoeda(dia.valorMulta)}</b>
          </span>
        )}
        {dia.retiradoPor && <span>Retirado por {dia.retiradoPor}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ planilha

function exportarPermanencia(relatorio: RelatorioDePermanencia, linhas: LinhaDePermanencia[]) {
  const dec = (n: number) => n.toFixed(2).replace(".", ",");
  baixarCsv(`portaria-permanencia-${relatorio.de}-a-${relatorio.ate}.csv`, [
    [
      "Código do aluno",
      "Criança",
      "Turma",
      "Período contratado",
      "Horário previsto",
      "Dias com presença",
      "Dias completos",
      "Tempo total (min)",
      "Média por dia (min)",
      "Previsto (min)",
      "Excesso (min)",
      "Dias com excesso",
      "Maior excesso em um dia (min)",
      "Horas cobradas",
      "Horas em dobro",
      "Multa (R$)",
      "Dias sem saída",
      "Dias sem chegada",
      "Dias inconsistentes",
      "Avisos",
    ],
    ...linhas.map((l) => [
      String(l.studentId),
      l.alunoNome,
      l.turmaNome ?? "",
      rotuloDoPeriodo(l.periodo),
      horarioPrevisto(l) ?? "",
      String(l.diasComPresenca),
      String(l.diasCompletos),
      String(l.minutosNaEscola),
      String(l.mediaMinutosPorDia),
      String(l.minutosPrevistos),
      String(l.minutosAlemDoPrevisto),
      String(l.diasComExcesso),
      String(l.maiorExcessoNoDiaMinutos),
      String(l.horasCobradas),
      String(l.horasCobradasDobradas),
      dec(l.valorMulta),
      String(l.diasSemSaida),
      String(l.diasSemChegada),
      String(l.diasInconsistentes),
      l.avisos.join(" "),
    ]),
  ]);
}
