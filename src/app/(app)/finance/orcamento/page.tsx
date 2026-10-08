"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Inbox, Upload } from "lucide-react";
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
import { BotaoDeExportar } from "@/components/finance/botao-de-exportar";
import { DialogDeImportacao } from "@/components/finance/dialog-de-importacao";
import { FinanceNav } from "@/components/finance/finance-nav";
import {
  SeletorDeCentroDeCusto,
  SeletorDoPlanoDeContas,
} from "@/components/finance/seletor-do-plano-de-contas";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import {
  useBudgets,
  useBudgetComparativo,
  useCreateBudget,
  useDeleteBudget,
} from "@/lib/finance/use-budgets";
import { exportarOrcamentoDoAno } from "@/lib/finance/use-importacao";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = {
  tipo: "Despesa" as "Receita" | "Despesa",
  categoriaFinanceiraId: "",
  centroDeCustoId: "",
  mes: "",
  valorPlanejado: "",
};

/** O centro de custo, em linha pequena, quando o orçamento é de um centro só. */
function CentroDeCustoDoOrcamento({ nome }: { nome?: string | null }) {
  if (!nome) return null;
  return <span className="block text-xs font-normal text-muted-foreground">Centro de custo: {nome}</span>;
}

export default function OrcamentoPage() {
  const now = new Date();
  const [ano] = useState(now.getFullYear());

  const { data: budgets, isLoading: loadingBudgets } = useBudgets(ano);
  const { data: comparativo, isLoading: loadingComparativo, isError } = useBudgetComparativo(ano);
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleCreate() {
    const valor = Number(form.valorPlanejado.replace(",", "."));
    if (!valor || !form.categoriaFinanceiraId) return;
    try {
      await createBudget.mutateAsync({
        ano,
        mes: form.mes ? Number(form.mes) : null,
        tipo: form.tipo,
        categoriaFinanceiraId: form.categoriaFinanceiraId,
        centroDeCustoId: form.centroDeCustoId || null,
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
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo={
          <>
            Orçamento <span className="font-mono tabular-nums">{ano}</span>
          </>
        }
        apoio="Planejado x realizado por categoria — realizado é sempre dinheiro que efetivamente entrou/saiu (recebido/pago), não o previsto."
        acoes={
          <>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setImportando(true)}>
              <Upload />
              Importar
            </Button>
            <BotaoDeExportar className="flex-1 md:flex-none" onExportar={() => exportarOrcamentoDoAno(ano)} />
            <Button variant="action" className="w-full md:w-auto" onClick={() => setDialogOpen(true)}>
              + Novo orçamento
            </Button>
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o comparativo.
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {loadingComparativo && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

        {!loadingComparativo && (comparativo ?? []).length === 0 && (
          <EstadoVazio
            icone={<Inbox />}
            titulo={
              <>
                Nenhum orçamento cadastrado pra <span className="font-mono tabular-nums">{ano}</span> ainda.
              </>
            }
          />
        )}

        {comparativo?.map((c) => {
          const ruim = c.tipo === "Receita" ? c.variacao < 0 : c.variacao > 0;
          return (
            <div
              key={`${c.tipo}-${c.categoria}-${c.categoriaFinanceiraId ?? ""}-${c.centroDeCustoId ?? ""}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant={c.tipo === "Receita" ? "default" : "secondary"}>{c.tipo}</Badge>
                <span className="min-w-0 font-medium break-words">
                  {c.categoriaLabel}
                  <CentroDeCustoDoOrcamento nome={c.centroDeCustoNome} />
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Planejado</p>
                  <p className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(c.planejado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Realizado</p>
                  <p className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(c.realizado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Variação</p>
                  <p
                    className={`font-mono whitespace-nowrap tabular-nums ${
                      ruim ? "text-destructive-soft-foreground" : "text-success-soft-foreground"
                    }`}
                  >
                    {c.variacao >= 0 ? "+" : ""}
                    {formatCurrency(c.variacao)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Inbox className="size-[18px]" />
                  </span>
                  <p className="mt-3 font-heading text-[15px] font-semibold">
                    Nenhum orçamento cadastrado pra <span className="font-mono tabular-nums">{ano}</span> ainda.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {comparativo?.map((c) => {
              // Receita: variação negativa é ruim (recebeu menos que o planejado).
              // Despesa: variação positiva é ruim (gastou mais que o planejado).
              const ruim = c.tipo === "Receita" ? c.variacao < 0 : c.variacao > 0;
              return (
                <TableRow key={`${c.tipo}-${c.categoria}-${c.categoriaFinanceiraId ?? ""}-${c.centroDeCustoId ?? ""}`}>
                  <TableCell>
                    <Badge variant={c.tipo === "Receita" ? "default" : "secondary"}>{c.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">
                    {c.categoriaLabel}
                    <CentroDeCustoDoOrcamento nome={c.centroDeCustoNome} />
                  </TableCell>
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

      <div className="flex flex-col gap-2.5">
        <h2 className="font-heading text-[15.5px] font-semibold">Orçamentos cadastrados</h2>
        {loadingBudgets && <Skeleton className="h-20 w-full" />}
        {!loadingBudgets && (budgets ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
        )}
        <div className="flex flex-col gap-2">
          {budgets?.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm md:gap-0"
            >
              <span className="min-w-0 break-words">
                <Badge variant={b.tipo === "Receita" ? "default" : "secondary"} className="mr-2">
                  {b.tipo}
                </Badge>
                {b.categoriaLabel}
                {b.centroDeCustoNome && (
                  <span className="text-muted-foreground"> (centro: {b.centroDeCustoNome})</span>
                )}{" "}
                ·{" "}
                {b.mes ? (
                  <span className="font-mono tabular-nums">
                    {String(b.mes).padStart(2, "0")}/{b.ano}
                  </span>
                ) : (
                  <>
                    ano <span className="font-mono tabular-nums">{b.ano}</span> inteiro
                  </>
                )}{" "}
                · <span className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(b.valorPlanejado)}</span>
              </span>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(b.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {importando && <DialogDeImportacao tipo="orcamento" onFechar={() => setImportando(false)} />}

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
                  v &&
                  setForm((f) => ({
                    ...f,
                    tipo: v as "Receita" | "Despesa",
                    // A categoria é de um tipo só: trocar o tipo limpa a escolha.
                    categoriaFinanceiraId: v === f.tipo ? f.categoriaFinanceiraId : "",
                  }))
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
            <SeletorDoPlanoDeContas
              tipo={form.tipo}
              valor={form.categoriaFinanceiraId}
              onChange={(id) => setForm((f) => ({ ...f, categoriaFinanceiraId: id }))}
            />
            <SeletorDeCentroDeCusto
              valor={form.centroDeCustoId}
              onChange={(id) => setForm((f) => ({ ...f, centroDeCustoId: id }))}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Button
              onClick={handleCreate}
              disabled={createBudget.isPending || !form.valorPlanejado || !form.categoriaFinanceiraId}
            >
              {createBudget.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
