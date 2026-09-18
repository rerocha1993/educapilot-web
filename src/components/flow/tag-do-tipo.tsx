import { Badge } from "@/components/ui/badge";
import type { TipoDeFormulario } from "@/lib/flow/form-config";
import { ROTULO_DO_TIPO } from "@/lib/flow/tipo-do-formulario";

/** Tag "Matrícula" ou "Rematrícula". Formulário de outro tipo não ganha tag. */
export function TagDoTipo({ tipo, className }: { tipo: TipoDeFormulario | null; className?: string }) {
  if (tipo !== "matricula" && tipo !== "rematricula") return null;

  return (
    // Rematrícula em roxo tinta, matrícula só com a borda: as duas são dado neutro, não situação.
    <Badge variant={tipo === "rematricula" ? "waiting" : "outline"} className={className}>
      {ROTULO_DO_TIPO[tipo]}
    </Badge>
  );
}
