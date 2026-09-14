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
import { Copy, Trash2 } from "lucide-react";
import {
  useForms,
  useCreateForm,
  useDuplicateForm,
  useDeleteForm,
  useUpdateForm,
  type FormDto,
} from "@/lib/flow/use-forms";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

const STATUS_BADGE: Record<string, string> = {
  Rascunho: "bg-accent text-accent-foreground",
  Ativo: "bg-success-soft text-success-soft-foreground",
  Arquivado: "bg-muted text-muted-foreground",
};

export default function FormulariosPage() {
  const { data: forms, isLoading, isError } = useForms();
  const { data: meuAcesso } = useMeuAcesso();
  const createForm = useCreateForm();
  const duplicateForm = useDuplicateForm();

  const [duplicando, setDuplicando] = useState<{ id: string; nome: string } | null>(null);
  const [nomeCopia, setNomeCopia] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const deleteForm = useDeleteForm();
  const updateForm = useUpdateForm();
  const [excluindo, setExcluindo] = useState<FormDto | null>(null);
  // Motivo da recusa do servidor (formulário com envios). Com ele na tela, o botão vira "Arquivar".
  const [recusa, setRecusa] = useState<string | null>(null);

  function fecharExclusao() {
    setExcluindo(null);
    setRecusa(null);
  }

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await deleteForm.mutateAsync(excluindo.id);
      toast.success(`"${excluindo.nome}" excluído.`);
      fecharExclusao();
    } catch (err) {
      setRecusa(err instanceof Error ? err.message : "Não foi possível excluir o formulário.");
    }
  }

  async function handleArquivar() {
    if (!excluindo) return;
    try {
      await updateForm.mutateAsync({ ...excluindo, status: "Arquivado" });
      toast.success(`"${excluindo.nome}" arquivado.`);
      fecharExclusao();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar o formulário.");
    }
  }

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

  async function handleDuplicar() {
    if (!duplicando) return;
    try {
      const copia = await duplicateForm.mutateAsync({
        id: duplicando.id,
        nome: nomeCopia.trim() || undefined,
      });
      toast.success(`"${copia.nome}" criado como rascunho.`);
      setDuplicando(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar o formulário.");
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
          {/* Cada botão é uma área da permissão: quem não tem "Caixa de envios" não vê o botão. */}
          {podeVerRota(meuAcesso, "/flow/respostas") && (
            <Link href="/flow/respostas" className={buttonVariants({ variant: "outline" })}>
              Caixa de envios
            </Link>
          )}
          {podeVerRota(meuAcesso, "/flow/contratos") && (
            <Link href="/flow/contratos" className={buttonVariants({ variant: "outline" })}>
              Contratos
            </Link>
          )}
          {podeVerRota(meuAcesso, "/flow/referencias") && (
            <Link href="/flow/referencias" className={buttonVariants({ variant: "outline" })}>
              Dados de referência
            </Link>
          )}
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
              <div className="flex items-center gap-2">
                <p className="font-medium">{form.nome}</p>
                <TagDoTipo tipo={tipoDoFormulario(form)} />
              </div>
              {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {form.campos?.length ?? 0} campo{form.campos?.length === 1 ? "" : "s"}
              </span>
              <Badge className={STATUS_BADGE[form.status] ?? ""}>{form.status}</Badge>
              {/* O card inteiro é um link: sem preventDefault, duplicar navegaria para o
                  formulário de origem no mesmo clique. */}
              <Button
                variant="ghost"
                size="icon-sm"
                title="Duplicar"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDuplicando({ id: form.id!, nome: form.nome });
                  setNomeCopia(`${form.nome} (cópia)`);
                }}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Excluir"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRecusa(null);
                  setExcluindo(form);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <Dialog open={!!excluindo} onOpenChange={(open) => !open && fecharExclusao()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir formulário</DialogTitle>
          </DialogHeader>
          {recusa ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                {recusa}
              </div>
              <p className="text-sm text-muted-foreground">
                Arquivar tira o formulário de uso: o link para de aceitar envios, e as respostas e os
                contratos continuam guardados.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Excluir <strong>{excluindo?.nome}</strong> apaga os campos e as automações dele. Não dá
              para desfazer.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={fecharExclusao}>
              Cancelar
            </Button>
            {recusa ? (
              excluindo?.status !== "Arquivado" && (
                <Button onClick={handleArquivar} disabled={updateForm.isPending}>
                  {updateForm.isPending ? "Arquivando..." : "Arquivar"}
                </Button>
              )
            ) : (
              <Button variant="destructive" onClick={handleExcluir} disabled={deleteForm.isPending}>
                {deleteForm.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicando} onOpenChange={(open) => !open && setDuplicando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar formulário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Copia todos os campos de <strong>{duplicando?.nome}</strong>, inclusive o contrato e as
              configurações. A cópia nasce como rascunho, com link próprio, e as respostas ficam com
              o formulário original.
            </p>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome da cópia</Label>
              <Input value={nomeCopia} onChange={(e) => setNomeCopia(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicando(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicar} disabled={duplicateForm.isPending}>
              {duplicateForm.isPending ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
