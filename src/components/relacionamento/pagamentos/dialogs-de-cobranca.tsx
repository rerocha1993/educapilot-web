"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { FORMAS_DE_PAGAMENTO, ROTULO_DA_FORMA, type FormaDePagamento } from "@/lib/finance/use-recibos";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useCancelarCobrancaDaEscola,
  useMarcarCobrancaPaga,
  type Cobranca,
} from "@/lib/relacionamento/use-pagamentos";

/** Baixa manual: a família pagou fora do link (dinheiro, transferência, na secretaria). */
export function DialogMarcarPaga({ cobranca: x, onFechar }: { cobranca: Cobranca; onFechar: () => void }) {
  const marcar = useMarcarCobrancaPaga();
  const [data, setData] = useState(hojeIsoBrasilia());
  const [forma, setForma] = useState<FormaDePagamento>("Pix");

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return void toast.error("Informe a data do pagamento.");
    try {
      await marcar.mutateAsync({ id: x.id, data, formaDePagamento: forma });
      toast.success("Cobrança marcada como paga.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar a cobrança como paga.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !marcar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como paga</DialogTitle>
          <DialogDescription>
            {x.nomeDoResponsavel} · {formatarMoeda(x.valor)}. Use quando a família pagou fora do link, em dinheiro por
            exemplo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <Campo id="paga-data" rotulo="Data do pagamento">
            <Input id="paga-data" type="date" value={data} max={hojeIsoBrasilia()} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo id="paga-forma" rotulo="Forma de pagamento">
            <Select value={forma} onValueChange={(v) => v && setForma(v as FormaDePagamento)}>
              <SelectTrigger id="paga-forma" className="w-full">
                <SelectValue>{() => ROTULO_DA_FORMA[forma]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {FORMAS_DE_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>
                    {ROTULO_DA_FORMA[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={marcar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={marcar.isPending}>
              {marcar.isPending ? "Salvando..." : "Marcar como paga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelarCobranca({ cobranca: x, onFechar }: { cobranca: Cobranca; onFechar: () => void }) {
  const cancelar = useCancelarCobrancaDaEscola();

  async function confirmar() {
    try {
      await cancelar.mutateAsync(x.id);
      toast.success("Cobrança cancelada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar a cobrança.");
    }
  }

  return (
    <Confirmacao
      titulo="Cancelar esta cobrança?"
      descricao={`A cobrança de ${formatarMoeda(x.valor)} para ${x.nomeDoResponsavel} deixa de valer e o link não aceita mais pagamento.`}
      rotuloConfirmar="Cancelar cobrança"
      perigosa
      pendente={cancelar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}
