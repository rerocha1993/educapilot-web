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
  useExpensesByMonth,
  useCreateExpense,
  useMarkExpensePaid,
  EXPENSE_CATEGORIES,
  type ExpenseDto,
} from "@/lib/finance/use-expenses";

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
function isOverdue(e: ExpenseDto) {
  return e.statusPagamento === "Pendente" && new Date(e.dataVencimento) < new Date(new Date().toDateString());
}

const EMPTY_FORM = {
  nome: "",
  descricao: "",
  categoria: 2,
  subcategoria: "",
  valor: "",
  dataVencimento: todayIso(),
  centroCusto: "",
};

export default function DespesasPage() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: expenses, isLoading, isError } = useExpensesByMonth(month, year);
  const createExpense = useCreateExpense();
  const markPaid = useMarkExpensePaid();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = expenses ?? [];
  const aPagar = list.filter((e) => e.statusPagamento === "Pendente" && !isOverdue(e));
  const atrasado = list.filter(isOverdue);
  const pagoNoMes = list.filter((e) => e.statusPagamento === "Pago");

  async function handleCreate() {
    const valor = Number(form.valor.replace(",", "."));
    if (!form.nome.trim() || !valor || !form.dataVencimento) return;
    try {
      await createExpense.mutateAsync({
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        categoria: form.categoria,
        subcategoria: form.subcategoria.trim() || undefined,
        valor,
        dataVencimento: form.dataVencimento,
        centroCusto: form.centroCusto.trim() || undefined,
        competenciaMes: new Date(form.dataVencimento).getMonth() + 1,
        competenciaAno: new Date(form.dataVencimento).getFullYear(),
      });
      toast.success("Despesa criada.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar despesa.");
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await markPaid.mutateAsync({ id, dataPagamento: todayIso() });
      toast.success("Pagamento confirmado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Despesas</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Nova despesa</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">A pagar</p>
          <p className="font-mono text-xl font-semibold tabular-nums">
            {formatCurrency(aPagar.reduce((s, e) => s + e.valor, 0))}
          </p>
        </div>
        <div className="rounded-lg border border-destructive-border bg-destructive-soft p-4">
          <p className="text-xs text-destructive-soft-foreground">Atrasado</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-destructive-soft-foreground">
            {formatCurrency(atrasado.reduce((s, e) => s + e.valor, 0))}
          </p>
        </div>
        <div className="rounded-lg border border-success-border bg-success-soft p-4">
          <p className="text-xs text-success-soft-foreground">Pago no mês</p>
          <p className="font-mono text-xl font-semibold tabular-nums text-success-soft-foreground">
            {formatCurrency(pagoNoMes.reduce((s, e) => s + e.valor, 0))}
          </p>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as despesas.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
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
                  Nenhuma despesa neste mês.
                </TableCell>
              </TableRow>
            )}

            {list.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {EXPENSE_CATEGORIES.find((c) => c.value === e.categoria)?.label ?? e.categoria}
                  {e.subcategoria ? ` · ${e.subcategoria}` : ""}
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums">{formatDate(e.dataVencimento)}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{formatCurrency(e.valor)}</TableCell>
                <TableCell>
                  {e.statusPagamento === "Pago" ? (
                    <Badge className="bg-success-soft text-success-soft-foreground">Pago</Badge>
                  ) : isOverdue(e) ? (
                    <Badge className="bg-destructive-soft text-destructive-soft-foreground">Atrasado</Badge>
                  ) : (
                    <Badge variant="secondary">Pendente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {e.statusPagamento !== "Pago" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-success-border text-success-soft-foreground hover:bg-success-soft"
                      onClick={() => handleMarkPaid(e.id)}
                      disabled={markPaid.isPending}
                    >
                      Marcar pago
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* "Importar Excel" existe no backend, mas com layout de coluna fixo e sem
          documentação de formato — fora do escopo desta primeira versão. Comprovante
          (dropzone) também não tem backend de upload. */}
      <p className="text-xs text-muted-foreground">
        Importar Excel e anexo de comprovante ainda não estão nesta tela — o backend
        tem um endpoint de importação com layout de coluna fixo, mas nenhum upload
        de arquivo (comprovante) implementado.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <Input
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => setForm((f) => ({ ...f, dataVencimento: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={String(form.categoria)}
                onValueChange={(v) => v && setForm((f) => ({ ...f, categoria: Number(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => EXPENSE_CATEGORIES.find((c) => c.value === form.categoria)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
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
                value={form.centroCusto}
                onChange={(e) => setForm((f) => ({ ...f, centroCusto: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createExpense.isPending || !form.nome.trim() || !form.valor}>
              {createExpense.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
