import { Badge } from "@/components/ui/badge";
import { GRAVIDADE_NAO_INFORMADA, gravidadeValida } from "@/lib/tasks/gravidade";

const VARIANTE = { Leve: "waiting", Moderada: "pending", Grave: "overdue" } as const;

/** Selo da gravidade de uma ocorrência. Sem gravidade (registro antigo) aparece como "Não informada". */
export function SeloDeGravidade({ gravidade, className }: { gravidade?: string | null; className?: string }) {
  const g = gravidadeValida(gravidade);
  if (g == null) {
    return (
      <Badge variant="outline" className={className}>
        {GRAVIDADE_NAO_INFORMADA}
      </Badge>
    );
  }
  return (
    <Badge variant={VARIANTE[g]} className={className}>
      {g}
    </Badge>
  );
}
