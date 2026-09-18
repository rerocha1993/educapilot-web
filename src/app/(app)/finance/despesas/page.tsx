"use client";

import { useState } from "react";
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
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import {
  useExpensesByMonth,
  useCreateExpense,
  useMarkExpensePaid,
  EXPENSE_CATEGORIES,
  type ExpenseDto,
} from "@/lib/finance/use-expenses";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
// Vencimento é só-data: comparar strings "yyyy-MM-dd" evita que new Date() (UTC)
// marque como atrasada uma conta que vence hoje.
function isOverdue(e: ExpenseDto) {
  return e.statusPagamento === "Pendente" && e.dataVencimento.slice(0, 10) < hojeIsoBrasilia();
}

const EMPTY_FORM = {
  nome: "",
  descricao: "",
  categoria: 2,
  subcategoria: "",
  valor: "",
  dataVencimento: hojeIsoBrasilia(),
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
        // Pela string: new Date("yyyy-MM-dd") é UTC e cai no mês anterior no dia 1º.
        competenciaMes: competenciaDeIso(form.dataVencimento).mes,
        competenciaAno: competenciaDeIso(form.dataVencimento).ano,
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
      await markPaid.mutateAsync({ id, dataPagamento: hojeIsoBrasilia() });
      toast.success("Pagamento confirmado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Despesas"
        apoio={
          <span className="font-mono tabular-nums">
            {new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        }
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setDialogOpen(true)}>
            Nova despesa
          </Button>
        }
      />

      {/* Estatística do guia: rótulo pequeno, número grande em mono, contagem em cinza ao lado. */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">A pagar</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
            {formatCurrency(aPagar.reduce((s, e) => s + e.valor, 0))}
          </p>
          <p className="mt-2 font-mono text-[11.5px] tabular-nums text-muted-foreground">
            {aPagar.length} conta(s)
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Atrasado</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-destructive-soft-foreground">
            {formatCurrency(atrasado.reduce((s, e) => s + e.valor, 0))}
          </p>
          <p className="mt-2 font-mono text-[11.5px] tabular-nums text-muted-foreground">
            {atrasado.length} conta(s)
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <p className="text-[12.5px] font-medium text-muted-foreground">Pago no mês</p>
          <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-success-soft-foreground">
            {formatCurrency(pagoNoMes.reduce((s, e) => s + e.valor, 0))}
          </p>
          <p className="mt-2 font-mono text-[11.5px] tabular-nums text-muted-foreground">
            {pagoNoMes.length} conta(s)
          </p>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as despesas.
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

        {!isLoading && list.length === 0 && (
          <EstadoVazio icone={<Inbox />} titulo="Nenhuma despesa neste mês." />
        )}

        {list.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{e.nome}</p>
                <p className="text-muted-foreground break-words">
                  {EXPENSE_CATEGORIES.find((c) => c.value === e.categoria)?.label ?? e.categoria}
                  {e.subcategoria ? ` · ${e.subcategoria}` : ""}
                </p>
              </div>
              {e.statusPagamento === "Pago" ? (
                <Badge variant="success">Pago</Badge>
              ) : isOverdue(e) ? (
                <Badge variant="overdue">Atrasado</Badge>
              ) : (
                <Badge variant="pending">Pendente</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums text-muted-foreground">{formatarSoData(e.dataVencimento)}</span>
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCurrency(e.valor)}</span>
            </div>
            {e.statusPagamento !== "Pago" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleMarkPaid(e.id)}
                disabled={markPaid.isPending}
              >
                Marcar pago
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Inbox className="size-[18px]" />
                  </span>
                  <p className="mt-3 font-heading text-[15px] font-semibold">Nenhuma despesa neste mês.</p>
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
                <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                  {formatarSoData(e.dataVencimento)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                  {formatCurrency(e.valor)}
                </TableCell>
                <TableCell>
                  {e.statusPagamento === "Pago" ? (
                    <Badge variant="success">Pago</Badge>
                  ) : isOverdue(e) ? (
                    <Badge variant="overdue">Atrasado</Badge>
                  ) : (
                    <Badge variant="pending">Pendente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {e.statusPagamento !== "Pago" && (
                    <Button
                      variant="outline"
                      size="sm"
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
