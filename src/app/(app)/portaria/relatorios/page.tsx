"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PortariaNav } from "@/components/reception/portaria-nav";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useRelatorioDeMultas,
  useRelatorioVisitas,
  type FiltroRelatorio,
  type RelatorioDeMultas,
  type RelatorioVisitas,
  type Situacao,
} from "@/lib/reception/use-portaria";
import { dataHoraBrasilia, formatarCpf, formatarDuracao, horaBrasilia, hojeEmBrasilia } from "@/lib/reception/formatar";
import { formatarMoeda } from "@/lib/reception/numeros";
import { useAtrasado } from "@/lib/reception/use-atrasado";

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "abertas", rotulo: "Na escola" },
  { valor: "encerradas", rotulo: "Encerradas" },
];

const TODAS = "0";

export default function RelatoriosPortariaPage() {
  return (
    <div className="flex flex-col gap-4">
      <PortariaNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visitas e multas por atraso no período, no horário de Brasília.</p>
      </div>

      <Tabs defaultValue="visitas">
        <TabsList>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="multas">Multas por atraso</TabsTrigger>
        </TabsList>
        <TabsContent value="visitas" className="pt-2">
          <RelatorioDeVisitas />
        </TabsContent>
        <TabsContent value="multas" className="pt-2">
          <RelatorioDeMultasPorAtraso />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeletorDeTurma({ classId, onChange }: { classId: number | null; onChange: (classId: number | null) => void }) {
  const { data: turmas } = useClasses();
  const lista = (turmas ?? []).filter((t) => t.id != null);

  return (
    <div className="flex min-w-48 flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">Turma</Label>
      <Select value={classId ? String(classId) : TODAS} onValueChange={(v) => onChange(v && v !== TODAS ? Number(v) : null)}>
        <SelectTrigger className="w-full">
          <SelectValue>{() => lista.find((t) => t.id === classId)?.className ?? "Todas"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas</SelectItem>
          {lista.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.className}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CampoData({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Input type="date" className="w-40" value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ------------------------------------------------------------------ visitas

function RelatorioDeVisitas() {
  const [filtro, setFiltro] = useState<FiltroRelatorio>(() => {
    const hoje = hojeEmBrasilia();
    return { de: hoje, ate: hoje, situacao: "", classId: null, busca: "" };
  });
  const buscaAtrasada = useAtrasado(filtro.busca, 400);
  const { data, isLoading, isError, error } = useRelatorioVisitas({ ...filtro, busca: buscaAtrasada });

  const visitas = data?.visitas ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <CampoData rotulo="De" valor={filtro.de} onChange={(de) => setFiltro((f) => ({ ...f, de }))} />
        <CampoData rotulo="Até" valor={filtro.ate} onChange={(ate) => setFiltro((f) => ({ ...f, ate }))} />
        <div className="flex min-w-36 flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Situação</Label>
          <Select
            value={filtro.situacao || "todas"}
            onValueChange={(v) => setFiltro((f) => ({ ...f, situacao: v === "todas" ? "" : (v as Situacao) }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => SITUACOES.find((s) => s.valor === filtro.situacao)?.rotulo ?? "Todas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SITUACOES.map((s) => (
                <SelectItem key={s.rotulo} value={s.valor || "todas"}>
                  {s.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SeletorDeTurma classId={filtro.classId} onChange={(classId) => setFiltro((f) => ({ ...f, classId }))} />
        <div className="flex min-w-56 flex-1 flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Visitante</Label>
          <Input
            placeholder="Nome ou CPF"
            value={filtro.busca}
            onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
          />
        </div>
        <Button variant="outline" onClick={() => data && exportarVisitas(data, filtro)} disabled={!data || visitas.length === 0}>
          <Download /> Exportar planilha
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo rotulo="Visitas" valor={data?.total} carregando={isLoading} />
        <Resumo rotulo="Ainda na escola" valor={data?.emAndamento} carregando={isLoading} />
        <Resumo rotulo="Visitantes diferentes" valor={data?.visitantesDistintos} carregando={isLoading} />
        <Resumo
          rotulo="Tempo médio"
          valor={data ? (data.duracaoMediaMinutos == null ? "—" : formatarDuracao(data.duracaoMediaMinutos)) : undefined}
          carregando={isLoading}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitante</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Visitou</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Duração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LinhasCarregando colunas={6} />}

            {!isLoading && visitas.length === 0 && <LinhaVazia colunas={6} texto="Nenhuma visita no período." />}

            {visitas.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <p className="font-medium">{v.visitanteNome}</p>
                  <p className="text-xs text-muted-foreground">{formatarCpf(v.visitanteCpf)}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.motivo ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {v.alunoNome ?? v.turmaNome ?? <span className="text-muted-foreground">—</span>}
                  {v.alunoNome && v.turmaNome && <span className="block text-xs text-muted-foreground">{v.turmaNome}</span>}
                </TableCell>
                <TableCell className="text-sm">{dataHoraBrasilia(v.entradaEm)}</TableCell>
                <TableCell className="text-sm">
                  {v.saidaEm ? (
                    dataHoraBrasilia(v.saidaEm)
                  ) : (
                    <Badge className="bg-success-soft text-success-soft-foreground">Na escola</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{v.saidaEm ? formatarDuracao(v.duracaoMinutos) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ multas

function RelatorioDeMultasPorAtraso() {
  const [filtro, setFiltro] = useState(() => {
    const hoje = hojeEmBrasilia();
    return { de: `${hoje.slice(0, 8)}01`, ate: hoje, classId: null as number | null };
  });
  const { data, isLoading, isError, error } = useRelatorioDeMultas(filtro);
  const linhas = data?.linhas ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <CampoData rotulo="De" valor={filtro.de} onChange={(de) => setFiltro((f) => ({ ...f, de }))} />
        <CampoData rotulo="Até" valor={filtro.ate} onChange={(ate) => setFiltro((f) => ({ ...f, ate }))} />
        <SeletorDeTurma classId={filtro.classId} onChange={(classId) => setFiltro((f) => ({ ...f, classId }))} />
        <Button
          variant="outline"
          className="sm:ml-auto"
          onClick={() => data && exportarMultas(data, filtro)}
          disabled={!data || linhas.length === 0}
        >
          <Download /> Exportar planilha
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório de multas."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo rotulo="Total em multas" valor={data ? formatarMoeda(data.total) : undefined} carregando={isLoading} />
        <Resumo rotulo="Saídas com multa" valor={data?.ocorrencias} carregando={isLoading} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Saída prevista</TableHead>
              <TableHead>Saiu</TableHead>
              <TableHead>Atraso</TableHead>
              <TableHead>Horas cobradas</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LinhasCarregando colunas={7} />}

            {!isLoading && linhas.length === 0 && <LinhaVazia colunas={7} texto="Nenhuma multa por atraso no período." />}

            {linhas.map((l) => (
              <TableRow key={`${l.data}-${l.studentId}`}>
                <TableCell className="text-sm tabular-nums">{formatarDia(l.data)}</TableCell>
                <TableCell>
                  <p className="font-medium">{l.alunoNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.turmaNome ?? "—"}
                    {l.retiradoPor ? ` · com ${l.retiradoPor}` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-sm tabular-nums">{l.saidaPrevista ?? "—"}</TableCell>
                <TableCell className="text-sm tabular-nums">{l.saidaEm ? horaBrasilia(l.saidaEm) : "—"}</TableCell>
                <TableCell className="text-sm">{l.minutosAtraso} min</TableCell>
                <TableCell className="text-sm">{descreverHoras(l.horasMulta, l.horasMultaDobrada)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatarMoeda(l.valorMulta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ apoio

function formatarDia(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function descreverHoras(normais: number, dobradas: number) {
  const partes = [];
  if (normais > 0) partes.push(`${normais}h`);
  if (dobradas > 0) partes.push(`${dobradas}h em dobro`);
  return partes.join(" + ") || "—";
}

function LinhasCarregando({ colunas }: { colunas: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colunas}>
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function LinhaVazia({ colunas, texto }: { colunas: number; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colunas} className="py-10 text-center text-sm text-muted-foreground">
        {texto}
      </TableCell>
    </TableRow>
  );
}

function Resumo({ rotulo, valor, carregando }: { rotulo: string; valor: number | string | undefined; carregando: boolean }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{rotulo}</span>
        {carregando ? <Skeleton className="h-7 w-16" /> : <span className="font-heading text-2xl font-bold">{valor ?? "—"}</span>}
      </CardContent>
    </Card>
  );
}

/**
 * Planilha: ponto e vírgula e BOM, que é o que o Excel em português abre direto, com acento e em
 * colunas. Célula que começa com = + - @ ganha um apóstrofo: é texto digitado por alguém, e sem isso
 * o Excel o executaria como fórmula.
 */
function baixarCsv(nome: string, linhas: string[][]) {
  const celula = (valor: string) => {
    const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function exportarVisitas(relatorio: RelatorioVisitas, filtro: FiltroRelatorio) {
  baixarCsv(`portaria-visitas-${filtro.de}-a-${filtro.ate}.csv`, [
    ["Visitante", "CPF", "Motivo", "Aluno", "Turma", "Entrada", "Saída", "Duração (min)"],
    ...relatorio.visitas.map((v) => [
      v.visitanteNome,
      v.visitanteCpf ? formatarCpf(v.visitanteCpf) : "",
      v.motivo ?? "",
      v.alunoNome ?? "",
      v.turmaNome ?? "",
      dataHoraBrasilia(v.entradaEm),
      v.saidaEm ? dataHoraBrasilia(v.saidaEm) : "Na escola",
      v.saidaEm ? String(v.duracaoMinutos) : "",
    ]),
  ]);
}

function exportarMultas(relatorio: RelatorioDeMultas, filtro: { de: string; ate: string }) {
  baixarCsv(`portaria-multas-${filtro.de}-a-${filtro.ate}.csv`, [
    ["Dia", "Aluno", "Turma", "Quem buscou", "Saída prevista", "Saiu", "Atraso (min)", "Horas", "Horas em dobro", "Valor (R$)"],
    ...relatorio.linhas.map((l) => [
      formatarDia(l.data),
      l.alunoNome,
      l.turmaNome ?? "",
      l.retiradoPor ?? "",
      l.saidaPrevista ?? "",
      l.saidaEm ? horaBrasilia(l.saidaEm) : "",
      String(l.minutosAtraso),
      String(l.horasMulta),
      String(l.horasMultaDobrada),
      l.valorMulta.toFixed(2).replace(".", ","),
    ]),
  ]);
}
