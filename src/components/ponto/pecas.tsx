"use client";

import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX, Hourglass, Info, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dataPorExtenso } from "@/lib/rh/ponto-formatar";
import {
  motivosEmPalavras,
  rotuloDaSituacao,
  rotuloDoTipo,
  type ComprovanteDoPonto,
  type SituacaoDaBatida,
} from "@/lib/rh/use-meu-ponto";
import { cn } from "@/lib/utils";

import { Folha } from "./folha";

/** Botão de 56 px, largura toda: o alvo certo para o polegar de quem está em pé. */
export function BotaoGrande({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-14 w-full gap-2 rounded-xl text-base max-md:h-14", className)} />;
}

/** Caixa de aviso dentro das folhas: informação, atenção (âmbar) ou erro. */
export function Aviso({
  tom = "info",
  children,
  className,
}: {
  tom?: "info" | "atencao" | "erro";
  children: ReactNode;
  className?: string;
}) {
  const Icone = tom === "erro" ? CircleX : tom === "atencao" ? CircleAlert : Info;
  return (
    <div
      role={tom === "erro" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-[1.5]",
        tom === "erro" && "bg-destructive-soft text-destructive-soft-foreground",
        tom === "atencao" && "bg-warning-soft text-warning-soft-foreground",
        tom === "info" && "bg-accent text-accent-foreground",
        className
      )}
    >
      <Icone aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Etiqueta da situação: pendente em âmbar, recusada em vermelho, o resto em verde ou neutro. */
export function EtiquetaDaSituacao({ situacao, className }: { situacao: SituacaoDaBatida | string; className?: string }) {
  const variante =
    situacao === "Pendente"
      ? "pending"
      : situacao === "Recusada"
        ? "overdue"
        : situacao === "Aprovada" || situacao === "Normal"
          ? "success"
          : "waiting";

  return (
    <Badge variant={variante} className={cn("h-7 px-2.5 text-[12.5px]", className)}>
      {situacao === "Pendente" ? (
        <Hourglass aria-hidden />
      ) : situacao === "Recusada" ? (
        <CircleX aria-hidden />
      ) : (
        <CircleCheck aria-hidden />
      )}
      {rotuloDaSituacao(situacao)}
    </Badge>
  );
}

/** Selo "QR": a batida foi provada pelo QR da recepção, não só pelo GPS. */
export function SeloQr({ className }: { className?: string }) {
  return (
    <Badge variant="waiting" className={cn("h-6 px-2 text-xs", className)} title="Provada pelo QR da recepção">
      <QrCode aria-hidden />
      QR
    </Badge>
  );
}

/** Uma linha "rótulo — valor" do comprovante. */
function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 text-right text-[15px] font-medium break-words">{children}</dd>
    </div>
  );
}

/**
 * Comprovante de uma batida: o que a pessoa guarda (ou tira print) como prova. Serve para o que
 * acabou de ser registrado e para qualquer item do histórico.
 */
export function ComprovanteDeBatida({
  comprovante,
  onFechar,
  recemRegistrado = false,
  onPedirAjuste,
}: {
  comprovante: ComprovanteDoPonto;
  onFechar: () => void;
  recemRegistrado?: boolean;
  /** Mostra "Pedir ajuste desta batida"; sem ele, o botão não aparece. */
  onPedirAjuste?: () => void;
}) {
  const pendente = comprovante.situacao === "Pendente";
  const recusada = comprovante.situacao === "Recusada";

  return (
    <Folha
      titulo={recemRegistrado ? (pendente ? "Ponto enviado" : "Ponto registrado") : "Comprovante"}
      descricao={comprovante.escolaNome ?? undefined}
      onFechar={onFechar}
    >
      <div className="flex flex-col items-center gap-1 py-3 text-center">
        <span
          className={cn(
            "grid size-14 place-items-center rounded-full",
            recusada
              ? "bg-destructive-soft text-destructive"
              : pendente
                ? "bg-warning-soft text-warning-soft-foreground"
                : "bg-success-soft text-success"
          )}
        >
          {recusada ? <CircleX className="size-8" /> : pendente ? <Hourglass className="size-7" /> : <CircleCheck className="size-8" />}
        </span>
        <p className="mt-2 font-heading text-5xl font-semibold tracking-[-.04em] tabular-nums">{comprovante.horaLocal}</p>
        <p className="text-base font-medium">{rotuloDoTipo(comprovante.tipo)}</p>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{dataPorExtenso(comprovante.data)}</p>
      </div>

      {(comprovante.mensagem || comprovante.motivos.length > 0) && (
        <div
          className={cn(
            "mb-3 rounded-xl px-4 py-3 text-sm leading-[1.5]",
            pendente ? "bg-warning-soft text-warning-soft-foreground" : "bg-muted text-foreground"
          )}
        >
          {comprovante.mensagem && <p>{comprovante.mensagem}</p>}
          {comprovante.motivos.length > 0 && (
            <p className={cn(comprovante.mensagem && "mt-1")}>
              Ficou pendente: {motivosEmPalavras(comprovante.motivos)}. A escola vai conferir.
            </p>
          )}
        </div>
      )}

      <dl>
        {comprovante.funcionarioNome && <Linha rotulo="Funcionário">{comprovante.funcionarioNome}</Linha>}
        <Linha rotulo="Situação">
          <EtiquetaDaSituacao situacao={comprovante.situacao} />
        </Linha>
        {comprovante.provaDePresenca === "Qr" && (
          <Linha rotulo="Presença">
            <SeloQr /> <span className="ml-1">Lida no QR da recepção</span>
          </Linha>
        )}
        <Linha rotulo="Número (NSR)">
          <span className="font-mono tabular-nums">{comprovante.nsr ?? "—"}</span>
        </Linha>
        {comprovante.hash && (
          <Linha rotulo="Código">
            <span className="font-mono text-xs break-all">{comprovante.hash}</span>
          </Linha>
        )}
      </dl>

      <Button variant="default" className="mt-4 h-12 w-full text-base max-md:h-12" onClick={onFechar}>
        Fechar
      </Button>
      {onPedirAjuste && comprovante.id && (
        <Button variant="ghost" className="mt-2 h-12 w-full text-base max-md:h-12" onClick={onPedirAjuste}>
          Pedir ajuste desta batida
        </Button>
      )}
    </Folha>
  );
}
