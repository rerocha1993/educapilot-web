"use client";

import { useState } from "react";
import { Search, Package, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
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

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Materiais"
        apoio="Cadastro geral e controle de estoque da escola."
        acoes={
          // Único botão laranja da tela: é a decisão a tomar aqui.
          <Button variant="action" className="w-full md:w-auto" onClick={openCreate}>
            + Novo material
          </Button>
        }
      />

      <div className="relative w-full md:w-72">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-8 md:h-9"
        />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os materiais.
        </div>
      )}

      {/* O botão roxo só aparece quando o cadastro está realmente vazio (na busca
          sem resultado não há ação a oferecer). */}
      {!isLoading && filtered.length === 0 ? (
        <EstadoVazio
          icone={<Package />}
          titulo={
            materials?.length === 0 ? "Nenhum material cadastrado ainda." : "Nenhum material encontrado."
          }
          acao={materials?.length === 0 ? <Button onClick={openCreate}>+ Novo material</Button> : undefined}
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {filtered.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:flex-nowrap"
          >
            <button
              onClick={() => openEdit(m)}
              className="flex w-full flex-none items-center gap-3 text-left md:w-auto md:flex-1"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Package className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{m.name}</p>
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
              <span className="w-10 text-center font-numeric text-sm">
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
              className="ml-auto text-destructive hover:text-destructive md:ml-0"
              onClick={() => handleDelete(m.id)}
              disabled={deleteMaterial.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Nome
              </span>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Papel sulfite A4"
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Categoria
              </span>
              <Input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Ex.: Papelaria, Limpeza, Pedagógico..."
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Quantidade em estoque
              </span>
              <Input
                type="number"
                min={0}
                className="font-numeric"
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
