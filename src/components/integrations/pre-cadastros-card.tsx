"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useCompletarPreCadastro,
  useDescartarPreCadastro,
  usePreCadastros,
  type PreCadastro,
} from "@/lib/integrations/use-agenda-edu";

/**
 * Alunos que a importação trouxe incompletos e aguardam complemento manual.
 *
 * O card some quando não há nada pendente — uma lista vazia permanente na tela vira ruído.
 */
export function PreCadastrosCard() {
  const { data: pendentes, isLoading } = usePreCadastros();

  if (isLoading) return <Skeleton className="h-32 w-full rounded-lg" />;
  if (!pendentes || pendentes.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-warning-border bg-warning-soft p-4">
      <div>
        <h2 className="font-heading text-base font-bold">
          {pendentes.length} aluno(s) aguardando complemento
        </h2>
        <p className="text-sm">
          Vieram do Agenda Edu sem um dado obrigatório. Complete o que falta para cadastrá-los, ou
          descarte se não devem entrar. Corrigir no Agenda Edu e importar de novo também resolve.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {pendentes.map((p) => (
          <LinhaPreCadastro key={p.id} pendente={p} />
        ))}
      </div>
    </div>
  );
}

function LinhaPreCadastro({ pendente }: { pendente: PreCadastro }) {
  const { data: turmas } = useClasses();
  const completar = useCompletarPreCadastro();
  const descartar = useDescartarPreCadastro();

  const [classId, setClassId] = useState<string>("");
  const [dataNascimento, setDataNascimento] = useState(
    // Quando a data veio do Agenda Edu, já vem preenchida — o que falta é só a turma.
    pendente.dataNascimento ? pendente.dataNascimento.substring(0, 10) : ""
  );

  const podeCompletar = Boolean(classId) && Boolean(dataNascimento);

  async function handleCompletar() {
    if (!podeCompletar) return;
    try {
      await completar.mutateAsync({
        id: pendente.id,
        classId: Number(classId),
        dataNascimento,
      });
      toast.success(`${pendente.nome} cadastrado(a).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar.");
    }
  }

  async function handleDescartar() {
    try {
      await descartar.mutateAsync(pendente.id);
      toast.success(`${pendente.nome} descartado(a).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao descartar.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div>
        <div className="text-sm font-medium">{pendente.nome}</div>
        <div className="text-xs text-muted-foreground">
          {pendente.motivo}
          {pendente.quantidadeResponsaveis > 0 && (
            <> · {pendente.quantidadeResponsaveis} responsável(is) será(ão) vinculado(s)</>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-40 flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">Turma</label>
          <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione">
                {() => turmas?.find((t) => String(t.id) === classId)?.className ?? "Selecione"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(turmas ?? []).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">Data de nascimento</label>
          <Input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
          />
        </div>

        <Button onClick={handleCompletar} disabled={!podeCompletar || completar.isPending}>
          {completar.isPending ? "Cadastrando..." : "Cadastrar"}
        </Button>
        <Button variant="outline" onClick={handleDescartar} disabled={descartar.isPending}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
