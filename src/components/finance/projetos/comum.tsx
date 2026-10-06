import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  rotuloDoStatus,
  type StatusDaCobranca,
  type StatusDoComprovante,
  type StatusDoProjeto,
  ROTULO_DA_COBRANCA,
  ROTULO_DO_COMPROVANTE,
} from "@/lib/finance/use-projetos";
import { cn } from "@/lib/utils";

/** Situação do projeto: orçamento ainda é conversa, planejamento está valendo, encerrado é arquivo. */
export function EtiquetaDoProjeto({ status }: { status: StatusDoProjeto }) {
  const variante = status === "Planejamento" ? "success" : status === "Encerrado" ? "secondary" : "pending";
  return <Badge variant={variante}>{rotuloDoStatus(status)}</Badge>;
}

export function EtiquetaDaCobranca({ status }: { status: StatusDaCobranca }) {
  const variante =
    status === "Paga" ? "success" : status === "Vencida" ? "overdue" : status === "Cancelada" ? "secondary" : "pending";
  return <Badge variant={variante}>{ROTULO_DA_COBRANCA[status] ?? status}</Badge>;
}

export function EtiquetaDoComprovante({ status }: { status: StatusDoComprovante }) {
  const variante =
    status === "Confirmado"
      ? "success"
      : status === "Rejeitado"
        ? "secondary"
        : status === "LeituraIndisponivel"
          ? "overdue"
          : status === "Lido"
            ? "waiting"
            : "pending";
  return <Badge variant={variante}>{ROTULO_DO_COMPROVANTE[status] ?? status}</Badge>;
}

/**
 * Barra de progresso de CSS com os tokens do guia: roxa até o limite, laranja perto dele e
 * vermelha quando passa. `inverso` vale para o que é bom quando cresce (arrecadado): nunca
 * vermelha, e laranja só enquanto está baixo.
 */
export function BarraDeProgresso({
  valor,
  total,
  rotulo,
  inverso = false,
  className,
}: {
  valor: number;
  total: number;
  rotulo: string;
  inverso?: boolean;
  className?: string;
}) {
  const razao = total > 0 ? valor / total : valor > 0 ? 1 : 0;
  const pct = Math.max(0, Math.min(100, razao * 100));
  const cor = inverso
    ? "bg-primary"
    : razao > 1
      ? "bg-destructive"
      : razao >= 0.9
        ? "bg-action-brand"
        : "bg-primary";

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-1.5 overflow-hidden rounded-[4px] bg-muted", className)}
    >
      <div className={cn("h-full rounded-[4px] transition-[width] duration-700", cor)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** "R$ 120,00 / R$ 500,00" com a barra embaixo: o par que o cartão e a execução repetem. */
export function LinhaComBarra({
  rotulo,
  valor,
  total,
  inverso,
}: {
  rotulo: string;
  valor: number;
  total: number;
  inverso?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="font-mono tabular-nums">
          <span className="font-semibold">{formatarMoeda(valor)}</span>
          <span className="text-muted-foreground"> / {formatarMoeda(total)}</span>
        </span>
      </div>
      <BarraDeProgresso valor={valor} total={total} rotulo={rotulo} inverso={inverso} />
    </div>
  );
}

/** Faixa de aviso (amarela) do projeto: o que o servidor pede para olhar. */
export function FaixaDeAviso({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-action-border bg-action-soft px-4 py-3 text-sm text-action-soft-foreground"
    >
      {children}
    </div>
  );
}

/** Número com rótulo, para os cartões de execução. */
export function Numero({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: "danger" | "success" }) {
  return (
    <div className="min-w-0">
      <p className="text-[12.5px] text-muted-foreground md:text-xs">{rotulo}</p>
      <p
        className={cn(
          "font-mono text-[15px] font-semibold tabular-nums",
          tom === "danger" && "text-destructive",
          tom === "success" && "text-success-soft-foreground"
        )}
      >
        {valor}
      </p>
    </div>
  );
}
