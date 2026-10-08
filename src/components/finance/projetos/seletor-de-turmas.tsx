"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/lib/kernel/use-classes";

/**
 * Turmas do projeto em caixas de marcar. Nenhuma marcada quer dizer a escola toda — a frase
 * embaixo diz isso, para ninguém achar que o projeto ficou sem público.
 */
export function SeletorDeTurmas({
  valor,
  onChange,
  disabled = false,
  somente,
  textoVazio = "Nenhuma turma marcada: o projeto vale para a escola toda.",
}: {
  valor: number[];
  onChange: (turmas: number[]) => void;
  disabled?: boolean;
  /** Mostra só estas turmas (as do projeto, por exemplo). Sem isto, todas. */
  somente?: number[];
  textoVazio?: string;
}) {
  const { data: turmas, isLoading } = useClasses();

  const lista = (turmas ?? [])
    .filter((t) => !somente || somente.includes(Number(t.id)))
    .map((t) => ({ id: Number(t.id), nome: t.className ?? `Turma ${t.id}` }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (lista.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Nenhuma turma cadastrada: o projeto vale para a escola toda.</p>;
  }

  function alternar(id: number, marcada: boolean) {
    onChange(marcada ? [...valor.filter((v) => v !== id), id] : valor.filter((v) => v !== id));
  }

  return (
    <div className="grid gap-2">
      <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
        {lista.map((t) => (
          <label key={t.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-sm hover:bg-muted">
            <Checkbox
              checked={valor.includes(t.id)}
              disabled={disabled}
              onCheckedChange={(v) => alternar(t.id, v === true)}
            />
            <span className="min-w-0 break-words">{t.nome}</span>
          </label>
        ))}
      </div>
      {valor.length === 0 && <p className="text-xs text-muted-foreground">{textoVazio}</p>}
    </div>
  );
}
