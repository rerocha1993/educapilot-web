"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useEnviarComprovanteDaTela } from "@/lib/finance/use-comprovantes";
import { ACEITA_ARQUIVO, problemaDoArquivo } from "@/lib/rh/use-rh";
import { cn } from "@/lib/utils";

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/**
 * Enviar um comprovante pela tela, para quem não mandou pelo WhatsApp: arrastar o arquivo para
 * a caixa ou escolher no aparelho (no celular, abre a câmera). JPG, PNG ou PDF até 10 MB, com
 * uma legenda opcional. O sistema lê o arquivo e ele cai na Caixa.
 */
export function DialogEnviarComprovante({ onFechar }: { onFechar: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarComprovanteDaTela();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [legenda, setLegenda] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(novo: File | undefined) {
    if (!novo) return;
    const problema = problemaDoArquivo(novo);
    if (problema) {
      setArquivo(null);
      return setErro(problema);
    }
    setErro(null);
    setArquivo(novo);
  }

  async function confirmar() {
    if (!arquivo) return setErro("Escolha a foto ou o PDF do comprovante.");
    try {
      await enviar.mutateAsync({ arquivo, legenda });
      toast.success("Comprovante enviado. Em instantes o sistema termina de ler.");
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o comprovante.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !enviar.isPending && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar comprovante</DialogTitle>
          <DialogDescription>Foto ou PDF do cupom, nota ou recibo. JPG, PNG ou PDF, até 10 MB.</DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            escolher(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center transition-colors",
            arrastando && "border-primary bg-accent"
          )}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            {arquivo ? <FileText className="size-[18px]" /> : <UploadCloud className="size-[18px]" />}
          </span>

          {arquivo ? (
            <div className="min-w-0">
              <p className="text-sm font-medium break-all">{arquivo.name}</p>
              <p className="text-[13px] text-muted-foreground">{tamanhoLegivel(arquivo.size)}</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Arraste o arquivo para cá ou escolha no aparelho.</p>
          )}

          <input
            ref={entrada}
            type="file"
            accept={ACEITA_ARQUIVO}
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo do comprovante"
            onChange={(e) => {
              const novo = e.target.files?.[0];
              // Limpa para o mesmo arquivo poder ser escolhido de novo depois de um erro.
              e.target.value = "";
              escolher(novo);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={enviar.isPending}
            onClick={() => entrada.current?.click()}
          >
            {arquivo ? "Escolher outro arquivo" : "Escolher arquivo"}
          </Button>
        </div>

        <Campo id="env-legenda" rotulo="Legenda (opcional)" dica="Uma frase que ajude a lembrar do que é, como no WhatsApp.">
          <Input
            id="env-legenda"
            value={legenda}
            maxLength={200}
            placeholder="Ex.: material de limpeza"
            onChange={(e) => setLegenda(e.target.value)}
          />
        </Campo>

        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={enviar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={enviar.isPending || !arquivo} onClick={confirmar}>
            {enviar.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
