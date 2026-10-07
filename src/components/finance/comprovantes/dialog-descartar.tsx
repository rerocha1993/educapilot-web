"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDescartarComprovante, type ComprovanteRecebido } from "@/lib/finance/use-comprovantes";

/** Descartar um comprovante: ele sai da lista de "a lançar" e não vira despesa. O motivo é opcional. */
export function DialogDescartar({
  comprovante: c,
  onFechar,
}: {
  comprovante: ComprovanteRecebido;
  onFechar: () => void;
}) {
  const descartar = useDescartarComprovante();
  const [motivo, setMotivo] = useState("");

  async function confirmar() {
    try {
      await descartar.mutateAsync({ id: c.id, motivo });
      toast.success("Comprovante descartado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível descartar o comprovante.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !descartar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar este comprovante?</DialogTitle>
          <DialogDescription>
            Ele deixa de aparecer em &ldquo;A lançar&rdquo; e não vira despesa. O arquivo continua guardado.
          </DialogDescription>
        </DialogHeader>

        <Campo id={`descartar-${c.id}`} rotulo="Motivo (opcional)">
          <Textarea
            id={`descartar-${c.id}`}
            rows={3}
            maxLength={300}
            value={motivo}
            placeholder="Ex.: foto repetida, não é da escola..."
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>

        <DialogFooter>
          <Button variant="outline" disabled={descartar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={descartar.isPending} onClick={confirmar}>
            {descartar.isPending ? "Aguarde..." : "Descartar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
