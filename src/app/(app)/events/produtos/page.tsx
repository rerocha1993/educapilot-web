"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventsNav } from "@/components/events/events-nav";
import { useSalesGroups } from "@/lib/events/use-sales-groups";
import {
  useProductsByGroup,
  useSaveProduct,
  useSubProducts,
  useSaveSubProduct,
  type ProductEventDto,
} from "@/lib/events/use-products";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = { nome: "", preco: "", estoque: "" };

function SubProductsCell({ product }: { product: ProductEventDto }) {
  const { data: subProducts } = useSubProducts(product.id);
  const saveSubProduct = useSaveSubProduct();
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");

  async function handleAdd() {
    if (!nome.trim()) return;
    try {
      await saveSubProduct.mutateAsync({ nome: nome.trim(), productId: product.id, ativo: true });
      setNome("");
      setAdding(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar subproduto.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {subProducts?.map((sp) => (
        <Badge key={sp.id} variant="secondary">
          {sp.nome}
        </Badge>
      ))}
      {adding ? (
        <div className="flex items-center gap-1">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-6 w-24 text-xs"
            placeholder="com farofa"
            autoFocus
          />
          <Button size="sm" className="h-6 px-2 text-xs" onClick={handleAdd}>
            OK
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          + variação
        </button>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const { data: groups } = useSalesGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroupId === null && groups && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const { data: products, isLoading, isError } = useProductsByGroup(selectedGroupId ?? undefined);
  const saveProduct = useSaveProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleCreate() {
    if (!form.nome.trim() || !form.preco || !selectedGroupId) return;
    try {
      await saveProduct.mutateAsync({
        nome: form.nome.trim(),
        preco: Number(form.preco.replace(",", ".")),
        salesGroupId: selectedGroupId,
        ativo: true,
        estoque: form.estoque ? Number(form.estoque) : undefined,
      });
      toast.success("Produto criado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar produto.");
    }
  }

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  return (
    <div className="flex flex-col gap-4">
      <EventsNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Produtos do evento</h1>
          <p className="text-sm text-muted-foreground">
            Subproduto = variação sem preço próprio (ex.: com/sem farofa); afeta
            produção, não o total.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!selectedGroupId}>
          + Novo produto
        </Button>
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label className="text-xs text-muted-foreground">Grupo</Label>
        <Select value={selectedGroupId ?? ""} onValueChange={(v) => v && setSelectedGroupId(String(v))}>
          <SelectTrigger className="w-64">
            <SelectValue>{() => selectedGroup?.nome ?? "Selecione um grupo"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os produtos.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Subprodutos</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && products?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto neste grupo.
                </TableCell>
              </TableRow>
            )}
            {products?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>
                  <SubProductsCell product={p} />
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatCurrency(p.preco)}</TableCell>
                <TableCell className="font-mono text-sm tabular-nums">
                  {p.estoque ?? <span className="text-muted-foreground">não controlado</span>}
                </TableCell>
                <TableCell>
                  {p.ativo ? (
                    <Badge className="bg-success-soft text-success-soft-foreground">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo produto {selectedGroup ? `· ${selectedGroup.nome}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Preço</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Estoque (opcional)</Label>
                <Input
                  type="number"
                  value={form.estoque}
                  onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saveProduct.isPending || !form.nome.trim() || !form.preco}>
              {saveProduct.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
