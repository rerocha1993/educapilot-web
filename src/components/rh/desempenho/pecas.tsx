"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatarNota, formatarVariacao, useConfiguracaoDeDesempenho } from "@/lib/rh/use-desempenho";
import { cn } from "@/lib/utils";

/**
 * Aviso fixo das telas de nota: apoio à decisão, não decisão automatizada (LGPD, art. 20). Vem escrito no
 * servidor também (`apoioADecisao`), mas a tela não depende da resposta para mostrá-lo.
 */
export function AvisoDeApoio({ className, texto }: { className?: string; texto?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] leading-snug text-muted-foreground",
        className
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {texto ??
          "A nota é apoio à decisão, não decisão automatizada: ela sempre vem com a explicação de como foi calculada, e o funcionário pode pedir revisão e registrar a sua contestação."}
      </span>
    </p>
  );
}

type Tom = "success" | "waiting" | "pending" | "overdue" | "secondary";

/**
 * A cor da faixa vem da POSIÇÃO dela na lista da escola (a de cima é verde, a de baixo chama atenção), e não do
 * nome nem de um número fixo: a escola renomeia e move as faixas à vontade.
 */
export function useTomDaFaixa() {
  const { data } = useConfiguracaoDeDesempenho();
  const nomes = [...(data?.faixas ?? [])].sort((a, b) => b.minimo - a.minimo).map((f) => f.nome);

  return (faixa: string | null | undefined): Tom => {
    if (!faixa) return "secondary";
    const i = nomes.indexOf(faixa);
    if (i < 0) return "secondary";
    if (i === 0) return "success";
    if (i === nomes.length - 1) return "overdue";
    return i === 1 ? "waiting" : "pending";
  };
}

export function FaixaBadge({ faixa }: { faixa: string | null | undefined }) {
  const tom = useTomDaFaixa();
  if (!faixa) return <Badge variant="outline">Sem nota</Badge>;
  return <Badge variant={tom(faixa)}>{faixa}</Badge>;
}

/** ▲ 3,2 / ▼ 1,0 / = — verde sobe, vermelho desce. */
export function Variacao({ valor, className }: { valor: number | null | undefined; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[12.5px] tabular-nums",
        valor == null || valor === 0
          ? "text-muted-foreground"
          : valor > 0
            ? "text-success"
            : "text-destructive",
        className
      )}
      title="Em relação ao último fechamento (ciclo ou mês)"
    >
      {formatarVariacao(valor)}
    </span>
  );
}

/** A nota grande, com o "/ 100" em cinza. */
export function NotaGrande({ nota, className }: { nota: number | null | undefined; className?: string }) {
  return (
    <span className={cn("font-heading font-semibold tracking-[-.03em] tabular-nums", className)}>
      {formatarNota(nota)}
      {nota != null && <span className="ml-1 text-[0.55em] font-normal text-[#B5AEBF]">/ 100</span>}
    </span>
  );
}

/** Mini-linha (sparkline) em SVG: a evolução das notas, com o último ponto destacado. */
export function MiniLinha({
  valores,
  largura = 84,
  altura = 24,
  className,
}: {
  valores: number[];
  largura?: number;
  altura?: number;
  className?: string;
}) {
  if (valores.length === 0) return <span className="text-muted-foreground">—</span>;

  const pad = 3;
  const x = (i: number) => (valores.length === 1 ? largura / 2 : pad + (i * (largura - 2 * pad)) / (valores.length - 1));
  const y = (v: number) => altura - pad - (Math.max(0, Math.min(100, v)) / 100) * (altura - 2 * pad);
  const pontos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = valores[valores.length - 1];

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width={largura}
      height={altura}
      role="img"
      aria-label={`Evolução da nota: ${valores.map((v) => formatarNota(v)).join(", ")}`}
      className={cn("shrink-0 text-primary", className)}
    >
      {valores.length > 1 && (
        <polyline points={pontos} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      )}
      <circle cx={x(valores.length - 1)} cy={y(ultimo)} r="2.6" className="fill-action-brand" />
    </svg>
  );
}

/** Barra horizontal de 0 a 100; laranja quando está baixa (abaixo de `alerta`). */
export function BarraDeNota({ nota, alerta = 50, className }: { nota: number; alerta?: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)} role="presentation">
      <div
        className={cn("h-full rounded-full", nota < alerta ? "bg-action-brand" : "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(100, nota))}%` }}
      />
    </div>
  );
}

export function RotuloPequeno({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase", className)}>{children}</p>
  );
}
