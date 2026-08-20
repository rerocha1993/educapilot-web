"use client";

import { useState } from "react";
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
import { FinanceNav } from "@/components/finance/finance-nav";
import {
  useRevenuesByMonth,
  useCreateRevenue,
  useMarkRevenueReceived,
  REVENUE_CATEGORIES,
  revenueStatusLabel,
  revenueCategoryLabel,
} from "@/lib/finance/use-revenues";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const STATUS_BADGE: Record<number, string> = {
  1: "bg-warning-soft text-warning-soft-foreground", // Planejado
  2: "bg-success-soft text-success-soft-foreground", // Recebido
  3: "bg-destructive-soft text-destructive-soft-foreground", // Vencido
  4: "bg-accent text-accent-foreground", // Cancelado
};

const EMPTY_FORM = {
  description: "",
  category: 1,
  costCenter: "",
  expectedAmount: "",
  dueDate: todayIso(),
};

export default function ReceitasPage() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: revenues, isLoading, isError } = useRevenuesByMonth(month, year);
  const createRevenue = useCreateRevenue();
  const markReceived = useMarkRevenueReceived();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = revenues ?? [];

  async function handleCreate() {
    const amount = Number(form.expectedAmount.replace(",", "."));
    if (!form.description.trim() || !amount || !form.dueDate) return;
    try {
      await createRevenue.mutateAsync({
        description: form.description.trim(),
        category: form.category,
        costCenter: form.costCenter.trim() || undefined,
        expectedAmount: amount,
        dueDate: form.dueDate,
        competencyMonth: new Date(form.dueDate).getMonth() + 1,
        competencyYear: new Date(form.dueDate).getFullYear(),
      });
      toast.success("Receita criada.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar receita.");
    }
  }

  async function handleMarkReceived(entry: (typeof list)[number]) {
    try {
      await markReceived.mutateAsync(entry);
      toast.success("Recebimento confirmado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar recebimento.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Receitas</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Nova receita</Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as receitas.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Valor previsto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma receita neste mês.
                </TableCell>
              </TableRow>
            )}

            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{revenueCategoryLabel(r.category)}</TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatDate(r.dueDate)}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatCurrency(r.expectedAmount)}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_BADGE[r.status] ?? ""}>{revenueStatusLabel(r.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.status !== 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-success-border text-success-soft-foreground hover:bg-success-soft"
                      onClick={() => handleMarkReceived(r)}
                      disabled={markReceived.isPending}
                    >
                      Marcar recebido
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Importar Excel existe no backend (layout de coluna fixo), mas fora do escopo
        desta primeira versão da tela.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova receita</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor previsto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.expectedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, expectedAmount: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={String(form.category)}
                onValueChange={(v) => v && setForm((f) => ({ ...f, category: Number(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => REVENUE_CATEGORIES.find((c) => c.value === form.category)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={String(c.value)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Centro de custo</Label>
              <Input
                value={form.costCenter}
                onChange={(e) => setForm((f) => ({ ...f, costCenter: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createRevenue.isPending || !form.description.trim() || !form.expectedAmount}
            >
              {createRevenue.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
