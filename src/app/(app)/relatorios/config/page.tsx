"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import {
  useAvailableReports,
  useSaveReportType,
  useDeleteReportType,
  REPORT_DATA_SOURCES,
  REPORT_DATA_SOURCE_LABELS,
  type ReportDataSource,
} from "@/lib/tasks/use-reports";

// Novo (2026-09, feedback do cliente) — "relatorios precisa cadastrar o tipo de
// relatorio, precisamos bolar o formato". Cadastro dos tipos disponíveis em
// /relatorios: nome, de onde vêm os dados (um relatório que já existe no sistema) e
// quais filtros o tipo pede (turma/período).
const EMPTY_FORM = {
  name: "",
  dataSource: "Ocorrencias" as ReportDataSource,
  requiresClass: true,
  requiresDateRange: true,
};

export default function RelatoriosConfigPage() {
  const { data: reports, isLoading } = useAvailableReports();
  const saveType = useSaveReportType();
  const deleteType = useDeleteReportType();

  const [form, setForm] = useState(EMPTY_FORM);

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      await saveType.mutateAsync({ ...form, name: form.name.trim() });
      toast.success("Tipo de relatório criado.");
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar tipo de relatório.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteType.mutateAsync(id);
      toast.success("Tipo de relatório excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Configurar relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os tipos de relatório disponíveis e de onde vêm os dados.
          </p>
        </div>
        <Link
          href="/relatorios"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para relatórios
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-sm font-semibold">Novo tipo de relatório</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Nome
              </span>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Ocorrências mensais"
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                De onde vêm os dados
              </span>
              <Select
                value={form.dataSource}
                onValueChange={(v) => v && setForm((f) => ({ ...f, dataSource: v as ReportDataSource }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => REPORT_DATA_SOURCE_LABELS[form.dataSource]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REPORT_DATA_SOURCES.map((ds) => (
                    <SelectItem key={ds} value={ds}>
                      {REPORT_DATA_SOURCE_LABELS[ds]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.requiresClass}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requiresClass: v === true }))}
              />
              Pede turma
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.requiresDateRange}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requiresDateRange: v === true }))}
              />
              Pede período
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={!form.name.trim() || saveType.isPending}>
              <Plus className="size-4" />
              Criar tipo de relatório
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!isLoading && (reports?.length ?? 0) === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum tipo de relatório cadastrado ainda.
          </p>
        )}

        {reports?.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <div className="flex-1">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {REPORT_DATA_SOURCE_LABELS[r.dataSource] ?? r.dataSource} ·{" "}
                {[r.requiresClass && "por turma", r.requiresDateRange && "por período"]
                  .filter(Boolean)
                  .join(" · ") || "sem filtros"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(r.id)}
              disabled={deleteType.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
