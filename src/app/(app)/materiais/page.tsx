"use client";

import { useState } from "react";
import { Search, Package, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import {
  useMaterials,
  useSaveMaterial,
  useDeleteMaterial,
  type MaterialDto,
  type SaveMaterialInput,
} from "@/lib/tasks/use-materials";

// Reestruturado (2026-09, feedback do cliente): "essa tela é desnecessaria por que
// nem da para criar material [...] pode ser como popup". A tela era literalmente
// somente leitura (badge "Somente leitura" removido) — o backend só tinha
// GetAllMaterialsAsync, nenhum jeito de criar/editar/excluir. Virou um cadastro
// geral + controle de quantidade de verdade (popup pra criar/editar, +/- rápido de
// estoque, exclusão). Cruzar com o que a professora pede no planejamento semanal
// fica pra depois — o planejamento ainda não tem modelo (R12), não dá pra cruzar
// com algo que não existe ainda.

const EMPTY_FORM: SaveMaterialInput = { name: "", type: "", availableQuantity: 0 };

export default function MateriaisPage() {
  const { data: materials, isLoading, isError } = useMaterials();
  const saveMaterial = useSaveMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SaveMaterialInput>(EMPTY_FORM);

  const filtered = (materials ?? []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(m: MaterialDto) {
    setForm({ id: m.id, name: m.name, type: m.type, availableQuantity: m.availableQuantity });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await saveMaterial.mutateAsync({
        ...form,
        name: form.name.trim(),
        type: form.type.trim(),
      });
      toast.success(form.id ? "Material atualizado." : "Material cadastrado.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar material.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMaterial.mutateAsync(id);
      toast.success("Material excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir material.");
    }
  }

  // +/- rápido direto na lista, sem abrir o popup — pro dia a dia de "chegou uma
  // caixa" / "acabou o estoque".
  async function adjustQuantity(m: MaterialDto, delta: number) {
    const next = Math.max(0, m.availableQuantity + delta);
    try {
      await saveMaterial.mutateAsync({ id: m.id, name: m.name, type: m.type, availableQuantity: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ajustar quantidade.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">Materiais</h1>
          <p className="text-sm text-muted-foreground">Cadastro geral e controle de estoque da escola.</p>
        </div>
        <Button onClick={openCreate}>+ Novo material</Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os materiais.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {materials?.length === 0 ? "Nenhum material cadastrado ainda." : "Nenhum material encontrado."}
          </p>
        )}

        {filtered.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <button
              onClick={() => openEdit(m)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Package className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                {m.type && <p className="text-xs text-muted-foreground">{m.type}</p>}
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => adjustQuantity(m, -1)}
                disabled={saveMaterial.isPending || m.availableQuantity === 0}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="w-10 text-center font-mono text-sm tabular-nums">
                {m.availableQuantity}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => adjustQuantity(m, 1)}
                disabled={saveMaterial.isPending}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(m.id)}
              disabled={deleteMaterial.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Nome
              </span>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Papel sulfite A4"
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Categoria
              </span>
              <Input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Ex.: Papelaria, Limpeza, Pedagógico..."
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Quantidade em estoque
              </span>
              <Input
                type="number"
                min={0}
                value={form.availableQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableQuantity: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMaterial.isPending || !form.name.trim()}>
              {saveMaterial.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
