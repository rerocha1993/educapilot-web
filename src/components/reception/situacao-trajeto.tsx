import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Finalidade, SituacaoTrajeto } from "@/lib/reception/use-mapa";

export const ROTULO_SITUACAO: Record<SituacaoTrajeto, string> = {
  ACaminho: "A caminho",
  Chegando: "Chegando",
  Chegou: "Chegou",
};

export const ROTULO_FINALIDADE: Record<Finalidade, string> = {
  Entrega: "vem deixar",
  Retirada: "vem buscar",
};

// Fora do arquivo do mapa de propósito: a lista usa as mesmas cores sem carregar o Leaflet.
const COR_BADGE: Record<SituacaoTrajeto, string> = {
  ACaminho: "bg-accent text-accent-foreground",
  Chegando: "bg-warning-soft text-warning-soft-foreground",
  Chegou: "bg-success-soft text-success-soft-foreground",
};

export function BadgeSituacao({ situacao, className }: { situacao: SituacaoTrajeto; className?: string }) {
  return <Badge className={cn(COR_BADGE[situacao], className)}>{ROTULO_SITUACAO[situacao]}</Badge>;
}
