"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";
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
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
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
            className="h-9 w-32 text-xs md:h-6 md:w-24"
            placeholder="com farofa"
            autoFocus
          />
          <Button size="sm" className="h-9 px-2 text-xs md:h-6" onClick={handleAdd}>
            OK
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="min-h-9 text-xs text-muted-foreground underline hover:text-foreground md:min-h-0"
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
    <div className="flex flex-col gap-[18px]">
      <EventsNav />

      <CabecalhoDaPagina
        eyebrow={<>Eventos &amp; vendas</>}
        titulo="Produtos do evento"
        apoio="Subproduto = variação sem preço próprio (ex.: com/sem farofa); afeta produção, não o total."
        acoes={
          <Button
            variant="action"
            className="w-full md:w-auto"
            onClick={() => setDialogOpen(true)}
            disabled={!selectedGroupId}
          >
            + Novo produto
          </Button>
        }
      />

      <div className="flex flex-col gap-[5px]">
        <Label className="text-xs text-muted-foreground">Grupo</Label>
        <Select value={selectedGroupId ?? ""} onValueChange={(v) => v && setSelectedGroupId(String(v))}>
          <SelectTrigger className="w-full md:w-64">
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
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os produtos.
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {!isLoading && products?.length === 0 && (
          <EstadoVazio icone={<Inbox />} titulo="Nenhum produto neste grupo." />
        )}
        {products?.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium break-words">{p.nome}</p>
              {p.ativo ? (
                <Badge variant="success">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                {formatCurrency(p.preco)}
              </span>
              <span className="font-mono tabular-nums">
                {p.estoque ?? <span className="font-sans text-muted-foreground">não controlado</span>}
              </span>
            </div>
            <SubProductsCell product={p} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Inbox className="size-[18px]" />
                  </span>
                  <p className="mt-3 font-heading text-[15px] font-semibold">Nenhum produto neste grupo.</p>
                </TableCell>
              </TableRow>
            )}
            {products?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>
                  <SubProductsCell product={p} />
                </TableCell>
                <TableCell className="font-mono text-sm font-semibold tabular-nums">
                  {formatCurrency(p.preco)}
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">
                  {p.estoque ?? <span className="font-sans text-muted-foreground">não controlado</span>}
                </TableCell>
                <TableCell>
                  {p.ativo ? (
                    <Badge variant="success">Ativo</Badge>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
