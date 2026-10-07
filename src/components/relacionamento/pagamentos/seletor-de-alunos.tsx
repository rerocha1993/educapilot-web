"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";

const TODAS = "__todas__";

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Alunos em caixas de marcar, filtrados por turma e por nome. A turma só filtra a lista: o que
 * foi marcado fica marcado ao trocar de turma, e a contagem embaixo é do total escolhido.
 */
export function SeletorDeAlunos({
  valor,
  onChange,
  disabled = false,
  rotulo = "Alunos",
}: {
  valor: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  /** Nome do grupo para leitor de tela. */
  rotulo?: string;
}) {
  const { data: alunos, isLoading, isError } = useAllStudents();
  const { data: turmas } = useClasses();
  const [turma, setTurma] = useState(TODAS);
  const [busca, setBusca] = useState("");

  const nomeDaTurma = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const t of turmas ?? []) if (typeof t.id === "number") mapa.set(t.id, t.className ?? `Turma ${t.id}`);
    return mapa;
  }, [turmas]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return (alunos ?? [])
      .filter(
        (a) =>
          (turma === TODAS || String(a.classId) === turma) &&
          (termo === "" || normalizar(a.fullName ?? "").includes(termo))
      )
      .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? "", "pt-BR"));
  }, [alunos, turma, busca]);

  function alternar(id: number, marcado: boolean) {
    onChange(marcado ? [...valor.filter((v) => v !== id), id] : valor.filter((v) => v !== id));
  }

  function marcarVisiveis() {
    const novos = visiveis.map((a) => a.id).filter((id) => !valor.includes(id));
    onChange([...valor, ...novos]);
  }

  function limparVisiveis() {
    const ids = new Set(visiveis.map((a) => a.id));
    onChange(valor.filter((v) => !ids.has(v)));
  }

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar os alunos.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={turma} onValueChange={(v) => v && setTurma(String(v))}>
          <SelectTrigger aria-label="Filtrar alunos por turma" className="w-full">
            <SelectValue>
              {() => (turma === TODAS ? "Todas as turmas" : (nomeDaTurma.get(Number(turma)) ?? "Turma"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODAS}>Todas as turmas</SelectItem>
            {[...nomeDaTurma.entries()]
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
              .map(([id, nome]) => (
                <SelectItem key={id} value={String(id)}>
                  {nome}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar aluno pelo nome"
            className="pl-8"
            placeholder="Buscar pelo nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || visiveis.length === 0} onClick={marcarVisiveis}>
          Marcar os {visiveis.length} da lista
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || valor.length === 0} onClick={limparVisiveis}>
          Desmarcar da lista
        </Button>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {valor.length === 0 ? "Nenhum aluno marcado" : `${valor.length} ${valor.length === 1 ? "aluno marcado" : "alunos marcados"}`}
        </span>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
          Nenhum aluno encontrado.
        </p>
      ) : (
        <ul aria-label={rotulo} className="grid max-h-56 gap-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
          {visiveis.map((a) => (
            <li key={a.id}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted">
                <Checkbox checked={valor.includes(a.id)} disabled={disabled} onCheckedChange={(v) => alternar(a.id, v === true)} />
                <span className="min-w-0 flex-1 break-words">{a.fullName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{nomeDaTurma.get(a.classId) ?? ""}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
