"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditorDeRelatorio } from "@/components/flow/editor-de-relatorio";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { BadgeDeSituacao } from "@/components/flow/badge-de-situacao";
import {
  useBaixarRelatorio,
  useDadosDoRelatorio,
  useRelatorioDeFormulario,
} from "@/lib/flow/use-relatorios";
import { formatarDataHora } from "@/lib/format/date";

/** Cabeçalho de coluna do guia. */
const CABECALHO_DE_COLUNA = "text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground";

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
      <CabecalhoDaPagina
        eyebrow="← Relatórios"
        eyebrowHref="/flow/relatorios"
        titulo={data?.nome ?? definicao?.nome ?? "Relatório"}
        tags={
          definicao ? (
            <Button variant="ghost" size="icon-sm" title="Editar relatório" onClick={() => setEditando(true)}>
              <Pencil className="size-4" />
            </Button>
          ) : undefined
        }
        apoio={
          <>
            {data?.formNome ?? definicao?.formNome}
            {data?.statusFiltro ? ` · só envios ${data.statusFiltro}` : ""}
            {(data?.descricao ?? definicao?.descricao) && (
              <span className="block break-words">{data?.descricao ?? definicao?.descricao}</span>
            )}
          </>
        }
        acoes={
          <Button variant="action" onClick={handleBaixar} disabled={baixar.isPending || !data}>
            <Download className="size-4" />
            {baixar.isPending ? "Gerando..." : "Baixar Excel"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
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
        <span className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{linhas.length}</span> envio(s)
        </span>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível gerar o relatório."}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`${CABECALHO_DE_COLUNA} whitespace-nowrap`}>Enviado em</TableHead>
                <TableHead className={CABECALHO_DE_COLUNA}>Status</TableHead>
                {data.colunas.map((coluna, i) => (
                  <TableHead key={`${coluna}-${i}`} className={`${CABECALHO_DE_COLUNA} whitespace-nowrap`}>
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
                  <TableCell className="font-mono text-sm whitespace-nowrap tabular-nums">
                    {formatarDataHora(l.enviadoEm)}
                  </TableCell>
                  <TableCell>
                    <BadgeDeSituacao situacao={l.status} />
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
