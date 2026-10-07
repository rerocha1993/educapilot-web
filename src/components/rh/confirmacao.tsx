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
 * Confirmação de uma ação que não se desfaz ou que mexe em muitos registros (excluir, criar fichas).
 *
 * Fica montada só enquanto a pergunta está aberta: o pai a renderiza condicionalmente, e fechar é
 * desmontar. Os botões ficam desabilitados com a chamada em andamento, para um segundo toque não
 * duplicar o pedido.
 */
export function Confirmacao({
  titulo,
  descricao,
  rotuloConfirmar,
  pendente,
  perigosa = false,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  pendente: boolean;
  /** Excluir: o botão de confirmar sai em vermelho em vez de laranja. */
  perigosa?: boolean;
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
          <Button variant={perigosa ? "destructive" : "action"} disabled={pendente} onClick={onConfirmar}>
            {pendente ? "Aguarde..." : rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
