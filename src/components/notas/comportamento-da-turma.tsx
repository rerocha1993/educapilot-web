"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { CLASSE_DO_CONTROLE } from "@/components/notas/campos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSalvarComportamento, type ComportamentoDaTurma } from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

interface Edicao {
  conceito?: string;
  observacao?: string;
}

/**
 * Comportamento da turma no período: um conceito por criança (a escala de comportamento da turma) e uma
 * observação curta. É da turma, não da matéria.
 */
export function ComportamentoDaTurmaPainel({
  dados,
  onSujo,
}: {
  dados: ComportamentoDaTurma;
  onSujo: (sujo: boolean) => void;
}) {
  const salvar = useSalvarComportamento();
  const [edicoes, setEdicoes] = useState<Record<number, Edicao>>({});
  const sujo = Object.keys(edicoes).length > 0;

  useEffect(() => {
    onSujo(sujo);
  }, [sujo, onSujo]);
  useEffect(() => () => onSujo(false), [onSujo]);

  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  function mudar(studentId: number, campo: keyof Edicao, valor: string) {
    const aluno = dados.alunos.find((a) => a.studentId === studentId);
    const original = { conceito: aluno?.conceito ?? "", observacao: aluno?.observacao ?? "" };
    setEdicoes((atual) => {
      const nova = { ...atual[studentId], [campo]: valor };
      const proximo = { ...atual };
      const igual = (nova.conceito ?? original.conceito) === original.conceito && (nova.observacao ?? original.observacao) === original.observacao;
      if (igual) delete proximo[studentId];
      else proximo[studentId] = nova;
      return proximo;
    });
  }

  async function handleSalvar() {
    const alunos = Object.entries(edicoes).map(([id, e]) => {
      const aluno = dados.alunos.find((a) => a.studentId === Number(id));
      return {
        studentId: Number(id),
        conceito: (e.conceito ?? aluno?.conceito ?? "") || null,
        observacao: (e.observacao ?? aluno?.observacao ?? "").trim() || null,
      };
    });
    try {
      await salvar.mutateAsync({ classId: dados.classId, periodoId: dados.periodoId, alunos });
      setEdicoes({});
      toast.success("Comportamento salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-[12.5px] text-muted-foreground">
        Conceito de comportamento de cada criança neste período:{" "}
        {dados.conceitos.map((c) => `${c.sigla} (${c.nome})`).join(", ")}.
      </p>

      {dados.alunos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma criança nesta turma.</p>}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {dados.alunos.map((a) => {
          const e = edicoes[a.studentId];
          const conceito = e?.conceito ?? a.conceito ?? "";
          const observacao = e?.observacao ?? a.observacao ?? "";
          return (
            <li
              key={a.studentId}
              className={cn(
                "grid items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.4fr)]",
                e && "bg-action-soft/40"
              )}
            >
              <Link href={`/notas/boletim/${a.studentId}`} className="truncate font-medium hover:underline">
                {a.nome}
              </Link>
              <select
                aria-label={`Conceito de comportamento de ${a.nome}`}
                value={conceito}
                disabled={!dados.podeEditar}
                onChange={(ev) => mudar(a.studentId, "conceito", ev.target.value)}
                className={CLASSE_DO_CONTROLE}
              >
                <option value="">Sem conceito</option>
                {dados.conceitos.map((c) => (
                  <option key={c.sigla} value={c.sigla}>
                    {c.sigla} · {c.nome}
                  </option>
                ))}
              </select>
              <Input
                aria-label={`Observação sobre ${a.nome}`}
                value={observacao}
                maxLength={1000}
                disabled={!dados.podeEditar}
                placeholder="Observação (opcional)"
                onChange={(ev) => mudar(a.studentId, "observacao", ev.target.value)}
              />
            </li>
          );
        })}
      </ul>

      {dados.podeEditar && (
        <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <p className={cn("text-[12.5px]", sujo ? "font-semibold text-action" : "text-muted-foreground")}>
            {sujo ? "Há alterações não salvas." : "Tudo salvo."}
          </p>
          <Button variant="action" disabled={!sujo || salvar.isPending} onClick={handleSalvar}>
            <Save className="size-4" />
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
