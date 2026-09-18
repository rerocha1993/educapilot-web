"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, GraduationCap, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useProgressoes,
  usePromoverTurma,
  useSalvarProgressao,
  type ClassProgression,
} from "@/lib/integrations/use-rematricula";

// Progressão de turma (2026-09) — na virada do ano a escola passa a turma inteira para a
// seguinte (Berçário II vira Mini Maternal). Duas coisas na mesma tela porque uma depende da
// outra: configurar o destino e, só então, promover.
//
// A promoção NÃO é automática por data. Cada escola vira o ano num dia diferente, e mover aluno
// de turma sozinho, sem alguém mandar, é o tipo de coisa que ninguém percebe até dar errado.

const SEM_DESTINO = "__nenhuma__";

export default function ProgressaoTurmaPage() {
  const { data: progressoes, isLoading, isError } = useProgressoes();
  const salvar = useSalvarProgressao();
  const promover = usePromoverTurma();

  const [confirmando, setConfirmando] = useState<ClassProgression | null>(null);

  async function handleSalvar(classOrigemId: number, valor: string) {
    try {
      await salvar.mutateAsync({
        classOrigemId,
        classDestinoId: valor === SEM_DESTINO ? null : Number(valor),
      });
      toast.success("Progressão salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handlePromover() {
    if (!confirmando) return;
    try {
      const resultado = await promover.mutateAsync(confirmando.classOrigemId);

      // O backend devolve 200 com sucesso=false e o motivo quando falta configuração — a tela
      // precisa dizer o que resolver, não só "erro".
      if (!resultado.sucesso) {
        toast.error(resultado.erro ?? "Não foi possível promover a turma.");
        return;
      }

      toast.success(
        `${resultado.alunosPromovidos} aluno(s) passaram de ${resultado.turmaOrigem} para ${resultado.turmaDestino}.`
      );
      setConfirmando(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao promover a turma.");
    }
  }

  const linhas = progressoes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoDaPagina
        eyebrow="Administração"
        titulo="Progressão de turma"
        apoio="Para qual turma cada turma passa na virada do ano. Usado também para preencher a turma do próximo ano na rematrícula."
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && (
        <p className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as turmas. Recarregue a página.
        </p>
      )}

      {!isLoading && !isError && linhas.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border-dashed bg-card px-5 py-9 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <GraduationCap className="size-4" />
          </span>
          <p className="mt-3 font-heading text-[15px] font-semibold">Nenhuma turma cadastrada ainda.</p>
        </div>
      )}

      {linhas.map((linha) => (
        <div
          key={linha.classOrigemId}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <GraduationCap className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-heading text-[15.5px] font-semibold">{linha.turmaOrigem}</p>
              <p className="text-xs text-muted-foreground">
                {linha.turmaDestino ? (
                  <span className="inline-flex items-center gap-1">
                    passa para <ArrowRight className="size-3" /> {linha.turmaDestino}
                  </span>
                ) : (
                  "sem destino configurado"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center">
            <Select
              value={linha.classDestinoId ? String(linha.classDestinoId) : SEM_DESTINO}
              onValueChange={(v) => v && handleSalvar(linha.classOrigemId, String(v))}
            >
              <SelectTrigger className="w-full min-[400px]:min-w-0 min-[400px]:flex-1 sm:w-56 sm:flex-none">
                <SelectValue>{() => linha.turmaDestino ?? "Turma final (se forma)"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Destino nulo é uma escolha legítima, não a ausência de uma: é a última turma
                    da escola, de onde o aluno sai formado. */}
                <SelectItem value={SEM_DESTINO}>Turma final (se forma)</SelectItem>
                {linhas
                  .filter((outra) => outra.classOrigemId !== linha.classOrigemId)
                  .map((outra) => (
                    <SelectItem key={outra.classOrigemId} value={String(outra.classOrigemId)}>
                      {outra.turmaOrigem}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              disabled={!linha.classDestinoId}
              onClick={() => setConfirmando(linha)}
            >
              Promover
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!confirmando} onOpenChange={(open) => !open && setConfirmando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover a turma?</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <p>
              Todos os alunos de <strong>{confirmando?.turmaOrigem}</strong> passam para{" "}
              <strong>{confirmando?.turmaDestino}</strong>.
            </p>

            {/* Aviso explícito porque não existe "desfazer": reverter significa promover na mão
                de volta, aluno por aluno, e só quem lembra quem estava em qual turma consegue. */}
            <p className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Não dá para desfazer automaticamente. Faça isso uma vez só, na virada do ano, e
              começando pela ÚLTIMA turma — promover a primeira antes esvazia a turma e mistura os
              alunos com a turma seguinte.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button onClick={handlePromover} disabled={promover.isPending}>
              {promover.isPending ? "Promovendo..." : "Promover agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
