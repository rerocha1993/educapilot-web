"use client";

import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FolderOpen, HandCoins, Link2, QrCode, X, Zap } from "lucide-react";

import { DialogQrDoPix, copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import { CancelarCobranca, DialogMarcarPaga } from "@/components/relacionamento/pagamentos/dialogs-de-cobranca";
import { BotaoDeIcone } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarSoData } from "@/lib/format/date";
import { estaEmAberto } from "@/lib/relacionamento/pagamentos-util";
import { formatarMoeda } from "@/lib/rh/formatar";
import { ROTULO_DA_FONTE, type Cobranca } from "@/lib/relacionamento/use-pagamentos";

export type DialogoDeCobranca =
  | { tipo: "qr"; cobranca: Cobranca }
  | { tipo: "paga"; cobranca: Cobranca }
  | { tipo: "cancelar"; cobranca: Cobranca };

/** Onde se abre o projeto de uma cobrança de projeto. A tela de detalhe existe em /finance/projetos/[id]. */
export function rotaDoProjeto(projetoId: string | null): string {
  return projetoId ? `/finance/projetos/${projetoId}` : "/finance/projetos";
}

/** De onde veio a cobrança: Escola, Loja, Projeto, Mensalidade ou Outro plano. */
export function EtiquetaDaFonte({ cobranca: x }: { cobranca: Cobranca }) {
  return <Badge variant={x.fonte === "mensalidade" ? "default" : "outline"}>{ROTULO_DA_FONTE[x.fonte]}</Badge>;
}

/** Linha de apoio da fonte: o nome do plano, do projeto ou o aluno, conforme o que a cobrança tem. */
export function DetalheDaFonte({ cobranca: x }: { cobranca: Cobranca }) {
  const texto = x.fonte === "projeto" ? x.projetoNome : x.fonte === "plano" ? x.plano : null;
  if (!texto) return null;
  return <span className="block text-xs break-words text-muted-foreground">{texto}</span>;
}

/** A conta em que a cobrança cai, com o ícone de como ela recebe. Cobrança antiga não tem carteira. */
export function CarteiraDaCobranca({ cobranca: x }: { cobranca: Cobranca }) {
  if (!x.contaNome) {
    return <span className="text-xs text-muted-foreground">Sem carteira</span>;
  }
  const Icone = x.origem === "Asaas" ? Zap : HandCoins;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-foreground">
      <Icone aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words">{x.contaNome}</span>
    </span>
  );
}

/**
 * Ações de uma cobrança. No desktop são ícones; no cartão do celular, botões com texto.
 *
 * Cobrança de projeto é só de leitura aqui: dá para copiar o link e o Pix e abrir o boleto, mas
 * baixa e cancelamento são feitos no próprio projeto ("Abrir projeto"). Com `enxuta`, só o que
 * a cobrança em atraso precisa: link, Pix, boleto e marcar como paga.
 */
export function AcoesDaCobranca({
  cobranca: x,
  onDialogo,
  comTexto = false,
  enxuta = false,
}: {
  cobranca: Cobranca;
  onDialogo: (d: DialogoDeCobranca) => void;
  comTexto?: boolean;
  enxuta?: boolean;
}) {
  const router = useRouter();
  const emAberto = estaEmAberto(x.status);
  const doProjeto = x.fonte === "projeto";
  const botoes: { chave: string; rotulo: string; icone: React.ReactNode; perigo?: boolean; fazer: () => void }[] = [];

  if (emAberto && x.asaasInvoiceUrl) {
    const url = x.asaasInvoiceUrl;
    botoes.push({ chave: "link", rotulo: "Copiar link", icone: <Link2 />, fazer: () => copiarTexto(url, "Link copiado.") });
  }
  if (emAberto && x.pixCopiaECola) {
    const pix = x.pixCopiaECola;
    botoes.push({ chave: "pix", rotulo: "Copiar Pix", icone: <Copy />, fazer: () => copiarTexto(pix, "Pix copia e cola copiado.") });
  }
  if (emAberto && x.pixQrCodeBase64 && !doProjeto && !enxuta) {
    botoes.push({ chave: "qr", rotulo: "Ver QR", icone: <QrCode />, fazer: () => onDialogo({ tipo: "qr", cobranca: x }) });
  }
  if (emAberto && x.boletoUrl) {
    const url = x.boletoUrl;
    botoes.push({
      chave: "boleto",
      rotulo: "Abrir boleto",
      icone: <ExternalLink />,
      fazer: () => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }
  if (doProjeto) {
    const rota = rotaDoProjeto(x.projetoId);
    botoes.push({ chave: "projeto", rotulo: "Abrir projeto", icone: <FolderOpen />, fazer: () => router.push(rota) });
  } else if (emAberto) {
    botoes.push({ chave: "paga", rotulo: "Marcar paga", icone: <Check />, fazer: () => onDialogo({ tipo: "paga", cobranca: x }) });
    if (!enxuta) {
      botoes.push({
        chave: "cancelar",
        rotulo: "Cancelar",
        icone: <X />,
        perigo: true,
        fazer: () => onDialogo({ tipo: "cancelar", cobranca: x }),
      });
    }
  }

  if (botoes.length === 0) return comTexto ? <span className="text-xs text-muted-foreground">Sem ações</span> : null;

  return (
    <>
      {botoes.map((b) =>
        comTexto ? (
          <Button key={b.chave} variant={b.perigo ? "destructive" : "outline"} size="sm" onClick={b.fazer}>
            {b.icone}
            {b.rotulo}
          </Button>
        ) : (
          <BotaoDeIcone key={b.chave} rotulo={b.rotulo} icone={b.icone} perigo={b.perigo} onClick={b.fazer} />
        )
      )}
    </>
  );
}

/** Os diálogos das ações acima: QR do Pix, baixa manual e cancelamento. */
export function DialogosDaCobranca({ dialogo, onFechar }: { dialogo: DialogoDeCobranca | null; onFechar: () => void }) {
  if (!dialogo) return null;
  if (dialogo.tipo === "qr") {
    const x = dialogo.cobranca;
    return (
      <DialogQrDoPix
        titulo={`Pix de ${x.nomeDoResponsavel}`}
        descricao={`${formatarMoeda(x.valor)} · vence em ${formatarSoData(x.vencimento)}. Aponte a câmera do banco para o QR.`}
        qrCodeBase64={x.pixQrCodeBase64}
        pixCopiaECola={x.pixCopiaECola}
        rotuloDaImagem={`QR code do Pix de ${x.nomeDoResponsavel}`}
        onFechar={onFechar}
      />
    );
  }
  if (dialogo.tipo === "paga") return <DialogMarcarPaga cobranca={dialogo.cobranca} onFechar={onFechar} />;
  return <CancelarCobranca cobranca={dialogo.cobranca} onFechar={onFechar} />;
}
