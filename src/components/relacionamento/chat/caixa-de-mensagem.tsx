"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Image as ImagemIcone, Paperclip, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { problemaDoAnexo } from "@/lib/relacionamento/use-chat-comum";
import { tamanhoLegivel } from "@/lib/relacionamento/use-relacionamento";

const LIMITE_DO_TEXTO = 4000;
const TIPOS_ACEITOS = "image/*,application/pdf";

/**
 * Caixa de texto do chat.
 *
 * No computador, Enter envia e Shift+Enter quebra a linha. No celular (toque), Enter quebra a
 * linha, porque o teclado não tem Shift e o botão de enviar está ao lado. O anexo é uma foto
 * (reduzida no envio) ou um PDF; com `comCamera`, há um botão que abre a câmera direto.
 */
export function CaixaDeMensagem({
  aoEnviar,
  comCamera = false,
  desabilitada = false,
}: {
  aoEnviar: (texto: string, arquivo: File | null) => void;
  /** Botão extra que abre a câmera do celular (portal dos pais). */
  comCamera?: boolean;
  desabilitada?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  const podeEnviar = !desabilitada && (texto.trim() !== "" || arquivo !== null);

  function escolher(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    const erro = problemaDoAnexo(escolhido);
    setProblema(erro);
    setArquivo(erro ? null : escolhido);
  }

  function enviar() {
    if (!podeEnviar) return;
    aoEnviar(texto, arquivo);
    setTexto("");
    setArquivo(null);
    setProblema(null);
    campo.current?.focus();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    // Teclado de toque: Enter é quebra de linha; quem envia é o botão.
    if (window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    enviar();
  }

  const EscolhaDoArquivo = arquivo?.type.startsWith("image/") ? ImagemIcone : FileText;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      className="flex flex-col gap-2 border-t border-border bg-card px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
    >
      {arquivo && (
        <div className="flex min-h-11 items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-[13px]">
          <EscolhaDoArquivo aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium">{arquivo.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{tamanhoLegivel(arquivo.size)}</span>
          <button
            type="button"
            onClick={() => setArquivo(null)}
            aria-label="Remover anexo"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      {problema && (
        <p role="alert" className="text-xs text-destructive">
          {problema}
        </p>
      )}

      <div className="flex items-end gap-1.5">
        {comCamera && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Tirar uma foto"
              disabled={desabilitada}
              onClick={() => camera.current?.click()}
              className="shrink-0 max-md:size-11"
            >
              <Camera aria-hidden />
            </Button>
            <input
              ref={camera}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                escolher(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={comCamera ? "Anexar da galeria ou um PDF" : "Anexar foto ou PDF"}
          disabled={desabilitada}
          onClick={() => galeria.current?.click()}
          className="shrink-0 max-md:size-11"
        >
          <Paperclip aria-hidden />
        </Button>
        <input
          ref={galeria}
          type="file"
          accept={TIPOS_ACEITOS}
          hidden
          onChange={(e) => {
            escolher(e.target.files);
            e.target.value = "";
          }}
        />

        <Textarea
          ref={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          maxLength={LIMITE_DO_TEXTO}
          rows={1}
          disabled={desabilitada}
          aria-label="Escrever mensagem"
          placeholder="Escreva uma mensagem"
          className="max-h-36 min-h-11 flex-1 resize-none py-2.5 md:min-h-10 md:py-2"
        />

        <Button
          type="submit"
          variant="action"
          size="icon"
          aria-label="Enviar mensagem"
          disabled={!podeEnviar}
          className="shrink-0 max-md:size-11"
        >
          <Send aria-hidden />
        </Button>
      </div>
    </form>
  );
}
