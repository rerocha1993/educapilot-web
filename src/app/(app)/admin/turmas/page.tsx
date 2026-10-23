"use client";

import { useEffect, useState } from "react";
import { Plus, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { toast } from "sonner";
import {
  useClasses,
  useDeleteClass,
  useSaveClass,
  type SaveClassInput,
} from "@/lib/kernel/use-classes";
import { cn } from "@/lib/utils";
import { DialogDeBlocos } from "@/components/relacionamento/diario/dialog-de-blocos";
import { useBlocosDaTurma } from "@/lib/relacionamento/use-diario";
import { nomeDoModelo } from "@/lib/relacionamento/diario-modelos";

/**
 * "Diário: <modelo>" no cartão da turma, com atalho para ajustar. Quem não tem acesso ao diário não
 * recebe os blocos (a consulta falha) e o cartão fica sem a linha, em vez de mostrar um erro.
 */
function DiarioDaTurma({ classId, turma }: { classId: number; turma: string }) {
  const blocos = useBlocosDaTurma(classId);
  const [aberto, setAberto] = useState(false);
  if (!blocos.data) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          Diário: <strong className="font-semibold text-foreground">{nomeDoModelo(blocos.data)}</strong>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(true)} aria-label={`Ajustar o diário da turma ${turma}`}>
          <SlidersHorizontal className="size-3.5" />
          Ajustar
        </Button>
      </div>
      <DialogDeBlocos classId={classId} turma={turma} aberto={aberto} onFechar={() => setAberto(false)} />
    </>
  );
}

export default function TurmasPage() {
  const { data: classes, isLoading, isError } = useClasses();
  const saveClass = useSaveClass();
  const deleteClass = useDeleteClass();

  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [className, setClassName] = useState("");

  const selectedClass =
    selectedId && selectedId !== "new" ? classes?.find((c) => c.id === selectedId) : null;

  useEffect(() => {
    setClassName(selectedId === "new" ? "" : (selectedClass?.className ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!className.trim()) return;

    const input: SaveClassInput = {
      className: className.trim(),
      ...(selectedId !== "new" && selectedId ? { id: selectedId } : {}),
    };

    try {
      await saveClass.mutateAsync(input);
      toast.success(selectedId === "new" ? "Turma criada." : "Turma atualizada.");
      setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteClass.mutateAsync(id);
      toast.success("Turma excluída.");
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoDaPagina
        className="md:items-center md:gap-0"
        eyebrow="Administração"
        titulo="Turmas"
        apoio={
          <>
            <span className="font-mono tabular-nums">{classes?.length ?? 0}</span> turma
            {classes?.length === 1 ? "" : "s"} cadastrada{classes?.length === 1 ? "" : "s"}
          </>
        }
        acoes={
          <Button variant="action" onClick={() => setSelectedId("new")} className="w-full md:w-auto">
            <Plus className="size-4" />
            Nova turma
          </Button>
        }
      />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Lista à esquerda — ver A7 no handoff de design */}
        {/* Turma é objeto pequeno: grade de cartões, e com o painel aberto sobram duas colunas. */}
        <div
          className={cn(
            "grid min-w-0 flex-1 content-start items-start gap-2.5 sm:grid-cols-2",
            selectedId ? "xl:grid-cols-2" : "xl:grid-cols-3"
          )}
        >
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}

          {isError && (
            <div className="col-span-full rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
              Não foi possível carregar as turmas.
            </div>
          )}

          {!isLoading && classes?.length === 0 && (
            <div className="col-span-full flex flex-col items-center rounded-xl border border-dashed border-border-dashed bg-card px-5 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Users className="size-4" />
              </span>
              <p className="mt-3 max-w-[280px] font-heading text-[15px] font-semibold text-pretty">
                Nenhuma turma cadastrada ainda.
              </p>
              <Button className="mt-3.5" onClick={() => setSelectedId("new")}>
                Criar a primeira turma
              </Button>
            </div>
          )}

          {classes?.map((c) => {
            const professores = (c.userClasses ?? [])
              .filter((uc) => uc.user?.userType === "Teacher")
              .map((uc) => uc.user?.fullName)
              .filter(Boolean);

            return (
              <div
                key={c.id}
                className={cn(
                  "min-w-0 rounded-xl border bg-card transition-colors hover:border-primary",
                  selectedId === c.id ? "border-primary bg-accent/40" : "border-border"
                )}
              >
              <button
                onClick={() => setSelectedId(c.id ?? null)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-heading text-sm font-semibold">{c.className}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {professores.length > 0 ? professores.join(", ") : "Sem professor vinculado"}
                  </span>
                </div>
                <Badge variant="secondary" className="gap-1 font-mono text-[11px] tabular-nums">
                  <Users className="size-3" />
                  {c.students?.length ?? 0}
                </Badge>
              </button>
              {c.id != null && <DiarioDaTurma classId={c.id} turma={c.className ?? ""} />}
              </div>
            );
          })}
        </div>

        {/* Painel de edição à direita — fundo #FAFAF9 per A7. No celular fica acima da lista, senão
            abriria lá embaixo, fora da tela de quem tocou na turma. */}
        {selectedId && (
          <div className="order-first w-full rounded-xl md:order-none md:w-80 md:shrink-0 border border-border bg-card p-5">
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <h2 className="font-heading text-[15.5px] font-semibold">
                {selectedId === "new" ? "Nova turma" : "Editar turma"}
              </h2>

              <div className="flex flex-col gap-[5px]">
                <Label
                  htmlFor="className"
                  className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground"
                >
                  Nome
                </Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ex: 4º ano B"
                  className="md:h-9"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 md:flex-nowrap">
                {selectedId !== "new" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(selectedId)}
                    disabled={deleteClass.isPending}
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveClass.isPending || !className.trim()}>
                    {saveClass.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
