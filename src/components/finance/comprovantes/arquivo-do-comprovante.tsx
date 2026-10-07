"use client";

import { useState } from "react";
import { ExternalLink, FileText, ImageOff, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  abrirArquivoDoComprovanteRecebido,
  ehPdf,
  useArquivoDoComprovante,
  type ComprovanteRecebido,
} from "@/lib/finance/use-comprovantes";
import { cn } from "@/lib/utils";

type DadosDoArquivo = Pick<ComprovanteRecebido, "id" | "contentType" | "arquivoNome" | "temArquivo">;

/** Abre o arquivo numa aba nova. A aba abre no clique: depois da espera da rede o navegador a bloquearia. */
export function useAbrirArquivo(c: DadosDoArquivo) {
  const [abrindo, setAbrindo] = useState(false);

  async function abrir() {
    const aba = window.open("", "_blank");
    setAbrindo(true);
    try {
      await abrirArquivoDoComprovanteRecebido(c.id, c.arquivoNome, aba);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
    } finally {
      setAbrindo(false);
    }
  }

  return { abrir, abrindo };
}

/**
 * Miniatura do cartão: a imagem renderizada, ou um ícone de documento para PDF (que não é
 * baixado só para aparecer na lista). Sem arquivo guardado, um ícone de "sem imagem".
 */
export function MiniaturaDoComprovante({ comprovante: c }: { comprovante: DadosDoArquivo }) {
  const pdf = ehPdf(c);
  const { url, carregando, falhou } = useArquivoDoComprovante(c.id, c.temArquivo && !pdf);
  const caixa = "grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground sm:size-28";

  if (!c.temArquivo || falhou) {
    return (
      <div className={caixa} role="img" aria-label="Sem imagem do comprovante">
        <ImageOff className="size-6" />
      </div>
    );
  }

  if (pdf) {
    return (
      <div className={caixa} role="img" aria-label="Comprovante em PDF">
        <div className="grid justify-items-center gap-1">
          <FileText className="size-7" />
          <span className="text-[11px] font-semibold tracking-wide">PDF</span>
        </div>
      </div>
    );
  }

  if (carregando || !url) return <div aria-hidden className={cn(caixa, "animate-pulse")} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- object URL de um blob autenticado, sem otimização possível
    <img src={url} alt={`Comprovante ${c.arquivoNome}`} draggable={false} className={cn(caixa, "object-cover")} />
  );
}

/**
 * O arquivo em tamanho de conferir: imagem com zoom simples (toque ou clique alterna entre
 * caber na tela e ampliar) ou PDF embutido, sempre com o botão de abrir em outra aba — alguns
 * celulares não mostram PDF dentro da página.
 */
export function VisualizadorDoComprovante({
  comprovante: c,
  className,
}: {
  comprovante: DadosDoArquivo;
  className?: string;
}) {
  const pdf = ehPdf(c);
  const { url, carregando, falhou } = useArquivoDoComprovante(c.id, c.temArquivo);
  const { abrir, abrindo } = useAbrirArquivo(c);
  const [ampliado, setAmpliado] = useState(false);

  if (!c.temArquivo || falhou) {
    return (
      <div
        className={cn(
          "grid min-h-48 place-items-center rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        <div className="grid justify-items-center gap-2">
          <ImageOff className="size-7" />
          <p>{falhou ? "Não foi possível carregar o arquivo." : "Este comprovante não tem arquivo guardado."}</p>
        </div>
      </div>
    );
  }

  if (carregando || !url) {
    return <div aria-hidden className={cn("min-h-64 animate-pulse rounded-xl bg-muted", className)} />;
  }

  return (
    <div className={cn("grid content-start gap-2", className)}>
      {pdf ? (
        <iframe
          src={url}
          title={`Comprovante ${c.arquivoNome}`}
          className="h-[min(60dvh,520px)] w-full rounded-xl border border-border bg-card"
        />
      ) : (
        <div
          className={cn(
            "overflow-auto rounded-xl border border-border bg-muted",
            ampliado ? "max-h-[60dvh] cursor-zoom-out" : "cursor-zoom-in"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL de um blob autenticado, sem otimização possível */}
          <img
            src={url}
            alt={`Comprovante ${c.arquivoNome}`}
            draggable={false}
            onClick={() => setAmpliado((v) => !v)}
            className={cn(
              "mx-auto block",
              ampliado ? "max-w-none w-[200%] md:w-[170%]" : "max-h-[60dvh] w-auto max-w-full object-contain"
            )}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!pdf && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAmpliado((v) => !v)}>
            {ampliado ? <ZoomOut /> : <ZoomIn />}
            {ampliado ? "Reduzir" : "Ampliar"}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" disabled={abrindo} onClick={abrir}>
          <ExternalLink />
          Abrir em outra aba
        </Button>
      </div>
    </div>
  );
}
