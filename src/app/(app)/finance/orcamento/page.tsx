"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { FinanceNav } from "@/components/finance/finance-nav";
import {
  useBudgets,
  useBudgetComparativo,
  useCreateBudget,
  useDeleteBudget,
  RECEITA_CATEGORIES,
  DESPESA_CATEGORIES,
} from "@/lib/finance/use-budgets";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = { tipo: "Despesa" as "Receita" | "Despesa", categoria: "2", mes: "", valorPlanejado: "" };

export default function OrcamentoPage() {
  const now = new Date();
  const [ano] = useState(now.getFullYear());

  const { data: budgets, isLoading: loadingBudgets } = useBudgets(ano);
  const { data: comparativo, isLoading: loadingComparativo, isError } = useBudgetComparativo(ano);
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const categorias = form.tipo === "Receita" ? RECEITA_CATEGORIES : DESPESA_CATEGORIES;

  async function handleCreate() {
    const valor = Number(form.valorPlanejado.replace(",", "."));
    if (!valor) return;
    try {
      await createBudget.mutateAsync({
        ano,
        mes: form.mes ? Number(form.mes) : null,
        tipo: form.tipo,
        categoria: Number(form.categoria),
        valorPlanejado: valor,
      });
      toast.success("Orçamento cadastrado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar orçamento.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBudget.mutateAsync(id);
      toast.success("Orçamento removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover orçamento.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Orçamento {ano}</h1>
          <p className="text-sm text-muted-foreground">
            Planejado x realizado por categoria — realizado é sempre dinheiro que
            efetivamente entrou/saiu (recebido/pago), não o previsto.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Novo orçamento</Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o comparativo.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Planejado</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Variação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingComparativo &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!loadingComparativo && (comparativo ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum orçamento cadastrado pra {ano} ainda.
                </TableCell>
              </TableRow>
            )}

            {comparativo?.map((c) => {
              // Receita: variação negativa é ruim (recebeu menos que o planejado).
              // Despesa: variação positiva é ruim (gastou mais que o planejado).
              const ruim = c.tipo === "Receita" ? c.variacao < 0 : c.variacao > 0;
              return (
                <TableRow key={`${c.tipo}-${c.categoria}`}>
                  <TableCell>
                    <Badge variant={c.tipo === "Receita" ? "default" : "secondary"}>{c.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.categoriaLabel}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(c.planejado)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(c.realizado)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm tabular-nums ${
                      ruim ? "text-destructive-soft-foreground" : "text-success-soft-foreground"
                    }`}
                  >
                    {c.variacao >= 0 ? "+" : ""}
                    {formatCurrency(c.variacao)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Orçamentos cadastrados</p>
        {loadingBudgets && <Skeleton className="h-20 w-full" />}
        {!loadingBudgets && (budgets ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
        )}
        <div className="flex flex-col gap-2">
          {budgets?.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span>
                <Badge variant={b.tipo === "Receita" ? "default" : "secondary"} className="mr-2">
                  {b.tipo}
                </Badge>
                {b.categoriaLabel} · {b.mes ? `${String(b.mes).padStart(2, "0")}/${b.ano}` : `ano ${b.ano} inteiro`} ·{" "}
                {formatCurrency(b.valorPlanejado)}
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(b.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, tipo: v as "Receita" | "Despesa", categoria: v === "Receita" ? "1" : "2" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => form.tipo}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => v && setForm((f) => ({ ...f, categoria: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => categorias.find((c) => String(c.value) === form.categoria)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.value} value={String(c.value)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor planejado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valorPlanejado}
                  onChange={(e) => setForm((f) => ({ ...f, valorPlanejado: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Mês (opcional)</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="Ano inteiro"
                  value={form.mes}
                  onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe o mês em branco pra um orçamento do ano {ano} inteiro. Preenchido,
              vale só pra aquele mês.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createBudget.isPending || !form.valorPlanejado}>
              {createBudget.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
