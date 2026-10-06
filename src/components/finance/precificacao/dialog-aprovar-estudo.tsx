"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatarPercentual } from "@/lib/finance/precificacao-formatar";
import { useAprovarEstudo, type EstudoDetalhe } from "@/lib/finance/use-precificacao";

/**
 * Aprovar o estudo: fecha o rascunho e, se a pessoa quiser, leva o resultado para onde a escola
 * já usa — o reajuste da rematrícula e o valor de cada plano.
 *
 * Os dois efeitos são escolhidos aqui, e não decididos pelo sistema, porque mexem em dinheiro de
 * família. Depois de aprovado o estudo vira somente leitura.
 */
export function DialogAprovarEstudo({
  estudo,
  alteracoesPendentes,
  onFechar,
}: {
  estudo: EstudoDetalhe;
  /** Há edição não salva: aprovar agora aprovaria um estudo diferente do que está na tela. */
  alteracoesPendentes: boolean;
  onFechar: () => void;
}) {
  const aprovar = useAprovarEstudo(estudo.id);
  const [reajusteGeral, setReajusteGeral] = useState(true);
  const [porTurma, setPorTurma] = useState(false);
  const sugerido = estudo.resultado.reajusteSugeridoGeral;

  async function confirmar() {
    try {
      await aprovar.mutateAsync({ aplicarReajusteGeral: reajusteGeral, aplicarPorTurma: porTurma });
      toast.success("Estudo aprovado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aprovar o estudo.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !aprovar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar o estudo de {estudo.anoAlvo}</DialogTitle>
          <DialogDescription>
            O estudo fica somente leitura. Escolha o que levar para o resto do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox checked={reajusteGeral} onCheckedChange={(v) => setReajusteGeral(v === true)} className="mt-0.5" />
            <span className="grid gap-0.5 text-sm">
              <span className="font-medium">Gravar {formatarPercentual(sugerido)} como reajuste da rematrícula</span>
              <span className="text-[13px] text-muted-foreground">
                Passa a ser o percentual de reajuste que a rematrícula usa nos contratos (Administração, Contratos,
                Configuração). Substitui o que está lá hoje.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox checked={porTurma} onCheckedChange={(v) => setPorTurma(v === true)} className="mt-0.5" />
            <span className="grid gap-0.5 text-sm">
              <span className="font-medium">Aplicar reajuste por turma nos planos</span>
              <span className="text-[13px] text-muted-foreground">
                Grava, no plano de mensalidade de cada aluno, o valor da rematrícula conforme a mensalidade final da
                turma. Valores já negociados com a família são trocados pelos da turma.
              </span>
            </span>
          </label>

          {alteracoesPendentes && (
            <p role="alert" className="text-sm text-destructive">
              Há alterações não salvas. Salve ou descarte antes de aprovar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={aprovar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={aprovar.isPending || alteracoesPendentes} onClick={confirmar}>
            {aprovar.isPending ? "Aprovando..." : "Aprovar estudo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
