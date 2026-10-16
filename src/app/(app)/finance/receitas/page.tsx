"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, RotateCcw, Upload } from "lucide-react";
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
import { BarraDeLote } from "@/components/finance/barra-de-lote";
import { BotaoDeExportar } from "@/components/finance/botao-de-exportar";
import { ClassificacaoDoLancamento } from "@/components/finance/classificacao-do-lancamento";
import { DialogDeBaixaEmLote } from "@/components/finance/dialog-de-baixa-em-lote";
import { DialogDeImportacao } from "@/components/finance/dialog-de-importacao";
import { DialogRegistrarRecebimento } from "@/components/finance/dialogs-de-baixa";
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
  useRevenuesByMonth,
  useCreateRevenue,
  useReabrirReceita,
  REVENUE_CATEGORIES,
  revenueCategoryLabel,
  type RevenueEntryDto,
} from "@/lib/finance/use-revenues";
import { exportarLancamentosDoMes } from "@/lib/finance/use-importacao";
import { situacaoDoServidor } from "@/lib/finance/diferenca-do-pagamento";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type BadgeVariant = "success" | "pending" | "waiting" | "overdue";


/** O que foi recebido de fato, a diferença e a situação, quando a receita já foi recebida. */
function RecebimentoDaReceita({ r }: { r: RevenueEntryDto }) {
  if (r.status !== 2) return null;
  return (
    <ResumoDoPagamento
      valor={r.expectedAmount}
      valorPago={r.receivedAmount}
      juros={r.juros}
      multa={r.multa}
      desconto={r.desconto}
      situacao={situacaoDoServidor(r.situacaoDoPagamento, r.diasDeAtraso)}
      sempreComValorPago
    />
  );
}

const EMPTY_FORM = {
  description: "",
  category: 1,
  costCenter: "",
  expectedAmount: "",
  dueDate: hojeIsoBrasilia(),
  bancoContaId: "",
  categoriaFinanceiraId: "",
  centroDeCustoId: "",
};

type Situacao = "avencer" | "vencida" | "recebida" | "cancelada";

const ROTULO_DA_SITUACAO: Record<Situacao, string> = {
  avencer: "A vencer",
  vencida: "Atrasada",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

/** Situação para o usuário: planejada com vencimento no passado já é atrasada, mesmo que o job ainda não tenha marcado. */
function situacaoDaReceita(r: RevenueEntryDto, hoje: string): Situacao {
  if (r.status === 2) return "recebida";
  if (r.status === 4) return "cancelada";
  if (r.status === 3) return "vencida";
  return r.dueDate.slice(0, 10) < hoje ? "vencida" : "avencer";
}

const BADGE_DA_SITUACAO: Record<Situacao, BadgeVariant> = {
  avencer: "pending",
  vencida: "overdue",
  recebida: "success",
  cancelada: "waiting",
};

/** Quantas linhas aparecem de cada vez; os totais e a seleção valem para a lista inteira. */
const LINHAS_POR_VEZ = 100;

/** Carteira da receita: o nome da conta, que ao clicar filtra a lista; "—" quando a receita não tem conta. */
function CarteiraDaReceita({
  nome,
  contaId,
  onFiltrar,
}: {
  nome: string | null;
  contaId?: string | null;
  onFiltrar: (id: string) => void;
}) {
  if (!contaId || !nome) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      title="Ver só as receitas desta carteira"
      onClick={() => onFiltrar(contaId)}
      className="max-w-full truncate rounded-md text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {nome}
    </button>
  );
}

export default function ReceitasPage() {
  const now = new Date();
  const hoje = hojeIsoBrasilia();
  const [{ mes: month, ano: year }, setPeriodo] = useState({ mes: now.getMonth() + 1, ano: now.getFullYear() });

  const { data: revenues, isLoading, isError } = useRevenuesByMonth(month, year);
  const createRevenue = useCreateRevenue();
  const reabrir = useReabrirReceita();
  const nomeDaConta = useNomesDasContas();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [recebendo, setRecebendo] = useState<RevenueEntryDto | null>(null);
  const [reabrindo, setReabrindo] = useState<RevenueEntryDto | null>(null);

  // Filtros da lista: tudo no cliente, porque a API devolve o mês inteiro.
  const [busca, setBusca] = useState("");
  const [carteira, setCarteira] = useState(TODOS);
  const [situacao, setSituacao] = useState<string>(TODOS);
  const [categoria, setCategoria] = useState(TODOS);
  const [limite, setLimite] = useState(LINHAS_POR_VEZ);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [emLote, setEmLote] = useState(false);

  const todas = useMemo(() => revenues ?? [], [revenues]);

  // Os totais seguem busca, carteira, categoria e mês; a situação é escolhida clicando neles.
  const base = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return todas.filter((r) => {
      if (carteira === SEM_CARTEIRA ? !!r.bancoContaId : carteira !== TODOS && r.bancoContaId !== carteira) return false;
      if (categoria !== TODOS && String(r.category) !== categoria) return false;
      if (!termo) return true;
      const texto = `${r.description ?? ""} ${r.notes ?? ""} ${r.costCenter ?? ""} ${nomeDaConta(r.bancoContaId) ?? ""}`;
      return texto.toLocaleLowerCase("pt-BR").includes(termo);
    });
  }, [todas, busca, carteira, categoria, nomeDaConta]);

  const situacoes = useMemo(() => new Map(base.map((r) => [r.id, situacaoDaReceita(r, hoje)])), [base, hoje]);

  const totais = useMemo(() => {
    const t = {
      previsto: 0, nPrevisto: 0,
      recebido: 0, nRecebido: 0,
      atrasado: 0, nAtrasado: 0,
      avencer: 0, nAvencer: 0,
    };
    for (const r of base) {
      const s = situacoes.get(r.id);
      if (s === "cancelada") continue;
      t.previsto += r.expectedAmount;
      t.nPrevisto += 1;
      if (s === "recebida") {
        t.recebido += r.receivedAmount;
        t.nRecebido += 1;
      } else if (s === "vencida") {
        t.atrasado += r.expectedAmount;
        t.nAtrasado += 1;
      } else {
        t.avencer += r.expectedAmount;
        t.nAvencer += 1;
      }
    }
    return t;
  }, [base, situacoes]);

  const list = useMemo(
    () => (situacao === TODOS ? base : base.filter((r) => situacoes.get(r.id) === situacao)),
    [base, situacao, situacoes]
  );
  const visiveis = list.slice(0, limite);

  const filtrando = busca.trim() !== "" || carteira !== TODOS || situacao !== TODOS || categoria !== TODOS;

  // Só o que ainda não foi recebido nem cancelado entra no lote.
  const marcaveis = list.filter((r) => r.status !== 2 && r.status !== 4);
  const marcadas = marcaveis.filter((r) => selecionadas.has(r.id));
  const todasMarcadas = marcaveis.length > 0 && marcadas.length === marcaveis.length;
  const somaMarcada = marcadas.reduce((s, r) => s + r.expectedAmount, 0);

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
      for (const r of marcaveis) {
        if (marcado) novo.add(r.id);
        else novo.delete(r.id);
      }
      return novo;
    });
  }

  function limpar() {
    setBusca("");
    setCarteira(TODOS);
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

  function atalhoDaSituacao(alvo: Situacao | typeof TODOS) {
    setSituacao((atual) => (atual === alvo ? TODOS : alvo));
    setLimite(LINHAS_POR_VEZ);
  }

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
        // Pela string: new Date("yyyy-MM-dd") é UTC e cai no mês anterior no dia 1º.
        competencyMonth: competenciaDeIso(form.dueDate).mes,
        competencyYear: competenciaDeIso(form.dueDate).ano,
        bancoContaId: form.bancoContaId || null,
        categoriaFinanceiraId: form.categoriaFinanceiraId || null,
        centroDeCustoId: form.centroDeCustoId || null,
      });
      toast.success("Receita criada.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar receita.");
    }
  }

  async function handleReabrir(entry: RevenueEntryDto) {
    try {
      await reabrir.mutateAsync(entry.id);
      toast.success("Receita reaberta. Ela voltou para as contas a receber.");
      setReabrindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reabrir a receita.");
    }
  }

  function acoesDaLinha(r: RevenueEntryDto, cheio?: boolean) {
    const largura = cheio ? "w-full" : undefined;
    return (
      <>
        {r.status !== 2 && r.status !== 4 && (
          <Button variant="outline" size="sm" className={largura} onClick={() => setRecebendo(r)}>
            Registrar recebimento
          </Button>
        )}
        {r.status === 2 && (
          <>
            <Link
              href={`/finance/recibos/novo?revenueEntryId=${r.id}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: largura })}
            >
              Emitir recibo
            </Link>
            <Button variant="ghost" size="sm" className={largura} onClick={() => setReabrindo(r)}>
              <RotateCcw />
              Reabrir
            </Button>
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Receitas"
        apoio={
          <span className="font-mono tabular-nums">
            {new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        }
        acoes={
          <>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setImportando(true)}>
              <Upload />
              Importar
            </Button>
            <BotaoDeExportar
              className="flex-1 md:flex-none"
              onExportar={() => exportarLancamentosDoMes("receitas", month, year)}
            />
            <Button variant="action" className="w-full md:w-auto" onClick={() => setDialogOpen(true)}>
              Nova receita
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
          Não foi possível carregar as receitas.
        </div>
      )}

      {/* Números antes da lista: seguem a busca, a carteira e a categoria; tocar num total filtra pela situação. */}
      {!isLoading && todas.length > 0 && (
        <FaixaDeTotais
          rotulo="Totais das receitas do mês"
          itens={[
            {
              chave: "previsto",
              rotulo: "Previsto",
              valor: formatCurrency(totais.previsto),
              detalhe: `${totais.nPrevisto} ${totais.nPrevisto === 1 ? "receita" : "receitas"}`,
              ativo: situacao === TODOS,
              onClick: () => setSituacao(TODOS),
            },
            {
              chave: "recebido",
              rotulo: "Recebido",
              valor: formatCurrency(totais.recebido),
              detalhe: `${totais.nRecebido} ${totais.nRecebido === 1 ? "recebida" : "recebidas"}`,
              tom: totais.recebido > 0 ? "success" : undefined,
              ativo: situacao === "recebida",
              onClick: () => atalhoDaSituacao("recebida"),
            },
            {
              chave: "atrasado",
              rotulo: "Atrasado",
              valor: formatCurrency(totais.atrasado),
              detalhe: `${totais.nAtrasado} ${totais.nAtrasado === 1 ? "receita" : "receitas"}`,
              tom: totais.atrasado > 0 ? "danger" : undefined,
              ativo: situacao === "vencida",
              onClick: () => atalhoDaSituacao("vencida"),
            },
            {
              chave: "avencer",
              rotulo: "A vencer",
              valor: formatCurrency(totais.avencer),
              detalhe: `${totais.nAvencer} ${totais.nAvencer === 1 ? "receita" : "receitas"}`,
              ativo: situacao === "avencer",
              onClick: () => atalhoDaSituacao("avencer"),
            },
          ]}
        />
      )}

      {todas.length > 0 && (
        <div className="grid gap-2.5">
          <BuscaDaLista
            valor={busca}
            onChange={mudar(setBusca)}
            rotulo="Buscar por descrição, aluno ou responsável"
          />
          <div className="grid max-w-4xl gap-2.5 sm:grid-cols-3">
            <FiltroDeCarteira valor={carteira} onChange={mudar(setCarteira)} />
            <FiltroDaLista
              rotulo="Filtrar por situação"
              todos="Todas as situações"
              valor={situacao}
              opcoes={(Object.keys(ROTULO_DA_SITUACAO) as Situacao[]).map((s) => ({ valor: s, rotulo: ROTULO_DA_SITUACAO[s] }))}
              onChange={mudar(setSituacao)}
            />
            <FiltroDaLista
              rotulo="Filtrar por categoria"
              todos="Todas as categorias"
              valor={categoria}
              opcoes={REVENUE_CATEGORIES.map((c) => ({ valor: String(c.value), rotulo: c.label }))}
              onChange={mudar(setCategoria)}
            />
          </div>
          {filtrando && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite">
              <span>
                <span className="font-numeric font-medium text-foreground">{list.length}</span> de {todas.length} receitas
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
        rotuloDaAcao={`Registrar recebimento de ${marcadas.length}`}
        onAcao={() => setEmLote(true)}
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
          titulo={filtrando ? "Nenhuma receita com esses filtros" : "Nenhuma receita neste mês."}
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
          {/* Celular: um cartão por receita. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {visiveis.map((r) => {
              const s = situacoes.get(r.id) ?? "avencer";
              const marcavel = r.status !== 2 && r.status !== 4;
              return (
                <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="flex items-start gap-1">
                    {marcavel ? (
                      <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
                        <Checkbox
                          aria-label={`Marcar ${r.description ?? "receita"}`}
                          checked={selecionadas.has(r.id)}
                          onCheckedChange={(v) => alternar(r.id, v)}
                        />
                      </label>
                    ) : (
                      <span aria-hidden className="w-2 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 pt-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium break-words">{r.description}</p>
                        <Badge variant={BADGE_DA_SITUACAO[s]}>{ROTULO_DA_SITUACAO[s]}</Badge>
                      </div>
                      <p className="text-[13px] break-words text-muted-foreground">
                        {revenueCategoryLabel(r.category)} · {nomeDaConta(r.bancoContaId) ?? "Sem carteira"}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-muted-foreground">{formatarSoData(r.dueDate)}</span>
                        <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                          {formatCurrency(r.expectedAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <RecebimentoDaReceita r={r} />
                  <div className="flex flex-col gap-2 border-t border-border pt-2">
                    {acoesDaLinha(r, true)}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Computador: tabela densa. */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Marcar todas as receitas em aberto da lista"
                      checked={todasMarcadas}
                      indeterminate={marcadas.length > 0 && !todasMarcadas}
                      disabled={marcaveis.length === 0}
                      onCheckedChange={alternarTodas}
                    />
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Carteira</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Valor previsto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((r) => {
                  const s = situacoes.get(r.id) ?? "avencer";
                  const marcavel = r.status !== 2 && r.status !== 4;
                  return (
                    <TableRow key={r.id} className="[&>td]:py-1.5" data-state={selecionadas.has(r.id) ? "selected" : undefined}>
                      <TableCell>
                        {marcavel && (
                          <Checkbox
                            aria-label={`Marcar ${r.description ?? "receita"}`}
                            checked={selecionadas.has(r.id)}
                            onCheckedChange={(v) => alternar(r.id, v)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <span className="block font-medium break-words">{r.description}</span>
                        <span className="block text-xs text-muted-foreground">{revenueCategoryLabel(r.category)}</span>
                      </TableCell>
                      <TableCell className="max-w-44 text-sm">
                        <CarteiraDaReceita
                          nome={nomeDaConta(r.bancoContaId)}
                          contaId={r.bancoContaId}
                          onFiltrar={mudar(setCarteira)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                        {formatarSoData(r.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {formatCurrency(r.expectedAmount)}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="grid gap-1">
                          <Badge variant={BADGE_DA_SITUACAO[s]}>{ROTULO_DA_SITUACAO[s]}</Badge>
                          <RecebimentoDaReceita r={r} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {acoesDaLinha(r)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <ClassificacaoDoLancamento
              tipo="Receita"
              contaId={form.bancoContaId}
              categoriaId={form.categoriaFinanceiraId}
              centroId={form.centroDeCustoId}
              onContaId={(v) => setForm((f) => ({ ...f, bancoContaId: v }))}
              onCategoriaId={(v) => setForm((f) => ({ ...f, categoriaFinanceiraId: v }))}
              onCentroId={(v) => setForm((f) => ({ ...f, centroDeCustoId: v }))}
            />
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

      {importando && <DialogDeImportacao tipo="receitas" onFechar={() => setImportando(false)} />}

      {emLote && (
        <DialogDeBaixaEmLote
          tipo="receita"
          itens={marcadas.map((r) => ({
            id: r.id,
            rotulo: r.description ?? "Receita",
            valor: r.expectedAmount,
            contaId: r.bancoContaId,
          }))}
          onConcluir={(baixadas) =>
            setSelecionadas((atual) => {
              const novo = new Set(atual);
              for (const id of baixadas) novo.delete(id);
              return novo;
            })
          }
          onFechar={() => setEmLote(false)}
        />
      )}

      {recebendo && <DialogRegistrarRecebimento receita={recebendo} onFechar={() => setRecebendo(null)} />}

      {reabrindo && (
        <Confirmacao
          titulo="Reabrir esta receita?"
          descricao={`${reabrindo.description ?? "A receita"} volta para as contas a receber e o recebimento registrado (data, valor, juros, multa e desconto) é apagado. Atenção: se ela veio de uma cobrança, a cobrança ligada também é reaberta, mesmo que tenha sido paga pelo Asaas. Use só se o recebimento foi registrado por engano.`}
          rotuloConfirmar="Reabrir receita"
          pendente={reabrir.isPending}
          onConfirmar={() => handleReabrir(reabrindo)}
          onFechar={() => setReabrindo(null)}
        />
      )}
    </div>
  );
}
