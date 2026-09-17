"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditorDeRelatorio } from "@/components/flow/editor-de-relatorio";
import { RESPONSE_STATUS_BADGE } from "@/lib/flow/use-form-responses";
import {
  useBaixarRelatorio,
  useDadosDoRelatorio,
  useRelatorioDeFormulario,
} from "@/lib/flow/use-relatorios";
import { formatarDataHora } from "@/lib/format/date";

export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>();
  const { data: definicao } = useRelatorioDeFormulario(id);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(false);

  const { data, isLoading, isError, error } = useDadosDoRelatorio(id, de, ate);
  const baixar = useBaixarRelatorio();

  const termo = busca.trim().toLowerCase();
  const linhas = (data?.linhas ?? []).filter(
    (l) => !termo || l.valores.some((v) => v.toLowerCase().includes(termo))
  );

  async function handleBaixar() {
    try {
      await baixar.mutateAsync({ id, de, ate });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar a planilha.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/flow/relatorios" className="inline-flex min-h-10 items-center text-xs text-muted-foreground hover:underline md:inline md:min-h-0">
            ← Relatórios
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-xl font-bold">{data?.nome ?? definicao?.nome ?? "Relatório"}</h1>
            {definicao && (
              <Button variant="ghost" size="icon-sm" title="Editar relatório" onClick={() => setEditando(true)}>
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {data?.formNome ?? definicao?.formNome}
            {data?.statusFiltro ? ` · só envios ${data.statusFiltro}` : ""}
          </p>
          {(data?.descricao ?? definicao?.descricao) && (
            <p className="text-sm break-words text-muted-foreground">{data?.descricao ?? definicao?.descricao}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleBaixar} disabled={baixar.isPending || !data}>
          <Download className="size-4" />
          {baixar.isPending ? "Gerando..." : "Baixar Excel"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex w-[calc(50%-6px)] flex-col gap-[5px] md:w-auto">
          <Label className="text-xs text-muted-foreground">Enviados de</Label>
          <Input type="date" className="w-full md:w-40" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="flex w-[calc(50%-6px)] flex-col gap-[5px] md:w-auto">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" className="w-full md:w-40" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="relative w-full md:w-auto md:min-w-56 md:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar em qualquer coluna" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{linhas.length} envio(s)</span>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório."}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Enviado em</TableHead>
                <TableHead>Status</TableHead>
                {data.colunas.map((coluna, i) => (
                  <TableHead key={`${coluna}-${i}`} className="whitespace-nowrap">
                    {coluna}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={data.colunas.length + 2} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum envio neste período.
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((l) => (
                <TableRow key={l.respostaId}>
                  <TableCell className="whitespace-nowrap text-sm">{formatarDataHora(l.enviadoEm)}</TableCell>
                  <TableCell>
                    <Badge className={RESPONSE_STATUS_BADGE[l.status] ?? ""}>{l.status}</Badge>
                  </TableCell>
                  {l.valores.map((valor, i) => (
                    <TableCell key={i} className="max-w-72 truncate text-sm" title={valor}>
                      {valor || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editando && definicao && <EditorDeRelatorio relatorio={definicao} onFechar={() => setEditando(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
