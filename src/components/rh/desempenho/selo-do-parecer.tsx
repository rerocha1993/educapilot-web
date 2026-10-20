"use client";

import { Badge } from "@/components/ui/badge";
import { ROTULO_DA_RECOMENDACAO } from "@/lib/rh/use-parecer";

/** Cor de cada recomendação: Manter verde, Acompanhar amarelo, Plano de melhoria laranja, Avaliar desligamento vermelho. */
const VARIANTE: Record<string, "success" | "waiting" | "pending" | "overdue"> = {
  Manter: "success",
  Acompanhar: "waiting",
  PlanoDeMelhoria: "pending",
  AvaliarDesligamento: "overdue",
};

export function varianteDaRecomendacao(recomendacao: string | null | undefined) {
  return (recomendacao && VARIANTE[recomendacao]) || "secondary";
}

export function SeloDoParecer({ recomendacao, className }: { recomendacao: string | null | undefined; className?: string }) {
  if (!recomendacao) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={varianteDaRecomendacao(recomendacao)} className={className}>
      {ROTULO_DA_RECOMENDACAO[recomendacao] ?? recomendacao}
    </Badge>
  );
}
