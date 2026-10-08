"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  FolderKanban,
  Link2,
  MessageCircle,
  Receipt,
  RefreshCw,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { MiniaturaDoComprovante, useAbrirArquivo } from "@/components/finance/comprovantes/arquivo-do-comprovante";
import { DialogConciliarComprovante } from "@/components/finance/comprovantes/dialog-conciliar-comprovante";
import { DialogDescartar } from "@/components/finance/comprovantes/dialog-descartar";
import { DialogLancarDespesa } from "@/components/finance/comprovantes/dialog-lancar-despesa";
import { DialogLancarNoProjeto } from "@/components/finance/comprovantes/dialog-lancar-no-projeto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  confiancaBaixa,
  destinoDe,
  ehPdf,
  estaALancar,
  ROTULO_DA_ORIGEM,
  useRelerComprovanteRecebido,
  type ComprovanteRecebido,
  type DestinoDoComprovante,
} from "@/lib/finance/use-comprovantes";
import { formatarData, formatarDataHora, formatarSoData } from "@/lib/format/date";
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

const DESTINOS: Record<DestinoDoComprovante, { rotulo: string; botao: string; icone: LucideIcon }> = {
  Despesas: { rotulo: "Despesa", botao: "Lançar despesa", icone: Receipt },
  Projeto: { rotulo: "Projeto", botao: "Lançar no projeto", icone: FolderKanban },
  Conciliar: { rotulo: "Conciliar", botao: "Conciliar", icone: Link2 },
};

const ORDEM_DOS_DESTINOS: DestinoDoComprovante[] = ["Despesas", "Projeto", "Conciliar"];

/** "Despesa em Material pedagógico, conta Nubank": o que o sistema sugere para cada destino, em palavras. */
function sugestaoEmPalavras(c: ComprovanteRecebido, destino: DestinoDoComprovante): string {
  if (destino === "Projeto") return c.projetoSugeridoNome ? `Projeto ${c.projetoSugeridoNome}` : "Projeto";
  if (destino === "Conciliar") return "Conciliar";
  const partes = [c.categoriaSugeridaNome && `em ${c.categoriaSugeridaNome}`, c.contaSugeridaNome && `conta ${c.contaSugeridaNome}`];
  return ["Despesa", partes.filter(Boolean).join(", ")].filter(Boolean).join(" ");
}

/**
 * A sugestão do sistema como selo + frase: para onde o comprovante deve ir e por quê. É só uma
 * sugestão; o botão principal a segue e os outros destinos ficam em "Outro destino".
 */
function SugestaoDeDestino({ c }: { c: ComprovanteRecebido }) {
  const temSugestao = !!c.destinoSugerido || !!c.motivoDaSugestao || !!(c.projetoSugeridoNome || c.categoriaSugeridaNome || c.contaSugeridaNome);
  if (!temSugestao) return null;

  const destino = destinoDe(c);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">
      <Badge variant="waiting" className="self-center">
        Sugestão
      </Badge>
      <span className="min-w-0 break-words">
        <span className="font-medium text-foreground">{sugestaoEmPalavras(c, destino)}</span>
        {c.motivoDaSugestao && <> · {c.motivoDaSugestao}</>}
      </span>
    </p>
  );
}

/** Onde o comprovante foi parar, com o link para a tela certa (projeto, conciliação ou despesas). */
function OndeFoiLancado({ c }: { c: ComprovanteRecebido }) {
  const quando = c.lancadoEm ? ` em ${formatarData(c.lancadoEm)}` : "";
  const classe = "rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success-soft-foreground";
  const link = "font-semibold underline";

  if (c.comprovanteDoProjetoId) {
    const href = c.projetoSugeridoId ? `/finance/projetos/${c.projetoSugeridoId}` : "/finance/projetos";
    return (
      <p className={classe}>
        Lançado no projeto{c.projetoSugeridoNome ? ` ${c.projetoSugeridoNome}` : ""}
        {quando}.{" "}
        <Link href={href} className={link}>
          Ver o projeto
        </Link>
      </p>
    );
  }

  if (c.movimentoBancarioId) {
    return (
      <p className={classe}>
        Conciliado com o extrato{quando}.{" "}
        <Link href="/finance/conciliacao" className={link}>
          Ver na Conciliação
        </Link>
      </p>
    );
  }

  return (
    <p className={classe}>
      Lançado como despesa{quando}.{" "}
      <Link href="/finance/despesas" className={link}>
        Ver em Despesas
      </Link>
    </p>
  );
}

/**
 * Um comprovante da Caixa: miniatura, o que foi lido (valor grande, data, fornecedor), quem
 * mandou e quando, e as ações. Lançado ou descartado fica só para ler.
 */
export function CartaoDoComprovanteRecebido({ comprovante: c }: { comprovante: ComprovanteRecebido }) {
  const reler = useRelerComprovanteRecebido();
  const { abrir, abrindo } = useAbrirArquivo(c);
  const [dialogo, setDialogo] = useState<DestinoDoComprovante | null>(null);
  const [descartando, setDescartando] = useState(false);

  const aberto = estaALancar(c);
  const lendo = c.status === "Recebido";
  const pdf = ehPdf(c);
  const destino = destinoDe(c);
  const Principal = DESTINOS[destino];
  const outros = ORDEM_DOS_DESTINOS.filter((d) => d !== destino);

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

      {aberto && !lendo && <SugestaoDeDestino c={c} />}

      {c.status === "Lancado" && <OndeFoiLancado c={c} />}

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
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button variant="action" disabled={lendo} onClick={() => setDialogo(destino)}>
              <Principal.icone />
              {Principal.botao}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" disabled={lendo} />}>
                Outro destino
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto min-w-48">
                {outros.map((d) => {
                  const Icone = DESTINOS[d].icone;
                  return (
                    <DropdownMenuItem key={d} onClick={() => setDialogo(d)}>
                      <Icone />
                      {DESTINOS[d].botao}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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

      {dialogo === "Despesas" && <DialogLancarDespesa comprovante={c} onFechar={() => setDialogo(null)} />}
      {dialogo === "Projeto" && <DialogLancarNoProjeto comprovante={c} onFechar={() => setDialogo(null)} />}
      {dialogo === "Conciliar" && <DialogConciliarComprovante comprovante={c} onFechar={() => setDialogo(null)} />}
      {descartando && <DialogDescartar comprovante={c} onFechar={() => setDescartando(false)} />}
    </article>
  );
}
