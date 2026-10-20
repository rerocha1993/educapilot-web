"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleCheck, Send, TriangleAlert, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatarData } from "@/lib/format/date";
import { useDespublicarBoletim, usePublicarBoletim, useSituacaoDaPublicacao } from "@/lib/notas/use-notas";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Publicar o boletim do período da turma para as famílias (só a gestão). Antes de publicar mostra o que
 * ainda falta — notas, matérias sem avaliação e comportamento —, mas não impede: a escola decide. Ao
 * publicar, os responsáveis recebem o aviso no sino e no celular (sem e-mail).
 */
export function PublicacaoDoBoletim({ classId, periodoId, turma, periodo }: { classId: number; periodoId: string; turma: string; periodo: string }) {
  const { data: situacao, isLoading, isError } = useSituacaoDaPublicacao(classId, periodoId);
  const publicar = usePublicarBoletim();
  const despublicar = useDespublicarBoletim();
  const [dialogo, setDialogo] = useState<"publicar" | "despublicar" | null>(null);

  if (isLoading) return null;
  if (isError || !situacao) return null;

  const faltas = [
    situacao.notasFaltando > 0 && `${plural(situacao.notasFaltando, "nota ou texto sem lançar", "notas ou textos sem lançar")}`,
    situacao.materiasSemInstrumento > 0 && `${plural(situacao.materiasSemInstrumento, "matéria sem nenhuma avaliação", "matérias sem nenhuma avaliação")}`,
    situacao.comportamentoFaltando > 0 && `${plural(situacao.comportamentoFaltando, "criança sem conceito de comportamento", "crianças sem conceito de comportamento")}`,
  ].filter(Boolean) as string[];

  async function handlePublicar() {
    try {
      const r = await publicar.mutateAsync({ classId, periodoId });
      toast.success(
        r.avisados != null
          ? `Boletim publicado. ${plural(r.avisados, "responsável avisado", "responsáveis avisados")}.`
          : "Boletim publicado."
      );
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar.");
    }
  }

  async function handleDespublicar() {
    try {
      await despublicar.mutateAsync({ classId, periodoId });
      toast.success("Boletim retirado do portal das famílias.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao despublicar.");
    }
  }

  return (
    <section
      aria-label="Boletim do período"
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading font-semibold">Boletim do {periodo}</span>
          {situacao.publicado ? (
            <Badge variant="success">
              <CircleCheck /> Publicado{situacao.publicadoEm ? ` em ${formatarData(situacao.publicadoEm)}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline">Não publicado</Badge>
          )}
          {situacao.publicado && situacao.atualizadoAposPublicarEm != null && <Badge variant="pending">Atualizado após publicar</Badge>}
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {faltas.length === 0 ? "Nada faltando nesta turma." : `Falta: ${faltas.join("; ")}.`}
        </p>
      </div>

      {situacao.publicado ? (
        <Button variant="outline" onClick={() => setDialogo("despublicar")}>
          <Undo2 className="size-4" />
          Despublicar
        </Button>
      ) : (
        <Button variant="action" onClick={() => setDialogo("publicar")}>
          <Send className="size-4" />
          Publicar boletim do período
        </Button>
      )}

      <Dialog open={dialogo != null} onOpenChange={(aberto) => !aberto && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo === "despublicar" ? "Despublicar o boletim?" : "Publicar o boletim?"}</DialogTitle>
          </DialogHeader>

          {dialogo === "despublicar" ? (
            <p className="text-sm">
              O boletim do <strong>{periodo}</strong> da turma <strong>{turma}</strong> some do portal das famílias. As notas continuam salvas e
              você pode publicar de novo quando quiser.
            </p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                As famílias da turma <strong>{turma}</strong> passam a ver o boletim do <strong>{periodo}</strong> no portal e recebem um aviso
                no celular.
              </p>
              {faltas.length > 0 ? (
                <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Ainda falta: {faltas.join("; ")}. Você pode publicar assim mesmo, e a gestão continua podendo corrigir depois.
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Todas as notas e conceitos estão lançados.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            {dialogo === "despublicar" ? (
              <Button onClick={handleDespublicar} disabled={despublicar.isPending}>
                {despublicar.isPending ? "Retirando..." : "Despublicar"}
              </Button>
            ) : (
              <Button variant="action" onClick={handlePublicar} disabled={publicar.isPending}>
                {publicar.isPending ? "Publicando..." : "Publicar agora"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
