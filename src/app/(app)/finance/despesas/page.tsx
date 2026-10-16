"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BarraDeLote } from "@/components/finance/barra-de-lote";
import { BotaoDeExportar } from "@/components/finance/botao-de-exportar";
import { ComprovanteDaDespesa } from "@/components/finance/comprovante-da-despesa";
import { DialogDeBaixaEmLote } from "@/components/finance/dialog-de-baixa-em-lote";
import { DialogDeDespesa } from "@/components/finance/dialog-de-despesa";
import { DialogDeEscopoDaSerie } from "@/components/finance/dialog-de-escopo-da-serie";
import { DialogDeImportacao } from "@/components/finance/dialog-de-importacao";
import { DialogRegistrarPagamento } from "@/components/finance/dialogs-de-baixa";
import { FaixaDeTotais } from "@/components/finance/faixa-de-totais";
import {
  BuscaDaLista,
  FiltroDaLista,
  FiltroDeCarteira,
  SEM_CARTEIRA,
  TODOS,
  useNomesDasContas,
} from "@/components/finance/filtros-da-lista";
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

type Situacao = "apagar" | "atrasada" | "paga";

const ROTULO_DA_SITUACAO: Record<Situacao, string> = {
  apagar: "A pagar",
  atrasada: "Atrasada",
  paga: "Paga",
};

function situacaoDaDespesa(e: ExpenseDto): Situacao {
  return estaPaga(e) ? "paga" : isOverdue(e) ? "atrasada" : "apagar";
}

/** Quantas linhas aparecem de cada vez; os totais e a seleção valem para a lista inteira. */
const LINHAS_POR_VEZ = 100;

function rotuloDaCategoria(e: ExpenseDto) {
  return `${EXPENSE_CATEGORIES.find((c) => c.value === e.categoria)?.label ?? e.categoria}${e.subcategoria ? ` · ${e.subcategoria}` : ""}`;
}

type Dialogo =
  | { tipo: "nova" }
  | { tipo: "importar" }
  | { tipo: "editar"; despesa: ExpenseDto }
  | { tipo: "pagar"; despesa: ExpenseDto }
  | { tipo: "reabrir"; despesa: ExpenseDto }
  | { tipo: "excluir"; despesa: ExpenseDto }
  | { tipo: "lote" };

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
  const nomeDaConta = useNomesDasContas();

  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  // Filtros da lista: tudo no cliente, porque a API devolve o mês inteiro.
  const [busca, setBusca] = useState("");
  const [conta, setConta] = useState(TODOS);
  const [situacao, setSituacao] = useState<string>(TODOS);
  const [categoria, setCategoria] = useState(TODOS);
  const [limite, setLimite] = useState(LINHAS_POR_VEZ);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const todas = useMemo(() => expenses ?? [], [expenses]);

  // Os totais seguem busca, conta, categoria e mês; a situação é escolhida clicando neles.
  const base = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return todas.filter((e) => {
      if (conta === SEM_CARTEIRA ? !!e.bancoContaId : conta !== TODOS && e.bancoContaId !== conta) return false;
      if (categoria !== TODOS && String(e.categoria) !== categoria) return false;
      if (!termo) return true;
      const texto = `${e.nome} ${e.descricao ?? ""} ${e.subcategoria ?? ""} ${e.fornecedorNome ?? ""} ${e.centroCusto ?? ""} ${nomeDaConta(e.bancoContaId) ?? ""}`;
      return texto.toLocaleLowerCase("pt-BR").includes(termo);
    });
  }, [todas, busca, conta, categoria, nomeDaConta]);

  const totais = useMemo(() => {
    const t = { total: 0, nTotal: 0, pago: 0, nPago: 0, atrasado: 0, nAtrasado: 0, apagar: 0, nApagar: 0 };
    for (const e of base) {
      t.total += e.valor;
      t.nTotal += 1;
      const s = situacaoDaDespesa(e);
      if (s === "paga") {
        // O que de fato saiu da conta, com juros, multa e desconto.
        t.pago += e.valorPago ?? e.valor;
        t.nPago += 1;
      } else if (s === "atrasada") {
        t.atrasado += e.valor;
        t.nAtrasado += 1;
      } else {
        t.apagar += e.valor;
        t.nApagar += 1;
      }
    }
    return t;
  }, [base]);

  const list = useMemo(
    () => (situacao === TODOS ? base : base.filter((e) => situacaoDaDespesa(e) === situacao)),
    [base, situacao]
  );
  const visiveis = list.slice(0, limite);

  const filtrando = busca.trim() !== "" || conta !== TODOS || situacao !== TODOS || categoria !== TODOS;

  // Só o que ainda não foi pago entra no lote.
  const marcaveis = list.filter((e) => !estaPaga(e));
  const marcadas = marcaveis.filter((e) => selecionadas.has(e.id));
  const todasMarcadas = marcaveis.length > 0 && marcadas.length === marcaveis.length;
  const somaMarcada = marcadas.reduce((soma, e) => soma + e.valor, 0);

  function alternar(id: string, marcado: boolean) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodas(marcado: boolean) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      for (const e of marcaveis) {
        if (marcado) novo.add(e.id);
        else novo.delete(e.id);
      }
      return novo;
    });
  }

  function limpar() {
    setBusca("");
    setConta(TODOS);
    setSituacao(TODOS);
    setCategoria(TODOS);
    setLimite(LINHAS_POR_VEZ);
  }

  // Cada filtro que muda volta para o começo da lista.
  function mudar<T>(definir: (v: T) => void) {
    return (v: T) => {
      definir(v);
      setLimite(LINHAS_POR_VEZ);
    };
  }

  function atalhoDaSituacao(alvo: Situacao) {
    setSituacao((atual) => (atual === alvo ? TODOS : alvo));
    setLimite(LINHAS_POR_VEZ);
  }

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

      <SeletorDeMes
        valor={{ mes: month, ano: year }}
        onChange={(v) => {
          setPeriodo(v);
          setSelecionadas(new Set());
          setLimite(LINHAS_POR_VEZ);
        }}
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as despesas.
        </div>
      )}

      {/* Números antes da lista: seguem a busca, a conta e a categoria; tocar num total filtra pela situação. */}
      {!isLoading && todas.length > 0 && (
        <FaixaDeTotais
          rotulo="Totais das despesas do mês"
          itens={[
            {
              chave: "total",
              rotulo: "Total do mês",
              valor: formatCurrency(totais.total),
              detalhe: `${totais.nTotal} ${totais.nTotal === 1 ? "despesa" : "despesas"}`,
              ativo: situacao === TODOS,
              onClick: () => setSituacao(TODOS),
            },
            {
              chave: "pago",
              rotulo: "Pago",
              valor: formatCurrency(totais.pago),
              detalhe: `${totais.nPago} ${totais.nPago === 1 ? "paga" : "pagas"}`,
              tom: totais.pago > 0 ? "success" : undefined,
              ativo: situacao === "paga",
              onClick: () => atalhoDaSituacao("paga"),
            },
            {
              chave: "atrasado",
              rotulo: "Atrasado",
              valor: formatCurrency(totais.atrasado),
              detalhe: `${totais.nAtrasado} ${totais.nAtrasado === 1 ? "despesa" : "despesas"}`,
              tom: totais.atrasado > 0 ? "danger" : undefined,
              ativo: situacao === "atrasada",
              onClick: () => atalhoDaSituacao("atrasada"),
            },
            {
              chave: "apagar",
              rotulo: "A pagar",
              valor: formatCurrency(totais.apagar),
              detalhe: `${totais.nApagar} ${totais.nApagar === 1 ? "despesa" : "despesas"}`,
              ativo: situacao === "apagar",
              onClick: () => atalhoDaSituacao("apagar"),
            },
          ]}
        />
      )}

      {todas.length > 0 && (
        <div className="grid gap-2.5">
          <BuscaDaLista valor={busca} onChange={mudar(setBusca)} rotulo="Buscar por descrição, fornecedor ou conta" />
          <div className="grid max-w-4xl gap-2.5 sm:grid-cols-3">
            <FiltroDeCarteira valor={conta} onChange={mudar(setConta)} rotuloDaConta="Todas as contas" />
            <FiltroDaLista
              rotulo="Filtrar por situação"
              todos="Todas as situações"
              valor={situacao}
              opcoes={(Object.keys(ROTULO_DA_SITUACAO) as Situacao[]).map((k) => ({ valor: k, rotulo: ROTULO_DA_SITUACAO[k] }))}
              onChange={mudar(setSituacao)}
            />
            <FiltroDaLista
              rotulo="Filtrar por categoria"
              todos="Todas as categorias"
              valor={categoria}
              opcoes={EXPENSE_CATEGORIES.map((c) => ({ valor: String(c.value), rotulo: c.label }))}
              onChange={mudar(setCategoria)}
            />
          </div>
          {filtrando && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite">
              <span>
                <span className="font-numeric font-medium text-foreground">{list.length}</span> de {todas.length} despesas
              </span>
              <button
                type="button"
                onClick={limpar}
                className="min-h-8 font-medium text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      <BarraDeLote
        quantidade={marcadas.length}
        soma={formatCurrency(somaMarcada)}
        rotuloDaAcao={`Registrar pagamento de ${marcadas.length}`}
        onAcao={() => setDialogo({ tipo: "lote" })}
        onLimpar={() => setSelecionadas(new Set())}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !isError && list.length === 0 && (
        <EstadoVazio
          icone={<Inbox />}
          titulo={filtrando ? "Nenhuma despesa com esses filtros" : "Nenhuma despesa neste mês."}
          texto={filtrando ? "Mude a busca ou limpe os filtros." : undefined}
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {list.length > 0 && (
        <>
          {/* Celular: um cartão por despesa. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {visiveis.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex items-start gap-1">
                  {!estaPaga(e) ? (
                    <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
                      <Checkbox
                        aria-label={`Marcar ${e.nome}`}
                        checked={selecionadas.has(e.id)}
                        onCheckedChange={(v) => alternar(e.id, v)}
                      />
                    </label>
                  ) : (
                    <span aria-hidden className="w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 pt-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium break-words">
                        {e.nome}
                        <EtiquetaDaParcela e={e} />
                      </p>
                      <SituacaoDaDespesa e={e} />
                    </div>
                    <p className="text-[13px] break-words text-muted-foreground">
                      {rotuloDaCategoria(e)} · {nomeDaConta(e.bancoContaId) ?? "Sem conta"}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-muted-foreground">{formatarSoData(e.dataVencimento)}</span>
                      <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{formatCurrency(e.valor)}</span>
                    </div>
                  </div>
                </div>
                <PagamentoDaDespesa e={e} />
                <div className="flex flex-col gap-2 border-t border-border pt-2">
                  {!estaPaga(e) && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setDialogo({ tipo: "pagar", despesa: e })}>
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
              </li>
            ))}
          </ul>

          {/* Computador: tabela densa. */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Marcar todas as despesas em aberto da lista"
                      checked={todasMarcadas}
                      indeterminate={marcadas.length > 0 && !todasMarcadas}
                      disabled={marcaveis.length === 0}
                      onCheckedChange={alternarTodas}
                    />
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((e) => (
                  <TableRow key={e.id} className="[&>td]:py-1.5" data-state={selecionadas.has(e.id) ? "selected" : undefined}>
                    <TableCell>
                      {!estaPaga(e) && (
                        <Checkbox
                          aria-label={`Marcar ${e.nome}`}
                          checked={selecionadas.has(e.id)}
                          onCheckedChange={(v) => alternar(e.id, v)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                        {e.nome}
                        <EtiquetaDaParcela e={e} />
                      </span>
                      <span className="block text-xs text-muted-foreground">{rotuloDaCategoria(e)}</span>
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-sm text-muted-foreground">
                      {nomeDaConta(e.bancoContaId) ?? "—"}
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

          {list.length > visiveis.length && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span>
                Mostrando <span className="font-numeric font-medium text-foreground">{visiveis.length}</span> de {list.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => setLimite((n) => n + LINHAS_POR_VEZ)}>
                Mostrar mais {Math.min(LINHAS_POR_VEZ, list.length - visiveis.length)}
              </Button>
            </div>
          )}
        </>
      )}

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
      {dialogo?.tipo === "lote" && (
        <DialogDeBaixaEmLote
          tipo="despesa"
          itens={marcadas.map((e) => ({ id: e.id, rotulo: e.nome, valor: e.valor, contaId: e.bancoContaId }))}
          onConcluir={(pagas) =>
            setSelecionadas((atual) => {
              const novo = new Set(atual);
              for (const id of pagas) novo.delete(id);
              return novo;
            })
          }
          onFechar={fechar}
        />
      )}
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
