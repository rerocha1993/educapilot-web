"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TipoDeFormulario } from "@/lib/flow/form-config";

const OPCOES: { valor: TipoDeFormulario; rotulo: string }[] = [
  { valor: "matricula", rotulo: "Matrícula" },
  { valor: "rematricula", rotulo: "Rematrícula" },
  { valor: "outro", rotulo: "Outro (sem tag)" },
];

/** Escolha do tipo do formulário. Começa vazio de propósito: quem cria diz o que é. */
export function SeletorDeTipo({
  valor,
  onChange,
}: {
  valor: TipoDeFormulario | "";
  onChange: (tipo: TipoDeFormulario) => void;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label className="text-xs text-muted-foreground">Tipo</Label>
      <Select value={valor || undefined} onValueChange={(v) => v && onChange(v as TipoDeFormulario)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {() => OPCOES.find((o) => o.valor === valor)?.rotulo ?? "Matrícula, rematrícula ou outro"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPCOES.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Vira a tag de cada envio na caixa de envios.</p>
    </div>
  );
}
