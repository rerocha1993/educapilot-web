"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useForm } from "@/lib/flow/use-forms";
import {
  useFormResponses,
  useMarkResponseReviewed,
  useExportResponses,
  type FormResponseDto,
} from "@/lib/flow/use-form-responses";
import { decodeOpcoes } from "@/lib/flow/use-form-fields";
import { AttachmentLink } from "@/components/flow/attachment-link";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { BadgeDeSituacao } from "@/components/flow/badge-de-situacao";
import { formatarDataHora } from "@/lib/format/date";

function renderValor(tipo: string | undefined, valor: string | null) {
  if (!valor) return "—";
  if (tipo === "checkbox") return decodeOpcoes(valor).join(", ") || "—";
  if (tipo === "anexo") return <AttachmentLink url={valor} />;
  if (tipo === "contrato") return valor.toLowerCase() === "aceito" ? "Aceito" : "Não aceito";
  if (tipo === "avaliacao") return `${valor} ★`;
  return valor;
}

// Mantém o layout curto (sem ano), mas agora no horário de Brasília.
function formatDateTime(iso: string) {
  return formatarDataHora(iso, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
      <CabecalhoDaPagina
        eyebrow={`← ${form?.nome ?? "Formulário"}`}
        eyebrowHref={`/flow/${formId}`}
        titulo="Respostas"
        acoes={
          responses && responses.length > 0 ? (
            <Button
              variant="action"
              className="w-full md:w-auto"
              onClick={handleExport}
              disabled={exportResponses.isPending}
            >
              {exportResponses.isPending ? "Exportando..." : "Exportar Excel"}
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as respostas.
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && responses?.length === 0 && (
        <EstadoVazio icone={<Inbox />} titulo="Nenhuma resposta enviada ainda." />
      )}

      {!isLoading && responses && responses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {responses.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/50",
                  selected?.id === r.id && "bg-muted/60"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.nomeReferencia ?? "—"}</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(r.dataPreenchimento)}
                  </p>
                </div>
                <BadgeDeSituacao situacao={r.status} />
              </button>
            ))}
          </div>

          {selected && (
            <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4">
              <p className="font-heading text-[15.5px] font-semibold break-words">
                Resposta · {selected.nomeReferencia ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {form?.nome} ·{" "}
                <span className="font-mono tabular-nums">{formatDateTime(selected.dataPreenchimento)}</span>
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {selected.itens?.map((item) => {
                  const field = form?.campos?.find((c) => c.id === item.fieldId);
                  return (
                    <div key={item.id} className="text-sm break-words">
                      <span className="text-muted-foreground">{field?.label ?? "Campo"}: </span>
                      <span className="font-medium">{renderValor(field?.tipo, item.valor)}</span>
                    </div>
                  );
                })}
                {selected.observacoes && (
                  <div className="text-sm break-words">
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
