"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirmação de uma ação que mexe em muitos registros de uma vez (importar, copiar).
 *
 * Fica montada só enquanto a pergunta está aberta: o pai a renderiza condicionalmente, e fechar é
 * desmontar. O botão de confirmar fica desabilitado enquanto a chamada está em andamento, para a
 * segunda toque não duplicar o pedido.
 */
export function Confirmacao({
  titulo,
  descricao,
  rotuloConfirmar,
  pendente,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  pendente: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pendente} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={pendente} onClick={onConfirmar}>
            {pendente ? "Aguarde..." : rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
