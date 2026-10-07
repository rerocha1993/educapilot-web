"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFuncionarios } from "@/lib/rh/use-rh";
import { cn } from "@/lib/utils";

/** Valor do seletor quando "todos" está escolhido (só existe com `rotuloDeTodos`). */
export const TODOS_OS_FUNCIONARIOS = "todos";

/**
 * Escolhe um funcionário.
 *
 * `valor` vazio é "ninguém escolhido ainda". Com `rotuloDeTodos`, a primeira opção vira "Todos os
 * funcionários" e o valor é TODOS_OS_FUNCIONARIOS — quem usa troca por nulo antes de chamar a API.
 * `apenasAtivos` esconde quem foi desligado: para lançar ponto ou documento não faz sentido, para
 * consultar um atestado antigo faz.
 */
export function SeletorDeFuncionario({
  id,
  valor,
  onChange,
  apenasAtivos = true,
  rotuloDeTodos,
  className,
}: {
  id?: string;
  valor: string;
  onChange: (id: string) => void;
  apenasAtivos?: boolean;
  rotuloDeTodos?: string;
  className?: string;
}) {
  const { data: funcionarios, isLoading, isError } = useFuncionarios({ ativos: apenasAtivos ? true : null });

  const lista = funcionarios ?? [];
  const nome =
    valor === TODOS_OS_FUNCIONARIOS
      ? rotuloDeTodos
      : lista.find((f) => f.id === valor)?.nomeCompleto;

  return (
    <Select
      value={valor === "" ? null : valor}
      onValueChange={(v) => v && onChange(v)}
      disabled={isLoading}
    >
      <SelectTrigger id={id} className={cn("w-full md:w-72", className)}>
        <SelectValue>
          {() =>
            nome ??
            (isLoading ? "Carregando..." : isError ? "Não foi possível carregar" : "Escolha o funcionário")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72 w-auto min-w-(--anchor-width)">
        {rotuloDeTodos && <SelectItem value={TODOS_OS_FUNCIONARIOS}>{rotuloDeTodos}</SelectItem>}
        {lista.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.nomeCompleto}
            {!f.ativo && <span className="text-muted-foreground"> (desligado)</span>}
          </SelectItem>
        ))}
        {lista.length === 0 && !isLoading && (
          <p className="px-2 py-2 text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
        )}
      </SelectContent>
    </Select>
  );
}
