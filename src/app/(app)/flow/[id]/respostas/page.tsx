"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useForm } from "@/lib/flow/use-forms";
import {
  useFormResponses,
  useMarkResponseReviewed,
  useExportResponses,
  RESPONSE_STATUS_BADGE,
  type FormResponseDto,
} from "@/lib/flow/use-form-responses";
import { decodeOpcoes } from "@/lib/flow/use-form-fields";

function renderValor(tipo: string | undefined, valor: string | null) {
  if (!valor) return "—";
  if (tipo === "checkbox") return decodeOpcoes(valor).join(", ") || "—";
  if (tipo === "anexo")
    return (
      <a href={valor} target="_blank" rel="noreferrer" className="text-primary underline">
        Ver arquivo
      </a>
    );
  if (tipo === "avaliacao") return `${valor} ★`;
  return valor;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function FormResponsesPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const { data: form } = useForm(formId);
  const { data: responses, isLoading, isError } = useFormResponses(formId);
  const markReviewed = useMarkResponseReviewed(formId);
  const exportResponses = useExportResponses(formId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = responses?.find((r) => r.id === selectedId) ?? responses?.[0] ?? null;

  async function handleMarkReviewed(response: FormResponseDto) {
    try {
      await markReviewed.mutateAsync(response);
      toast.success("Resposta marcada como revisada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao marcar como revisada.");
    }
  }

  async function handleExport() {
    try {
      await exportResponses.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/flow/${formId}`} className="text-xs text-muted-foreground hover:underline">
            ← {form?.nome ?? "Formulário"}
          </Link>
          <h1 className="font-heading text-xl font-bold">Respostas</h1>
        </div>
        {responses && responses.length > 0 && (
          <Button variant="outline" onClick={handleExport} disabled={exportResponses.isPending}>
            {exportResponses.isPending ? "Exportando..." : "Exportar Excel"}
          </Button>
        )}
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as respostas.
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && responses?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma resposta enviada ainda.
        </div>
      )}

      {!isLoading && responses && responses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border bg-card">
            {responses.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "flex w-full items-center justify-between border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-accent/50",
                  selected?.id === r.id && "bg-accent/50"
                )}
              >
                <div>
                  <p className="font-medium">{r.nomeReferencia ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.dataPreenchimento)}</p>
                </div>
                <Badge className={RESPONSE_STATUS_BADGE[r.status] ?? ""}>{r.status}</Badge>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-heading text-sm font-semibold">Resposta · {selected.nomeReferencia ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {form?.nome} · {formatDateTime(selected.dataPreenchimento)}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {selected.itens?.map((item) => {
                  const field = form?.campos?.find((c) => c.id === item.fieldId);
                  return (
                    <div key={item.id} className="text-sm">
                      <span className="text-muted-foreground">{field?.label ?? "Campo"}: </span>
                      <span className="font-medium">{renderValor(field?.tipo, item.valor)}</span>
                    </div>
                  );
                })}
                {selected.observacoes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações: </span>
                    <span className="font-medium">{selected.observacoes}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Nenhuma automação foi disparada — o backend ainda não tem motor de
                execução de automações (ver aba Automações do formulário).
              </div>
              {selected.status !== "Concluída" && (
                <Button
                  className="mt-3 w-full"
                  onClick={() => handleMarkReviewed(selected)}
                  disabled={markReviewed.isPending}
                >
                  Marcar como revisada
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
