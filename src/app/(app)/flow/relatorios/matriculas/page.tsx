"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useBaixarRelatorioMatriculas,
  useRelatorioMatriculas,
  type SituacaoDaMatricula,
} from "@/lib/flow/use-relatorios";
import { formatarData } from "@/lib/format/date";

const COR_DA_SITUACAO: Record<SituacaoDaMatricula, string> = {
  rematriculado: "bg-success-soft text-success-soft-foreground",
  "rematricula-pendente": "bg-warning-soft text-warning-soft-foreground",
  "nao-rematriculado": "bg-destructive-soft text-destructive-soft-foreground",
  "matricula-nova": "bg-primary/10 text-primary",
  "matricula-nova-pendente": "bg-warning-soft text-warning-soft-foreground",
  "rematricula-sem-cadastro": "bg-muted text-muted-foreground",
};

const TODAS = "todas";

export default function MatriculasXRematriculasPage() {
  const { data, isLoading, isError, error } = useRelatorioMatriculas();
  const baixar = useBaixarRelatorioMatriculas();
  const [situacao, setSituacao] = useState<string>(TODAS);
  const [busca, setBusca] = useState("");

  const ano = data?.anoVigente ?? new Date().getFullYear();
  const proximo = data?.proximoAno ?? ano + 1;

  const filtros: { valor: string; rotulo: string }[] = [
    { valor: TODAS, rotulo: "Todas as situações" },
    { valor: "rematriculado", rotulo: `Rematriculados para ${proximo}` },
    { valor: "rematricula-pendente", rotulo: "Rematrícula aguardando aprovação" },
    { valor: "nao-rematriculado", rotulo: "Sem rematrícula" },
    { valor: "matricula-nova", rotulo: `Matrículas novas para ${proximo}` },
    { valor: "matricula-nova-pendente", rotulo: "Matrícula nova aguardando aprovação" },
    { valor: "rematricula-sem-cadastro", rotulo: "Rematrícula sem aluno no cadastro" },
  ];

  const termo = busca.trim().toLowerCase();
  const linhas = (data?.linhas ?? []).filter(
    (l) =>
      (situacao === TODAS || l.situacao === situacao) &&
      (!termo || l.aluno.toLowerCase().includes(termo) || (l.turmaAtual ?? "").toLowerCase().includes(termo))
  );

  async function handleBaixar() {
    try {
      await baixar.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar a planilha.");
    }
  }

  const resumo = data
    ? [
        { rotulo: `Alunos ativos em ${ano}`, valor: data.alunosAtivos, situacao: TODAS },
        { rotulo: `Rematriculados para ${proximo}`, valor: data.rematriculados, situacao: "rematriculado" },
        { rotulo: "Aguardando aprovação", valor: data.rematriculasPendentes, situacao: "rematricula-pendente" },
        { rotulo: "Sem rematrícula", valor: data.naoRematriculados, situacao: "nao-rematriculado" },
        { rotulo: `Matrículas novas para ${proximo}`, valor: data.matriculasNovas, situacao: "matricula-nova" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/flow/relatorios" className="inline-flex min-h-10 items-center text-xs text-muted-foreground hover:underline md:inline md:min-h-0">
            ← Relatórios
          </Link>
          <h1 className="font-heading text-xl font-bold">
            Matrículas {ano} x Rematrículas {proximo}
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos os alunos ativos em {ano}, com a situação da rematrícula para {proximo}, mais as matrículas novas.
            O envio é ligado ao aluno pelo nome e pela data de nascimento preenchidos na ficha.
          </p>
        </div>
        <Button variant="outline" onClick={handleBaixar} disabled={baixar.isPending || !data}>
          <Download className="size-4" />
          {baixar.isPending ? "Gerando..." : "Baixar Excel"}
        </Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório."}
        </div>
      )}

      {isLoading && <Skeleton className="h-24 w-full" />}

      {data && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3">
          {resumo.map((r) => (
            <button key={r.rotulo} type="button" onClick={() => setSituacao(r.situacao)} className="text-left" title="Filtrar a lista">
              <p className="text-xs text-muted-foreground">{r.rotulo}</p>
              <p className="font-mono text-lg font-semibold tabular-nums">{r.valor}</p>
            </button>
          ))}
          {data.rematriculasSemCadastro > 0 && (
            <button type="button" onClick={() => setSituacao("rematricula-sem-cadastro")} className="text-left">
              <p className="text-xs text-destructive">Rematrícula sem aluno no cadastro</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-destructive">{data.rematriculasSemCadastro}</p>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={situacao} onValueChange={(v) => v && setSituacao(String(v))}>
          <SelectTrigger className="w-full md:w-72">
            <SelectValue>{() => filtros.find((f) => f.valor === situacao)?.rotulo}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filtros.map((f) => (
              <SelectItem key={f.valor} value={f.valor}>
                {f.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full md:w-auto md:min-w-56 md:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar aluno ou turma" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{linhas.length} aluno(s)</span>
      </div>

      {/* Celular: um cartão por aluno em vez das cinco colunas. */}
      <div className="flex flex-col rounded-lg border border-border bg-card md:hidden">
        {!isLoading && linhas.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum aluno nesta situação.</p>
        )}
        {linhas.map((l, i) => (
          <div
            key={`${l.studentId ?? "envio"}-${l.aluno}-${i}`}
            className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 font-medium break-words">{l.aluno}</p>
              <Badge className={COR_DA_SITUACAO[l.situacao]}>{l.situacaoDescricao}</Badge>
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">Turma em {ano}: </span>
              {l.turmaAtual ?? <span className="text-muted-foreground">—</span>}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Turma em {proximo}: </span>
              {l.turmaProximoAno ?? <span className="text-muted-foreground">—</span>}
            </p>
            <p className="text-xs break-words text-muted-foreground">
              Envio: {l.enviadoEm ? `${l.statusEnvio ?? ""} · ${formatarData(l.enviadoEm)}` : "—"}
              {l.formulario && <span className="block">{l.formulario}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma em {ano}</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Turma em {proximo}</TableHead>
              <TableHead>Envio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum aluno nesta situação.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l, i) => (
              <TableRow key={`${l.studentId ?? "envio"}-${l.aluno}-${i}`}>
                <TableCell className="font-medium">{l.aluno}</TableCell>
                <TableCell className="text-sm">{l.turmaAtual ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge className={COR_DA_SITUACAO[l.situacao]}>{l.situacaoDescricao}</Badge>
                </TableCell>
                <TableCell className="text-sm">{l.turmaProximoAno ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.enviadoEm ? `${l.statusEnvio ?? ""} · ${formatarData(l.enviadoEm)}` : "—"}
                  {l.formulario && <span className="block">{l.formulario}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
