import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variante = "success" | "pending" | "waiting" | "overdue" | "secondary";

/**
 * Situação do envio nas cores do guia: concluída (verde), aguardando a família (roxo) e
 * revisar (laranja, porque é a única que pede uma decisão da escola).
 */
const VARIANTE_DA_SITUACAO: Record<string, Variante> = {
  Concluída: "success",
  Pendente: "waiting",
  Revisar: "pending",
};

export function BadgeDeSituacao({
  situacao,
  className,
}: {
  situacao: string | null | undefined;
  className?: string;
}) {
  if (!situacao) return null;

  return (
    <Badge variant={VARIANTE_DA_SITUACAO[situacao] ?? "secondary"} className={cn(className)}>
      {situacao}
    </Badge>
  );
}
