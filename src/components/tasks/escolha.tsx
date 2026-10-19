"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface OpcaoDeEscolha {
  valor: string;
  rotulo: string;
}

/**
 * Lista de escolha de valor único com rótulo legível: o `SelectValue` do base-ui mostraria o valor cru
 * (o id) se não recebesse o rótulo, então a função de render devolve sempre o texto da opção.
 */
export function Escolha({
  id,
  valor,
  aoMudar,
  opcoes,
  placeholder = "Selecione",
  desabilitado,
  className,
  rotuloAcessivel,
}: {
  id?: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: OpcaoDeEscolha[];
  placeholder?: string;
  desabilitado?: boolean;
  className?: string;
  /** Para quando não há <label htmlFor> (filtros em linha). */
  rotuloAcessivel?: string;
}) {
  const atual = opcoes.find((o) => o.valor === valor);

  return (
    <Select value={valor} onValueChange={(v) => aoMudar(v ?? "")} disabled={desabilitado}>
      <SelectTrigger id={id} aria-label={rotuloAcessivel} className={cn("h-10 w-full md:h-9", className)}>
        <SelectValue placeholder={placeholder}>{() => atual?.rotulo ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
