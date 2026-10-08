"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Copy, ExternalLink, FileText, QrCode } from "lucide-react";

import { DialogQrDoPix, copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import { buttonVariants } from "@/components/ui/button";
import { formatarSoData } from "@/lib/format/date";
import { rotuloDaForma } from "@/lib/finance/use-recibos";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  ROTULO_DO_TIPO_DE_PAGAMENTO,
  type ItemDePagamento,
  type TipoDePagamento,
} from "@/lib/relacionamento/use-portal-pagamentos";
import { cn } from "@/lib/utils";

const ESTILO_DO_TIPO: Record<TipoDePagamento, string> = {
  Mensalidade: "bg-accent text-accent-foreground",
  Projeto: "bg-action-soft text-action-soft-foreground",
  Cobranca: "bg-muted text-muted-foreground",
  Loja: "bg-success-soft text-success-soft-foreground",
};

/** Chip do tipo. O nome vai escrito: a cor sozinha não distingue um tipo do outro. */
export function ChipDoTipoDePagamento({ tipo, className }: { tipo: TipoDePagamento; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        ESTILO_DO_TIPO[tipo],
        className
      )}
    >
      {ROTULO_DO_TIPO_DE_PAGAMENTO[tipo]}
    </span>
  );
}

/** A frase do vencimento: vencida em vermelho, e o texto diz "venceu", não só a cor. */
export function VencimentoDoPagamento({ item }: { item: ItemDePagamento }) {
  if (item.status === "Paga") {
    return (
      <span className="text-[13px] text-muted-foreground">
        Pago em <span className="tabular-nums">{formatarSoData(item.pagoEm)}</span>
        {item.formaDePagamento && ` · ${rotuloDaForma(item.formaDePagamento ?? undefined)}`}
      </span>
    );
  }
  const vencida = item.status === "Vencida";
  return (
    <span className={cn("text-[13px] tabular-nums", vencida ? "font-semibold text-destructive" : "text-muted-foreground")}>
      {vencida ? "Venceu em " : "Vence em "}
      {formatarSoData(item.vencimento)}
    </span>
  );
}

/**
 * Como pagar: link, Pix copia e cola, QR e boleto. Cobrança manual (sem nada disso) diz que o
 * pagamento é na secretaria, para a família não achar que o botão sumiu.
 */
export function AcoesDoPagamento({ item, className }: { item: ItemDePagamento; className?: string }) {
  const [qrAberto, setQrAberto] = useState(false);
  if (item.status === "Paga") return null;

  const temComoPagar = !!(item.linkDePagamento || item.pixCopiaECola || item.pixQrCodeBase64 || item.boletoUrl);
  if (!temComoPagar) {
    return <p className={cn("text-[13px] font-medium text-muted-foreground", className)}>Pague na secretaria.</p>;
  }

  const pix = item.pixCopiaECola;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {item.linkDePagamento && (
        <a
          href={item.linkDePagamento}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "action" }), "min-h-11 px-4 max-md:h-11")}
        >
          <ExternalLink aria-hidden />
          Pagar
          <span className="sr-only"> (abre em uma nova aba)</span>
        </a>
      )}
      {pix && (
        <button
          type="button"
          onClick={() => copiarTexto(pix, "Pix copia e cola copiado.")}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-3.5 max-md:h-11")}
        >
          <Copy aria-hidden />
          Copiar Pix
        </button>
      )}
      {item.pixQrCodeBase64 && (
        <button
          type="button"
          onClick={() => setQrAberto(true)}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-3.5 max-md:h-11")}
        >
          <QrCode aria-hidden />
          Ver QR
        </button>
      )}
      {item.boletoUrl && (
        <a
          href={item.boletoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-3.5 max-md:h-11")}
        >
          <FileText aria-hidden />
          Boleto
          <span className="sr-only"> (abre em uma nova aba)</span>
        </a>
      )}

      {qrAberto && (
        <DialogQrDoPix
          titulo="Pagar com Pix"
          descricao={`${item.descricao} · ${formatarMoeda(item.valor)}. Aponte a câmera do banco para o QR.`}
          qrCodeBase64={item.pixQrCodeBase64}
          pixCopiaECola={item.pixCopiaECola}
          rotuloDaImagem={`QR code do Pix de ${item.descricao}`}
          onFechar={() => setQrAberto(false)}
        />
      )}
    </div>
  );
}

/**
 * Um pagamento da família. Com `href`, o título abre o detalhe; sem, é só leitura (a escola usa na
 * aba "Por família", que mostra o que a família vê).
 */
export function CartaoDePagamento({ item, href }: { item: ItemDePagamento; href?: string }) {
  const titulo = <span className="text-[15px] leading-snug font-semibold break-words">{item.descricao}</span>;

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-card p-3",
        item.status === "Vencida" ? "border-destructive-border" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ChipDoTipoDePagamento tipo={item.tipo} />
          <p className="mt-1">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-0.5 rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {titulo}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              titulo
            )}
          </p>
          {item.alunoNome && <p className="text-[13px] text-muted-foreground">{item.alunoNome}</p>}
          <p className="mt-0.5">
            <VencimentoDoPagamento item={item} />
          </p>
        </div>
        <p className="shrink-0 font-mono text-[16px] font-semibold tabular-nums">{formatarMoeda(item.valor)}</p>
      </div>

      <AcoesDoPagamento item={item} />
    </article>
  );
}
