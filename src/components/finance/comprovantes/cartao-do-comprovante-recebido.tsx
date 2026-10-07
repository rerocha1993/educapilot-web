"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, FolderKanban, Link2, MessageCircle, RefreshCw, TriangleAlert, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

import { MiniaturaDoComprovante, useAbrirArquivo } from "@/components/finance/comprovantes/arquivo-do-comprovante";
import { DialogDescartar } from "@/components/finance/comprovantes/dialog-descartar";
import { DialogLancarDespesa } from "@/components/finance/comprovantes/dialog-lancar-despesa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  confiancaBaixa,
  ehPdf,
  estaALancar,
  ROTULO_DA_ORIGEM,
  useRelerComprovanteRecebido,
  type ComprovanteRecebido,
} from "@/lib/finance/use-comprovantes";
import { formatarDataHora, formatarSoData } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

/**
 * Um campo lido: quando a certeza é baixa (< 0,6), ganha fundo amarelo e a dica "confira este
 * valor" — a leitura é sugestão, e é aqui que a pessoa vê onde olhar duas vezes.
 */
function CampoLido({ baixa, rotulo, children }: { baixa: boolean; rotulo: string; children: ReactNode }) {
  return (
    <div
      title={baixa ? "Confira este valor" : undefined}
      className={cn(
        "min-w-0 rounded-md",
        baixa && "border border-warning-border bg-warning-soft px-2 py-1 text-warning-soft-foreground"
      )}
    >
      <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
        {rotulo}
        {baixa && (
          <span className="inline-flex items-center gap-1 font-semibold text-warning-soft-foreground">
            <TriangleAlert className="size-3" aria-hidden />
            confira
          </span>
        )}
      </p>
      {children}
    </div>
  );
}

/** Como o sistema leu o arquivo: o chip diz de onde veio a leitura, ou que não deu para ler. */
function EtiquetaDaLeitura({ c }: { c: ComprovanteRecebido }) {
  if (c.status === "Recebido") return <Badge variant="waiting">Lendo...</Badge>;
  if (c.status === "SemLeitura") return <Badge variant="overdue">Não deu para ler</Badge>;
  if (c.metodoDaLeitura === "pdf-texto") return <Badge variant="success">Lido pelo PDF</Badge>;
  if (c.metodoDaLeitura === "ocr") return <Badge variant="success">Lido por OCR</Badge>;
  if (c.metodoDaLeitura === "anthropic") return <Badge variant="success">Lido por IA</Badge>;
  return null;
}

function EtiquetaDoDestino({ c }: { c: ComprovanteRecebido }) {
  if (c.status === "Lancado") return <Badge variant="success">Lançado</Badge>;
  if (c.status === "Descartado") return <Badge variant="secondary">Descartado</Badge>;
  return null;
}

/**
 * Um comprovante da Caixa: miniatura, o que foi lido (valor grande, data, fornecedor), quem
 * mandou e quando, e as ações. Lançado ou descartado fica só para ler.
 */
export function CartaoDoComprovanteRecebido({ comprovante: c }: { comprovante: ComprovanteRecebido }) {
  const reler = useRelerComprovanteRecebido();
  const { abrir, abrindo } = useAbrirArquivo(c);
  const [lancando, setLancando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  const aberto = estaALancar(c);
  const lendo = c.status === "Recebido";
  const pdf = ehPdf(c);

  async function relerComprovante() {
    try {
      await reler.mutateAsync(c.id);
      toast.success("Comprovante lido de novo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reler o comprovante.");
    }
  }

  const quem = c.origem === "WhatsApp" ? (c.remetenteNome ?? "WhatsApp") : (c.remetenteNome ?? ROTULO_DA_ORIGEM.Tela);

  return (
    <article
      className={cn(
        "grid gap-3.5 rounded-xl border border-border bg-card p-3.5 md:p-4",
        c.status === "Descartado" && "opacity-70"
      )}
    >
      <div className="flex gap-3.5">
        <div className="grid shrink-0 content-start gap-1.5">
          <MiniaturaDoComprovante comprovante={c} />
          {c.temArquivo && (
            <button
              type="button"
              onClick={abrir}
              disabled={abrindo}
              className="inline-flex min-h-8 items-center justify-center gap-1 text-[12.5px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {pdf ? "Abrir PDF" : "Abrir"}
            </button>
          )}
        </div>

        <div className="grid min-w-0 flex-1 content-start gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <EtiquetaDaLeitura c={c} />
            <EtiquetaDoDestino c={c} />
            {c.origem === "WhatsApp" && (
              <Badge variant="outline">
                <MessageCircle />
                WhatsApp
              </Badge>
            )}
          </div>

          <CampoLido baixa={confiancaBaixa(c.confianca?.valor)} rotulo="Valor">
            <p
              className={cn(
                "font-heading font-mono text-[clamp(22px,5vw,28px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums",
                c.valorLido == null && "text-[15px] font-medium tracking-normal text-muted-foreground"
              )}
            >
              {c.valorLido == null ? "Valor não lido" : formatarMoeda(c.valorLido)}
            </p>
          </CampoLido>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <CampoLido baixa={confiancaBaixa(c.confianca?.data)} rotulo="Data">
              <p className="font-mono text-sm tabular-nums">{c.dataLida ? formatarSoData(c.dataLida) : "Não lida"}</p>
            </CampoLido>
            <CampoLido baixa={confiancaBaixa(c.confianca?.fornecedor)} rotulo="Fornecedor">
              <p className="text-sm break-words">{c.fornecedorLido || "Não lido"}</p>
            </CampoLido>
          </div>
        </div>
      </div>

      {c.legenda && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm break-words">
          <span className="text-[12px] text-muted-foreground">Legenda: </span>
          {c.legenda}
        </p>
      )}

      {lendo && (
        <p role="status" className="text-sm text-muted-foreground">
          Lendo o comprovante. Isso leva alguns segundos; a tela atualiza sozinha.
        </p>
      )}

      {c.status === "SemLeitura" && c.erroDaLeitura && (
        <p className="text-[13px] text-muted-foreground">{c.erroDaLeitura}</p>
      )}

      {aberto && !lendo && (c.projetoSugeridoNome || c.categoriaSugeridaNome || c.contaSugeridaNome) && (
        <p className="text-[13px] text-muted-foreground">
          Sugestão:{" "}
          {[c.categoriaSugeridaNome, c.contaSugeridaNome, c.projetoSugeridoNome && `projeto ${c.projetoSugeridoNome}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {c.status === "Lancado" && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success-soft-foreground">
          Lançado como despesa paga{c.lancadoEm ? ` em ${formatarDataHora(c.lancadoEm)}` : ""}.{" "}
          <Link href="/finance/despesas" className="font-semibold underline">
            Ver em Despesas
          </Link>
        </p>
      )}

      {c.status === "Descartado" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          Descartado{c.descartadoEm ? ` em ${formatarDataHora(c.descartadoEm)}` : ""}
          {c.motivoDoDescarte ? `: ${c.motivoDoDescarte}` : "."}
        </p>
      )}

      <p className="text-[12.5px] text-muted-foreground">
        Enviado por <span className="font-medium text-foreground">{quem}</span> em {formatarDataHora(c.recebidoEm)}
      </p>

      {aberto && (
        <div className="grid gap-2 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="action"
              disabled={lendo}
              className="col-span-2 sm:col-span-1"
              onClick={() => setLancando(true)}
            >
              <Receipt />
              Lançar despesa
            </Button>
            {/* Projeto e Conciliar chegam na fase W2: ficam à vista, desligados. */}
            <Button variant="outline" disabled title="Em breve">
              <FolderKanban />
              Projeto
              <span className="text-[11px] text-muted-foreground">em breve</span>
            </Button>
            <Button variant="outline" disabled title="Em breve">
              <Link2 />
              Conciliar
              <span className="text-[11px] text-muted-foreground">em breve</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={reler.isPending || lendo} onClick={relerComprovante}>
              <RefreshCw className={cn(reler.isPending && "animate-spin")} />
              {reler.isPending ? "Relendo..." : "Reler"}
            </Button>
            <Button variant="destructive" size="sm" className="ml-auto" onClick={() => setDescartando(true)}>
              <Trash2 />
              Descartar
            </Button>
          </div>
        </div>
      )}

      {lancando && <DialogLancarDespesa comprovante={c} onFechar={() => setLancando(false)} />}
      {descartando && <DialogDescartar comprovante={c} onFechar={() => setDescartando(false)} />}
    </article>
  );
}
