"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { cn } from "@/lib/utils";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useChecklistTemplates,
  useSaveChecklistTemplate,
  useSetChecklistClasses,
  useDeleteChecklistTemplate,
  useSaveChecklistItem,
  useReorderChecklistItems,
  useDeleteChecklistItem,
  type ChecklistItemTipo,
} from "@/lib/tasks/use-checklists";

const TIPO_LABELS: Record<ChecklistItemTipo, string> = {
  SimNao: "Sim/Não",
  Contagem: "Contagem",
};

export default function ChecklistConfigPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useChecklistTemplates();
  const { data: classes } = useClasses();
  const saveTemplate = useSaveChecklistTemplate();
  const setClasses = useSetChecklistClasses();
  const deleteTemplate = useDeleteChecklistTemplate();
  const saveItem = useSaveChecklistItem();
  const reorder = useReorderChecklistItems();
  const deleteItem = useDeleteChecklistItem();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = templates?.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null && templates && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const [newName, setNewName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemTipo, setNewItemTipo] = useState<ChecklistItemTipo>("SimNao");

  async function handleCreateTemplate() {
    if (!newName.trim()) return;
    try {
      await saveTemplate.mutateAsync({ name: newName.trim() });
      toast.success("Checklist criado.");
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar checklist.");
    }
  }

  async function handleDeleteTemplate(id: number) {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Checklist excluído.");
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function toggleClass(classId: number, currentlyScoped: boolean, currentIds: number[]) {
    if (!selected) return;
    const next = currentlyScoped
      ? currentIds.filter((id) => id !== classId)
      : [...currentIds, classId];
    try {
      await setClasses.mutateAsync({ checklistId: selected.id, classIds: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar turmas.");
    }
  }

  async function handleAddItem() {
    if (!selected || !newItemDesc.trim()) return;
    try {
      await saveItem.mutateAsync({
        checklistTemplateId: selected.id,
        description: newItemDesc.trim(),
        tipo: newItemTipo,
        ativo: true,
      });
      setNewItemDesc("");
      setNewItemTipo("SimNao");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar item.");
    }
  }

  async function toggleItemAtivo(item: NonNullable<typeof selected>["items"][number], ativo: boolean) {
    try {
      await saveItem.mutateAsync({
        id: item.id,
        checklistTemplateId: item.checklistTemplateId,
        description: item.description,
        tipo: item.tipo,
        ativo,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar item.");
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    if (!selected) return;
    const ordered = [...selected.items].sort((a, b) => a.order - b.order);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await reorder.mutateAsync({ checklistId: selected.id, orderedItemIds: ordered.map((i) => i.id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar.");
    }
  }

  async function handleDeleteItem(itemId: number) {
    try {
      await deleteItem.mutateAsync(itemId);
      toast.success("Item removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover item.");
    }
  }

  const scopedClassIds = (selected?.templateClasses ?? []).map((tc) => tc.classId);
  const orderedItems = [...(selected?.items ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Configurar checklists</h1>
          <p className="text-sm text-muted-foreground">
            Itens, turmas atendidas e ordem de cada checklist da sala.
          </p>
        </div>
        {/* Novo (2026-08, feedback do cliente) — antes não tinha como voltar pro
            preenchimento sem sair pelo menu; cada edição aqui já salva na hora
            (mutations individuais), então "voltar" é só navegação mesmo. */}
        <Link
          href="/checklist"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para o preenchimento
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {templates?.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedId === t.id
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="truncate">{t.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{t.items.length}</span>
            </button>
          ))}

          <div className="mt-2 flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do checklist"
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleCreateTemplate} disabled={!newName.trim() || saveTemplate.isPending}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {!selected ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Selecione ou crie um checklist.
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-semibold">{selected.name}</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteTemplate(selected.id)}
              >
                <Trash2 className="size-4" />
                Excluir checklist
              </Button>
            </div>

            <div>
              <Label className="mb-2 block font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Turmas atendidas (nenhuma marcada = todas)
              </Label>
              <div className="flex flex-wrap gap-3">
                {classes?.map((c) => {
                  const scoped = scopedClassIds.includes(c.id!);
                  return (
                    <label key={c.id} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={scoped}
                        onCheckedChange={() => toggleClass(c.id!, scoped, scopedClassIds)}
                      />
                      {c.className}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Itens
              </Label>
              {orderedItems.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum item ainda.</p>
              )}
              {orderedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border-b border-border py-2 last:border-0"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === orderedItems.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>

                  <span className={cn("flex-1 text-sm", !item.ativo && "text-muted-foreground line-through")}>
                    {item.description}
                  </span>

                  <span className="font-mono text-[10px] text-muted-foreground">{TIPO_LABELS[item.tipo]}</span>

                  <Switch checked={item.ativo} onCheckedChange={(v) => toggleItemAtivo(item, v)} />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}

              <div className="mt-2 flex gap-1.5">
                <Input
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Novo item"
                  className="h-8 flex-1 text-sm"
                />
                <Select value={newItemTipo} onValueChange={(v) => v && setNewItemTipo(v as ChecklistItemTipo)}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue>{() => TIPO_LABELS[newItemTipo]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SimNao">Sim/Não</SelectItem>
                    <SelectItem value="Contagem">Contagem</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddItem} disabled={!newItemDesc.trim() || saveItem.isPending}>
                  <Plus className="size-4" />
                  Novo item
                </Button>
              </div>
            </div>

            {/* Novo (2026-08, feedback do cliente) — "não tem a opção de quando
                acabar clicar em salvar e voltar para a parte anterior, tem que sair
                e voltar pra tela". Tudo aqui já foi salvo a cada ação (turma, item,
                ordem, ativo/inativo são mutations imediatas) — este botão não tem o
                que persistir de novo, só leva de volta pro preenchimento. */}
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => router.push("/checklist")}>Salvar e voltar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
