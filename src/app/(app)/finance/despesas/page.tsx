"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BotaoDeExportar } from "@/components/finance/botao-de-exportar";
import { ComprovanteDaDespesa } from "@/components/finance/comprovante-da-despesa";
import { DialogDeDespesa } from "@/components/finance/dialog-de-despesa";
import { DialogDeEscopoDaSerie } from "@/components/finance/dialog-de-escopo-da-serie";
import { DialogDeImportacao } from "@/components/finance/dialog-de-importacao";
import { DialogRegistrarPagamento } from "@/components/finance/dialogs-de-baixa";
import { FinanceNav } from "@/components/finance/finance-nav";
import { ResumoDoPagamento } from "@/components/finance/resumo-do-pagamento";
import { SeletorDeMes } from "@/components/finance/seletor-de-mes";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Confirmacao } from "@/components/rh/confirmacao";
import {
  useExpensesByMonth,
  useDeleteExpense,
  useReabrirDespesa,
  EXPENSE_CATEGORIES,
  ehParcelaDeSerie,
  type EscopoDaSerie,
  type ExpenseDto,
} from "@/lib/finance/use-expenses";
import { exportarLancamentosDoMes } from "@/lib/finance/use-importacao";
import { situacaoDoServidor } from "@/lib/finance/diferenca-do-pagamento";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function estaPaga(e: ExpenseDto) {
  return e.statusPagamento === "Pago";
}
// Vencimento é só-data: comparar strings "yyyy-MM-dd" evita que new Date() (UTC)
// marque como atrasada uma conta que vence hoje. Reabrir uma conta atrasada a devolve como
// "Vencido", por isso vale tudo o que não está pago.
function isOverdue(e: ExpenseDto) {
  return !estaPaga(e) && e.dataVencimento.slice(0, 10) < hojeIsoBrasilia();
}

type Dialogo =
  | { tipo: "nova" }
  | { tipo: "importar" }
  | { tipo: "editar"; despesa: ExpenseDto }
  | { tipo: "pagar"; despesa: ExpenseDto }
  | { tipo: "reabrir"; despesa: ExpenseDto }
  | { tipo: "excluir"; despesa: ExpenseDto };

/** "3/12": a parcela da série, discreta, ao lado do nome. */
function EtiquetaDaParcela({ e }: { e: ExpenseDto }) {
  if (!ehParcelaDeSerie(e)) return null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 font-mono tabular-nums"
      title={`Parcela ${e.numeroDaParcela} de ${e.totalDeParcelas}`}
      aria-label={`Parcela ${e.numeroDaParcela} de ${e.totalDeParcelas}`}
    >
      {e.numeroDaParcela}/{e.totalDeParcelas}
    </Badge>
  );
}

function SituacaoDaDespesa({ e }: { e: ExpenseDto }) {
  return estaPaga(e) ? (
    <Badge variant="success">Pago</Badge>
  ) : isOverdue(e) ? (
    <Badge variant="overdue">Atrasado</Badge>
  ) : (
    <Badge variant="pending">Pendente</Badge>
  );
}

/** O que foi pago de fato, a diferença e a situação (no dia, antecipado, atrasado). */
function PagamentoDaDespesa({ e }: { e: ExpenseDto }) {
  if (!estaPaga(e)) return null;
  return (
    <ResumoDoPagamento
      valor={e.valor}
      valorPago={e.valorPago ?? e.valor}
      juros={e.juros}
      multa={e.multa}
      desconto={e.desconto}
      situacao={situacaoDoServidor(e.situacaoDoPagamento, e.diasDeAtraso)}
      sempreComValorPago
    />
  );
}

/** Reabrir (se paga), editar e excluir (se em aberto). Com texto no celular, só ícone na tabela. */
function AcoesDaDespesa({
  e,
  comTexto,
  onDialogo,
}: {
  e: ExpenseDto;
  comTexto: boolean;
  onDialogo: (d: Dialogo) => void;
}) {
  const acoes: { chave: string; rotulo: string; icone: React.ReactNode; perigo?: boolean; dialogo: Dialogo }[] = [];
  if (estaPaga(e)) {
    acoes.push({ chave: "reabrir", rotulo: "Reabrir", icone: <RotateCcw />, dialogo: { tipo: "reabrir", despesa: e } });
  }
  acoes.push({ chave: "editar", rotulo: "Editar", icone: <Pencil />, dialogo: { tipo: "editar", despesa: e } });
  if (!estaPaga(e)) {
    acoes.push({
      chave: "excluir",
      rotulo: "Excluir",
      icone: <Trash2 />,
      perigo: true,
      dialogo: { tipo: "excluir", despesa: e },
    });
  }

  return (
    <>
      {acoes.map((a) =>
        comTexto ? (
          <Button
            key={a.chave}
            variant={a.perigo ? "destructive" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onDialogo(a.dialogo)}
          >
            {a.icone}
            {a.rotulo}
          </Button>
        ) : (
          <Button
            key={a.chave}
            variant={a.perigo ? "destructive" : "ghost"}
            size="icon-sm"
            aria-label={`${a.rotulo}: ${e.nome}`}
            title={a.rotulo}
            onClick={() => onDialogo(a.dialogo)}
          >
            {a.icone}
          </Button>
        )
      )}
    </>
  );
}

export default function DespesasPage() {
  const now = new Date();
  const [{ mes: month, ano: year }, setPeriodo] = useState({ mes: now.getMonth() + 1, ano: now.getFullYear() });

  const { data: expenses, isLoading, isError } = useExpensesByMonth(month, year);
  const excluir = useDeleteExpense();
  const reabrir = useReabrirDespesa();

  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const list = expenses ?? [];
  const aPagar = list.filter((e) => !estaPaga(e) && !isOverdue(e));
  const atrasado = list.filter(isOverdue);
  const pagoNoMes = list.filter(estaPaga);

  function fechar() {
    setDialogo(null);
  }

  async function handleExcluir(e: ExpenseDto, escopo: EscopoDaSerie) {
    try {
      const r = await excluir.mutateAsync({ id: e.id, escopo });
      const n = r?.excluidas ?? 1;
      toast.success(n > 1 ? `${n} despesas excluídas.` : "Despesa excluída.");
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a despesa.");
    }
  }

  async function handleReabrir(e: ExpenseDto) {
    try {
      await reabrir.mutateAsync(e.id);
      toast.success("Despesa reaberta. Ela voltou para as contas a pagar.");
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reabrir a despesa.");
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
          <>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setDialogo({ tipo: "importar" })}>
              <Upload />
              Importar
            </Button>
            <BotaoDeExportar
              className="flex-1 md:flex-none"
              onExportar={() => exportarLancamentosDoMes("despesas", month, year)}
            />
            <Button variant="action" className="w-full md:w-auto" onClick={() => setDialogo({ tipo: "nova" })}>
              Nova despesa
            </Button>
          </>
        }
      />

      <SeletorDeMes valor={{ mes: month, ano: year }} onChange={(v) => setPeriodo(v)} />

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
            {/* O que de fato saiu da conta, com juros, multa e desconto. */}
            {formatCurrency(pagoNoMes.reduce((s, e) => s + (e.valorPago ?? e.valor), 0))}
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
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium break-words">
                  {e.nome}
                  <EtiquetaDaParcela e={e} />
                </p>
                <p className="text-muted-foreground break-words">
                  {EXPENSE_CATEGORIES.find((c) => c.value === e.categoria)?.label ?? e.categoria}
                  {e.subcategoria ? ` · ${e.subcategoria}` : ""}
                </p>
              </div>
              <SituacaoDaDespesa e={e} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums text-muted-foreground">{formatarSoData(e.dataVencimento)}</span>
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCurrency(e.valor)}</span>
            </div>
            <PagamentoDaDespesa e={e} />
            {!estaPaga(e) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setDialogo({ tipo: "pagar", despesa: e })}
              >
                Registrar pagamento
              </Button>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <AcoesDaDespesa e={e} comTexto onDialogo={setDialogo} />
            </div>
            <ComprovanteDaDespesa
              despesaId={e.id}
              nome={e.nome}
              temComprovante={!!e.temComprovante}
              className="flex flex-wrap items-center gap-2 [&>button]:flex-1"
            />
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
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell className="font-medium whitespace-normal">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {e.nome}
                    <EtiquetaDaParcela e={e} />
                  </span>
                </TableCell>
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
                <TableCell className="whitespace-normal">
                  <div className="grid gap-1">
                    <SituacaoDaDespesa e={e} />
                    <PagamentoDaDespesa e={e} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <ComprovanteDaDespesa
                      despesaId={e.id}
                      nome={e.nome}
                      temComprovante={!!e.temComprovante}
                      compacto
                      className="flex items-center gap-1.5"
                    />
                    {!estaPaga(e) && (
                      <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: "pagar", despesa: e })}>
                        Registrar pagamento
                      </Button>
                    )}
                    <AcoesDaDespesa e={e} comTexto={false} onDialogo={setDialogo} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* O comprovante se anexa em cada despesa (clipe) e chega também pela Caixa de comprovantes. */}
      <p className="text-xs text-muted-foreground">
        Mandou a foto de um comprovante pelo WhatsApp?{" "}
        <Link href="/finance/comprovantes" className="underline">
          Ele está na Caixa de comprovantes
        </Link>
        , pronto para virar despesa.
      </p>

      {dialogo?.tipo === "importar" && <DialogDeImportacao tipo="despesas" onFechar={fechar} />}
      {dialogo?.tipo === "nova" && <DialogDeDespesa despesa={null} onFechar={fechar} />}
      {dialogo?.tipo === "editar" && <DialogDeDespesa despesa={dialogo.despesa} onFechar={fechar} />}
      {dialogo?.tipo === "pagar" && <DialogRegistrarPagamento despesa={dialogo.despesa} onFechar={fechar} />}

      {dialogo?.tipo === "reabrir" && (
        <Confirmacao
          titulo="Reabrir esta despesa?"
          descricao={`${dialogo.despesa.nome} volta para as contas a pagar e o pagamento registrado (data, valor pago, juros, multa e desconto) é apagado. Depois você pode registrar o pagamento de novo.`}
          rotuloConfirmar="Reabrir despesa"
          pendente={reabrir.isPending}
          onConfirmar={() => handleReabrir(dialogo.despesa)}
          onFechar={fechar}
        />
      )}

      {dialogo?.tipo === "excluir" &&
        (ehParcelaDeSerie(dialogo.despesa) ? (
          <DialogDeEscopoDaSerie
            acao="excluir"
            despesa={dialogo.despesa}
            pendente={excluir.isPending}
            onEscolher={(escopo) => handleExcluir(dialogo.despesa, escopo)}
            onFechar={fechar}
          />
        ) : (
          <Confirmacao
            titulo="Excluir esta despesa?"
            descricao={`${dialogo.despesa.nome}, de ${formatCurrency(dialogo.despesa.valor)}, será apagada. Isso não pode ser desfeito.`}
            rotuloConfirmar="Excluir despesa"
            perigosa
            pendente={excluir.isPending}
            onConfirmar={() => handleExcluir(dialogo.despesa, "esta")}
            onFechar={fechar}
          />
        ))}
    </div>
  );
}
