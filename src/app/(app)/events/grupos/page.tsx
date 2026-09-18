"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventsNav } from "@/components/events/events-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { useSalesGroups, useSaveSalesGroup, useDeleteSalesGroup } from "@/lib/events/use-sales-groups";
import { useAllProducts } from "@/lib/events/use-products";
import { useOrders } from "@/lib/events/use-orders";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = { nome: "", meta: "", responsavel: "" };

export default function SalesGroupsPage() {
  const { data: groups, isLoading, isError } = useSalesGroups();
  const { data: products } = useAllProducts();
  const { data: orders } = useOrders();
  const saveSalesGroup = useSaveSalesGroup();
  const deleteSalesGroup = useDeleteSalesGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const productGroupMap = new Map((products ?? []).map((p) => [p.id, p.salesGroupId]));
  const productPriceMap = new Map((products ?? []).map((p) => [p.id, p.preco]));
  const pedidosPagos = (orders ?? []).filter((o) => o.statusPayment === 2);

  function arrecadadoDoGrupo(groupId: string) {
    return pedidosPagos.reduce((sum, order) => {
      const orderGroupTotal = order.produtos
        .filter((item) => productGroupMap.get(item.productId) === groupId)
        .reduce((s, item) => s + (productPriceMap.get(item.productId) ?? 0) * item.quantidade, 0);
      return sum + orderGroupTotal;
    }, 0);
  }

  async function handleCreate() {
    if (!form.nome.trim()) return;
    try {
      await saveSalesGroup.mutateAsync({
        nome: form.nome.trim(),
        meta: form.meta ? Number(form.meta.replace(",", ".")) : undefined,
        responsavel: form.responsavel.trim() || undefined,
      });
      toast.success("Grupo criado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar grupo.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSalesGroup.mutateAsync(id);
      toast.success("Grupo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover grupo.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <EventsNav />

      <CabecalhoDaPagina
        eyebrow={<>Eventos &amp; vendas</>}
        titulo="Grupos de venda"
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setDialogOpen(true)}>
            + Novo grupo
          </Button>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os grupos.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups?.map((g) => {
          const arrecadado = arrecadadoDoGrupo(g.id);
          const pct = g.meta && g.meta > 0 ? Math.min(100, Math.round((arrecadado / g.meta) * 100)) : null;
          return (
            <div key={g.id} className="rounded-xl border border-border bg-card p-[18px]">
              <div className="flex items-start justify-between">
                <div className="min-w-0 break-words">
                  <p className="font-heading text-[15.5px] font-semibold">{g.nome}</p>
                  {g.meta && (
                    <p className="text-xs text-muted-foreground">
                      meta <span className="font-mono tabular-nums">{formatCurrency(g.meta)}</span>
                    </p>
                  )}
                  {g.responsavel && (
                    <p className="text-xs text-muted-foreground">Responsável: {g.responsavel}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(g.id)}
                  disabled={deleteSalesGroup.isPending}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              {/* Barra fina de 6px do guia — laranja quando ainda falta muito pra meta. */}
              {pct !== null && (
                <Progress
                  value={pct}
                  className={cn(
                    "mt-3.5 [&>[data-slot=progress-track]]:h-1.5",
                    pct < 50 && "[&_[data-slot=progress-indicator]]:bg-action"
                  )}
                />
              )}
              <p className="mt-2.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{formatCurrency(arrecadado)}</span>
                {g.meta ? (
                  <>
                    {" arrecadado · "}
                    <span className="font-mono tabular-nums">{pct}%</span> da meta
                  </>
                ) : (
                  " arrecadado"
                )}
              </p>
            </div>
          );
        })}
        {!isLoading && groups?.length === 0 && (
          <EstadoVazio
            icone={<Inbox />}
            titulo="Nenhum grupo de venda ainda."
            className="col-span-full"
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo grupo de venda</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Meta de arrecadação (R$, opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.meta}
                onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Responsável (opcional)</Label>
              <Input
                value={form.responsavel}
                onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saveSalesGroup.isPending || !form.nome.trim()}>
              {saveSalesGroup.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
