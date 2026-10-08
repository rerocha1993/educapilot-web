"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  useCancelarRecibo,
  useEnviarReciboPorEmail,
  useRecibo,
  type ReciboResumo,
} from "@/lib/finance/use-recibos";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resumoDoRecibo(r: ReciboResumo) {
  return `Recibo ${r.numeroFormatado}, ${formatarMoeda(r.valor)}, ${r.nomeDoPagador}.`;
}

/**
 * Enviar o recibo por e-mail.
 *
 * O e-mail do responsável vem do detalhe do recibo (a lista não o traz); o campo abre preenchido e
 * pode ser trocado. O corpo do formulário só monta quando o detalhe chega, para o campo nascer já
 * com o valor em vez de depender de um efeito.
 */
export function DialogEnviarRecibo({ recibo, onFechar }: { recibo: ReciboResumo; onFechar: () => void }) {
  const detalhe = useRecibo(recibo.id);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar recibo por e-mail</DialogTitle>
          <DialogDescription>{resumoDoRecibo(recibo)}</DialogDescription>
        </DialogHeader>

        {detalhe.isLoading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : detalhe.isError ? (
          <ErroDeCarga texto="Não foi possível carregar o e-mail do responsável." onTentar={() => detalhe.refetch()} />
        ) : (
          <FormularioDeEnvio recibo={recibo} emailInicial={detalhe.data?.emailDestino ?? ""} onFechar={onFechar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDeEnvio({
  recibo,
  emailInicial,
  onFechar,
}: {
  recibo: ReciboResumo;
  emailInicial: string;
  onFechar: () => void;
}) {
  const enviar = useEnviarReciboPorEmail();
  const [email, setEmail] = useState(emailInicial);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    const destino = email.trim();
    if (!EMAIL_VALIDO.test(destino)) return setErro("Informe um e-mail válido.");

    try {
      await enviar.mutateAsync({ id: recibo.id, email: destino });
      toast.success(`Recibo ${recibo.numeroFormatado} enviado para ${destino}.`);
      onFechar();
    } catch (err) {
      // 409 quando a escola não tem e-mail configurado: a mensagem do servidor explica.
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o recibo por e-mail.");
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4">
      <Campo
        id="recibo-email"
        rotulo="Enviar para"
        dica={emailInicial ? "E-mail cadastrado do responsável. Pode ser trocado." : "O responsável não tem e-mail cadastrado."}
      >
        <Input
          id="recibo-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErro(null);
          }}
          aria-invalid={erro !== null}
        />
      </Campo>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={enviar.isPending} onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" variant="action" disabled={enviar.isPending}>
          {enviar.isPending ? "Enviando..." : "Enviar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Cancelar o recibo. O motivo é obrigatório e fica gravado: o recibo cancelado não some, perde a validade. */
export function DialogCancelarRecibo({ recibo, onFechar }: { recibo: ReciboResumo; onFechar: () => void }) {
  const cancelar = useCancelarRecibo();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function aoCancelar(e: React.FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (!texto) return setErro("Informe o motivo do cancelamento.");

    try {
      await cancelar.mutateAsync({ id: recibo.id, motivo: texto });
      toast.success(`Recibo ${recibo.numeroFormatado} cancelado.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar o recibo.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !cancelar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar recibo {recibo.numeroFormatado}?</DialogTitle>
          <DialogDescription>
            {resumoDoRecibo(recibo)} O número não é reaproveitado e o recibo continua na lista como cancelado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={aoCancelar} noValidate className="grid gap-4">
          <Campo id="recibo-motivo" rotulo="Motivo do cancelamento">
            <Textarea
              id="recibo-motivo"
              rows={3}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErro(null);
              }}
              aria-invalid={erro !== null}
              placeholder="Ex.: valor digitado errado, emitido em duplicidade"
            />
          </Campo>
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={cancelar.isPending} onClick={onFechar}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={cancelar.isPending}>
              {cancelar.isPending ? "Cancelando..." : "Cancelar recibo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
