import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TipoDeFormulario } from "@/lib/flow/form-config";
import { ROTULO_DO_TIPO } from "@/lib/flow/tipo-do-formulario";

/** Tag "Matrícula" ou "Rematrícula". Formulário de outro tipo não ganha tag. */
export function TagDoTipo({ tipo, className }: { tipo: TipoDeFormulario | null; className?: string }) {
  if (tipo !== "matricula" && tipo !== "rematricula") return null;

  return (
    <Badge
      className={cn(
        tipo === "rematricula"
          ? "bg-primary/10 text-primary"
          : "border border-border bg-transparent text-foreground",
        className
      )}
    >
      {ROTULO_DO_TIPO[tipo]}
    </Badge>
  );
}
