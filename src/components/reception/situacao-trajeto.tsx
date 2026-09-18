import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
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

// Fora do arquivo do mapa de propósito: a lista usa as mesmas etiquetas sem carregar o Leaflet.
type VarianteDeBadge = VariantProps<typeof badgeVariants>["variant"];

const VARIANTE: Record<SituacaoTrajeto, VarianteDeBadge> = {
  ACaminho: "waiting",
  Chegando: "pending",
  Chegou: "success",
};

export function BadgeSituacao({ situacao, className }: { situacao: SituacaoTrajeto; className?: string }) {
  return (
    <Badge variant={VARIANTE[situacao]} className={cn(className)}>
      {ROTULO_SITUACAO[situacao]}
    </Badge>
  );
}
