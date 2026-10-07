"use client";

import Image from "next/image";
import { Copy } from "lucide-react";
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

/** Copia para a área de transferência e avisa; sem permissão do navegador, orienta o caminho manual. */
export async function copiarTexto(texto: string, mensagem: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(mensagem);
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente pelo link da cobrança.");
  }
}

/** A imagem do QR pode vir só com o base64 ou já como data URL. */
function origemDoQr(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

/**
 * QR do Pix numa janela, com o "copia e cola" embaixo. Serve à tela da escola e ao portal dos pais:
 * quem chama diz o título e a frase de apoio (valor e vencimento).
 */
export function DialogQrDoPix({
  titulo,
  descricao,
  qrCodeBase64,
  pixCopiaECola,
  rotuloDaImagem,
  onFechar,
}: {
  titulo: string;
  descricao: string;
  qrCodeBase64: string | null;
  pixCopiaECola: string | null;
  rotuloDaImagem: string;
  onFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-3">
          {qrCodeBase64 && (
            <Image
              src={origemDoQr(qrCodeBase64)}
              alt={rotuloDaImagem}
              width={240}
              height={240}
              unoptimized
              className="size-60 rounded-lg border border-border bg-white p-2"
            />
          )}
          {pixCopiaECola && (
            <Button variant="outline" onClick={() => copiarTexto(pixCopiaECola, "Pix copia e cola copiado.")}>
              <Copy />
              Copiar Pix
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
