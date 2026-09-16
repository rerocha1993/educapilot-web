"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { EditorDeRelatorio } from "@/components/flow/editor-de-relatorio";
import { useForms } from "@/lib/flow/use-forms";
import { useBaixarExcel } from "@/lib/flow/use-form-responses";
import { tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";
import {
  useExcluirRelatorio,
  useRelatoriosDeFormulario,
  type RelatorioDeFormulario,
} from "@/lib/flow/use-relatorios";

/**
 * Central de relatórios de Formulários.
 *
 * A escola monta quantos relatórios quiser, cada um sobre um formulário, com as perguntas que viram
 * coluna e os envios que entram. O de matrículas x rematrículas fica ao lado, como um relatório
 * pronto, porque junta formulários e cadastro de alunos — coisa que um relatório montado não faz.
 */
export default function RelatoriosFormulariosPage() {
  const router = useRouter();
  const { data: relatorios, isLoading } = useRelatoriosDeFormulario();
  const excluir = useExcluirRelatorio();

  const [editando, setEditando] = useState<RelatorioDeFormulario | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<RelatorioDeFormulario | null>(null);

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success(`"${excluindo.nome}" excluído.`);
      setExcluindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir o relatório.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/flow" className="text-xs text-muted-foreground hover:underline">
            ← Formulários
          </Link>
          <h1 className="font-heading text-xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Monte relatórios sobre qualquer formulário, escolhendo as perguntas e os envios que entram.
          </p>
        </div>
        <Button onClick={() => setEditando("novo")}>
          <Plus className="size-4" /> Novo relatório
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/flow/relatorios/matriculas"
          className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40"
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-muted-foreground" />
            <p className="font-medium">Matrículas x Rematrículas</p>
            <Badge variant="secondary">Pronto</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Alunos ativos no ano e quem já está rematriculado para o próximo, mais as matrículas novas.
          </p>
        </Link>

        {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}

        {(relatorios ?? []).map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <Link href={`/flow/relatorios/${r.id}`} className="flex flex-col gap-1 hover:underline-offset-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                <p className="truncate font-medium">{r.nome}</p>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {r.formNome ?? "Formulário excluído"}
                {" · "}
                {r.camposIds.length === 0 ? "todas as perguntas" : `${r.camposIds.length} coluna(s)`}
                {r.statusFiltro ? ` · só ${r.statusFiltro}` : ""}
              </p>
              {r.descricao && <p className="line-clamp-2 text-xs text-muted-foreground">{r.descricao}</p>}
            </Link>
            <div className="mt-auto flex gap-1">
              <Button variant="outline" size="sm" onClick={() => router.push(`/flow/relatorios/${r.id}`)}>
                Abrir
              </Button>
              <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditando(r)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setExcluindo(r)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && (relatorios ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum relatório montado ainda. Clique em <strong>Novo relatório</strong>, escolha o formulário e as
          perguntas que viram coluna.
        </p>
      )}

      <PlanilhasDosFormularios />

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editando !== null && (
            <EditorDeRelatorio
              relatorio={editando === "novo" ? undefined : editando}
              onFechar={() => setEditando(null)}
              onSalvo={(salvo) => {
                if (editando === "novo") router.push(`/flow/relatorios/${salvo.id}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir relatório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir <strong>{excluindo?.nome}</strong> apaga só a montagem do relatório. Os envios do formulário
            continuam todos guardados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanilhasDosFormularios() {
  const { data: forms, isLoading } = useForms();
  const baixar = useBaixarExcel();
  const [baixando, setBaixando] = useState<string | null>(null);

  const formularios = forms ?? [];

  async function handleBaixar(lista: { id: string; nome: string }[], chave: string) {
    setBaixando(chave);
    try {
      await baixar.mutateAsync(lista);
      if (lista.length > 1) toast.success(`${lista.length} planilhas baixadas, uma por formulário.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar a planilha.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold">Respostas completas dos formulários</h2>
          <p className="text-sm text-muted-foreground">
            Uma planilha por formulário, com todas as perguntas e todos os envios, sem montar relatório.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => handleBaixar(formularios.map((f) => ({ id: f.id, nome: f.nome })), "todos")}
          disabled={baixar.isPending || formularios.length === 0}
        >
          <Download className="size-4" />
          {baixando === "todos" ? "Gerando..." : "Baixar todos"}
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      <div className="flex flex-col rounded-lg border border-border">
        {formularios.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">{f.nome}</span>
              <TagDoTipo tipo={tipoDoFormulario(f)} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBaixar([{ id: f.id, nome: f.nome }], f.id)}
              disabled={baixar.isPending}
            >
              <Download className="size-4" />
              {baixando === f.id ? "Gerando..." : "Excel"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
