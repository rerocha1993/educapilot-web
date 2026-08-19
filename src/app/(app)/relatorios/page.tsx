"use client";

import { FileBarChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { useAvailableReports } from "@/lib/tasks/use-reports";

export default function RelatoriosPage() {
  const { data: reports, isLoading, isError } = useAvailableReports();

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Central de relatórios</h1>
        <p className="text-sm text-muted-foreground">
          O backend só lista os tipos disponíveis — geração customizada (filtros,
          exportação) ainda não é suportada.
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os relatórios.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}

        {!isLoading && (reports?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum relatório disponível.</p>
        )}

        {reports?.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <FileBarChart className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.requiresClass && "por turma", r.requiresDateRange && "por período"]
                    .filter(Boolean)
                    .join(" · ") || "sem filtros"}
                </p>
              </div>
            </div>
            <span
              title="Geração customizada ainda não é suportada pelo backend"
              className="cursor-not-allowed text-sm text-muted-foreground"
            >
              Gerar ›
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
