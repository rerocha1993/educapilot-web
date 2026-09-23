"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";

const TODAS = "__todas__";

/**
 * Escolha do aluno por turma e por nome.
 *
 * A escola tem mais de cem alunos, e a lista era uma caixa de seleção só, na ordem do cadastro:
 * achar a criança certa ali é rolar até cansar. Quem trabalha na secretaria pensa por turma
 * primeiro ("a Alice do Pré") — então a turma filtra e o nome busca, do mesmo jeito que a tela de
 * Alunos já faz.
 */
export function SeletorDeAluno({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (studentId: string) => void;
}) {
  const { data: alunos } = useAllStudents();
  const { data: turmas } = useClasses();

  const [turma, setTurma] = useState(TODAS);
  const [busca, setBusca] = useState("");

  const escolhido = alunos?.find((a) => String(a.id) === valor);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (alunos ?? []).filter(
      (a) =>
        (turma === TODAS || String(a.classId) === turma) &&
        (termo === "" || (a.fullName ?? "").toLowerCase().includes(termo))
    );
  }, [alunos, turma, busca]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={turma} onValueChange={(v) => v && setTurma(String(v))}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {() =>
                turma === TODAS
                  ? "Todas as turmas"
                  : (turmas?.find((t) => String(t.id) === turma)?.className ?? "Turma")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as turmas</SelectItem>
            {(turmas ?? []).map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar pelo nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Lista curta e rolável em vez de caixa de seleção: com o filtro aplicado, quase sempre
          cabem poucos nomes, e clicar no nome é um toque em vez de dois. */}
      <div className="flex max-h-44 flex-col overflow-y-auto rounded-lg border border-border p-1">
        {lista.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            Nenhum aluno com esse nome nesta turma.
          </p>
        )}
        {lista.map((aluno) => {
          const selecionado = String(aluno.id) === valor;
          return (
            <button
              key={aluno.id}
              type="button"
              onClick={() => onChange(String(aluno.id))}
              className={`flex min-h-10 items-center justify-between gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                selecionado ? "bg-primary/10 font-medium text-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="min-w-0 break-words">{aluno.fullName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {turmas?.find((t) => t.id === aluno.classId)?.className}
              </span>
            </button>
          );
        })}
      </div>

      {escolhido && (
        <p className="text-xs text-muted-foreground">
          Aluno escolhido: <span className="font-medium text-foreground">{escolhido.fullName}</span>
        </p>
      )}
    </div>
  );
}
