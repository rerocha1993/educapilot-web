"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FormularioEscolhivel {
  id: string;
  nome: string;
  /** Complemento do rótulo (o tipo, quando existe): dois formulários costumam ter nomes parecidos. */
  sufixo?: string | null;
}

/**
 * Rótulo da seleção. Lista vazia é "todos" — e é o padrão da caixa de envios.
 *
 * Guardar o vazio, e não a lista inteira de ids, é o que faz o formulário criado amanhã entrar na
 * caixa sem ninguém precisar voltar aqui para marcá-lo.
 */
export function rotuloDaSelecao(formularios: FormularioEscolhivel[], selecionados: string[]) {
  if (selecionados.length === 0) return "Todos os formulários";
  if (selecionados.length === 1) {
    return formularios.find((f) => f.id === selecionados[0])?.nome ?? "1 formulário";
  }
  return `${selecionados.length} formulários`;
}

/**
 * Escolha de um, vários ou todos os formulários.
 *
 * Substitui o par "formulário" + "tipo": a escola não acompanha "o tipo rematrícula", ela
 * acompanha os formulários que resolveu olhar juntos — matrícula e rematrícula, ou só as duas
 * autorizações de passeio.
 */
export function SeletorDeFormularios({
  formularios,
  selecionados,
  onChange,
  className,
}: {
  formularios: FormularioEscolhivel[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-1 md:w-auto", className)}>
      <Select
        multiple
        value={selecionados}
        onValueChange={(valores: string[]) => onChange(valores)}
        disabled={formularios.length === 0}
      >
        <SelectTrigger className="w-full md:w-72">
          <SelectValue>{() => rotuloDaSelecao(formularios, selecionados)}</SelectValue>
        </SelectTrigger>
        {/* alignItemWithTrigger={false}: com várias marcadas não existe "o item" para alinhar
            embaixo do gatilho. */}
        <SelectContent align="start" alignItemWithTrigger={false}>
          {formularios.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.sufixo ? `${f.nome} · ${f.sufixo}` : f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selecionados.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          Ver todos
        </Button>
      )}
    </div>
  );
}
