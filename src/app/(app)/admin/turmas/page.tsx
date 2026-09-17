"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useClasses,
  useDeleteClass,
  useSaveClass,
  type SaveClassInput,
} from "@/lib/kernel/use-classes";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
        <div>
          <h1 className="font-heading text-2xl font-bold">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            {classes?.length ?? 0} turma{classes?.length === 1 ? "" : "s"} cadastrada
            {classes?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setSelectedId("new")} className="w-full md:w-auto">
          <Plus className="size-4" />
          Nova turma
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Lista à esquerda — ver A7 no handoff de design */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}

          {isError && (
            <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
              Não foi possível carregar as turmas.
            </div>
          )}

          {!isLoading && classes?.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
              <Button variant="outline" onClick={() => setSelectedId("new")}>
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
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id ?? null)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 md:gap-0 py-3 text-left transition-colors hover:bg-accent/40",
                  selectedId === c.id ? "border-primary bg-accent/40" : "border-border"
                )}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-heading text-sm font-semibold">{c.className}</span>
                  <span className="text-xs text-muted-foreground">
                    {professores.length > 0 ? professores.join(", ") : "Sem professor vinculado"}
                  </span>
                </div>
                <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                  <Users className="size-3" />
                  {c.students?.length ?? 0}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Painel de edição à direita — fundo #FAFAF9 per A7. No celular fica acima da lista, senão
            abriria lá embaixo, fora da tela de quem tocou na turma. */}
        {selectedId && (
          <div className="order-first w-full rounded-lg md:order-none md:w-80 md:shrink-0 border border-border bg-background p-4">
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <h2 className="font-heading text-sm font-bold">
                {selectedId === "new" ? "Nova turma" : "Editar turma"}
              </h2>

              <div className="flex flex-col gap-[5px]">
                <Label
                  htmlFor="className"
                  className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground"
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

              {/* Etapa/turno, professor regente e capacidade fazem parte do wireframe
                  A7, mas o backend ainda não tem esses campos em Class — ver
                  design/handoff/README.md. Adicionar quando o campo existir. */}
              <p className="text-xs text-muted-foreground">
                Etapa/turno, professor regente e capacidade ainda não são suportados pelo
                backend — próxima etapa.
              </p>

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
