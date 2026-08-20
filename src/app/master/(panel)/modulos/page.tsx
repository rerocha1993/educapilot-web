"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModuleCatalog, useCreateModule, useDeleteModule } from "@/lib/master/use-modules";

const EMPTY_FORM = { slug: "", displayName: "", description: "", monthlyPrice: "" };

export default function ModuleCatalogPage() {
  const { data: modules, isLoading, isError } = useModuleCatalog();
  const createModule = useCreateModule();
  const deleteModule = useDeleteModule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleCreate() {
    if (!form.slug.trim() || !form.displayName.trim()) return;
    try {
      await createModule.mutateAsync({
        slug: form.slug.trim(),
        displayName: form.displayName.trim(),
        description: form.description.trim() || undefined,
        monthlyPrice: Number(form.monthlyPrice.replace(",", ".")) || 0,
      });
      toast.success("Módulo criado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar módulo.");
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deleteModule.mutateAsync(id);
      toast.success("Módulo desativado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desativar módulo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Kernel · catálogo de módulos</h1>
          <p className="text-sm text-muted-foreground">
            O que existe no sistema — não confundir com o que uma escola contratou
            (ver Módulos por escola).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Novo módulo</Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o catálogo.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {modules?.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm text-primary">{m.slug}</TableCell>
                <TableCell className="font-medium">{m.displayName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.description}</TableCell>
                <TableCell>
                  {m.isActive ? (
                    <Badge className="bg-success-soft text-success-soft-foreground">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {m.isActive && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(m.id)}>
                      Desativar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Versão e Depende (colunas do wireframe) não existem no backend — Module só tem
        chave/nome/descrição/preço/status.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo módulo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Chave (slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="events"
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Preço mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createModule.isPending || !form.slug.trim() || !form.displayName.trim()}
            >
              {createModule.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
