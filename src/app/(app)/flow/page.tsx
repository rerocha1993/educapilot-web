"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForms, useCreateForm } from "@/lib/flow/use-forms";

const STATUS_BADGE: Record<string, string> = {
  Rascunho: "bg-accent text-accent-foreground",
  Ativo: "bg-success-soft text-success-soft-foreground",
  Arquivado: "bg-muted text-muted-foreground",
};

export default function FormulariosPage() {
  const { data: forms, isLoading, isError } = useForms();
  const createForm = useCreateForm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function handleCreate() {
    if (!nome.trim()) return;
    try {
      const created = await createForm.mutateAsync({ nome: nome.trim(), descricao: descricao.trim() });
      toast.success("Formulário criado.");
      setDialogOpen(false);
      setNome("");
      setDescricao("");
      window.location.href = `/flow/${created.id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar formulário.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Formulários</h1>
          <p className="text-sm text-muted-foreground">Construtor de formulários dinâmicos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/flow/referencias" className={buttonVariants({ variant: "outline" })}>
            Dados de referência
          </Link>
          <Button onClick={() => setDialogOpen(true)}>+ Novo formulário</Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os formulários.
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && forms?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum formulário criado ainda.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {forms?.map((form) => (
          <Link
            key={form.id}
            href={`/flow/${form.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div>
              <p className="font-medium">{form.nome}</p>
              {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {form.campos?.length ?? 0} campo{form.campos?.length === 1 ? "" : "s"}
              </span>
              <Badge className={STATUS_BADGE[form.status] ?? ""}>{form.status}</Badge>
            </div>
          </Link>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo formulário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Autorização de saída antecipada" />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createForm.isPending || !nome.trim()}>
              {createForm.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
