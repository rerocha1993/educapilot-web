"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CircleSlash,
  Plus,
  RotateCcw,
  Scale,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { banco } from "@/lib/finance/bancos";
import { useCategoriasFinanceiras, useCentrosDeCusto, useContas } from "@/lib/finance/use-tesouraria";
import {
  SITUACAO,
  useConciliar,
  useDesfazerConciliacao,
  useExcluirRegraDeConciliacao,
  useIgnorarMovimento,
  useImportarExtrato,
  useLancarDoExtrato,
  usePainelDaConciliacao,
  useRegrasDeConciliacao,
  useSalvarRegraDeConciliacao,
  type MovimentoDoExtrato,
  type RegraDeConciliacao,
  type SituacaoDoMovimento,
} from "@/lib/finance/use-conciliacao";

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function data(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const FILTROS: { valor: SituacaoDoMovimento | undefined; rotulo: string }[] = [
  { valor: SITUACAO.pendente, rotulo: "A conferir" },
  { valor: SITUACAO.conciliado, rotulo: "Conciliados" },
  { valor: SITUACAO.ignorado, rotulo: "Ignorados" },
  { valor: undefined, rotulo: "Tudo" },
];

export default function ConciliacaoPage() {
  const router = useRouter();
  const { data: contas } = useContas();
  const [contaDoUsuario, setContaDoUsuario] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<SituacaoDoMovimento | undefined>(SITUACAO.pendente);
  const [mostrarRegras, setMostrarRegras] = useState(false);

  // Abre já na conta principal, derivando em vez de guardar num efeito: a escolha só vira estado
  // quando a pessoa troca de conta, e assim a tela não renderiza uma vez vazia antes de decidir.
  const contaId = contaDoUsuario ?? (contas?.find((c) => c.padraoParaRecebimento) ?? contas?.[0])?.id ?? null;

  const { data: painel, isLoading } = usePainelDaConciliacao(contaId, filtro);
  const importar = useImportarExtrato();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [lancando, setLancando] = useState<MovimentoDoExtrato | null>(null);

  async function subirArquivo(arquivo: File) {
    if (!contaId) return;
    try {
      const r = await importar.mutateAsync({ contaId, arquivo });

      const partes = [`${r.linhasNovas} linha(s) novas`];
      if (r.conciliadasSozinhas > 0) partes.push(`${r.conciliadasSozinhas} conciliadas sozinhas`);
      if (r.lancadasPorRegra > 0) partes.push(`${r.lancadasPorRegra} lançadas por regra`);
      if (r.jaExistiam > 0) partes.push(`${r.jaExistiam} já estavam aqui`);

      toast.success(partes.join(", ") + ".");
      if (r.aviso) toast.info(r.aviso);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler o extrato.");
    } finally {
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  const contaEscolhida = contas?.find((c) => c.id === contaId);

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Conciliação"
        apoio="Suba o extrato do banco. O que já estava lançado é casado sozinho; sobra para você só o que não bate."
        acoes={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMostrarRegras(true)}>
              Regras
            </Button>
            <Button onClick={() => arquivoRef.current?.click()} disabled={!contaId || importar.isPending}>
              <Upload className="size-4" />
              {importar.isPending ? "Lendo…" : "Subir extrato"}
            </Button>
          </div>
        }
      />

      <input
        ref={arquivoRef}
        type="file"
        accept=".ofx,.csv,.txt"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) subirArquivo(arquivo);
        }}
      />

      {(contas ?? []).length === 0 && (
        <EstadoVazio
          icone={<Scale />}
          titulo="Cadastre uma conta primeiro"
          texto="A conciliação compara o extrato de uma conta com o que está lançado nela."
          acao={
            <Button onClick={() => router.push("/finance/contas")}>Ir para Contas</Button>
          }
        />
      )}

      {(contas ?? []).length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <Select value={contaId ?? undefined} onValueChange={(v) => v && setContaDoUsuario(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => contaEscolhida?.nome ?? "Selecione"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(contas ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} — {banco(c.banco).nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
              {FILTROS.map((f) => (
                <button
                  key={f.rotulo}
                  type="button"
                  onClick={() => setFiltro(f.valor)}
                  className={`shrink-0 rounded-[9px] px-3.5 py-2 text-[13.5px] whitespace-nowrap transition-colors ${
                    filtro === f.valor
                      ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          </div>

          {painel && <Placar painel={painel} />}

          {isLoading && <Skeleton className="h-64 w-full" />}

          {!isLoading && painel && painel.movimentos.length === 0 && (
            <EstadoVazio
              icone={<Scale />}
              titulo={
                filtro === SITUACAO.pendente
                  ? painel.conciliados > 0
                    ? "Nada a conferir"
                    : "Nenhum extrato importado ainda"
                  : "Nada aqui"
              }
              texto={
                filtro === SITUACAO.pendente && painel.conciliados > 0
                  ? "Todo o extrato desta conta já foi conferido."
                  : "Baixe o extrato em OFX no site do banco e suba aqui."
              }
              textoClassName="max-w-[340px]"
            />
          )}

          {!isLoading && painel && painel.movimentos.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {painel.movimentos.map((movimento) => (
                <LinhaDoExtrato key={movimento.id} movimento={movimento} onLancar={() => setLancando(movimento)} />
              ))}
            </div>
          )}
        </>
      )}

      {lancando && <DialogDeLancamento movimento={lancando} onFechar={() => setLancando(null)} />}
      {mostrarRegras && <DialogDeRegras onFechar={() => setMostrarRegras(false)} />}
    </div>
  );
}

function Placar({ painel }: { painel: NonNullable<ReturnType<typeof usePainelDaConciliacao>["data"]> }) {
  const bate = painel.divergencia != null && Math.abs(painel.divergencia) < 0.01;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[12.5px] font-medium text-muted-foreground">A conferir</p>
        <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tabular-nums">
          {painel.pendentes}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[12.5px] font-medium text-muted-foreground">Já conferidas</p>
        <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tabular-nums">
          {painel.conciliados}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-[18px]">
        <p className="text-[12.5px] font-medium text-muted-foreground">Saldo no sistema</p>
        <p className="mt-2 font-heading font-mono text-[clamp(18px,2vw,24px)] leading-none font-semibold tabular-nums">
          {dinheiro(painel.saldoDoSistema)}
        </p>
      </div>

      {/* A pergunta que a conciliação existe para responder: bate com o banco? */}
      <div
        className={`rounded-xl border p-[18px] ${
          painel.divergencia == null
            ? "border-border bg-card"
            : bate
              ? "border-success-border bg-success-soft"
              : "border-destructive-border bg-destructive-soft"
        }`}
      >
        <p className="text-[12.5px] font-medium text-muted-foreground">
          {painel.divergencia == null ? "Saldo no banco" : bate ? "Bate com o banco" : "Diferença"}
        </p>
        <p className="mt-2 font-heading font-mono text-[clamp(18px,2vw,24px)] leading-none font-semibold tabular-nums">
          {painel.divergencia == null
            ? "—"
            : bate
              ? dinheiro(painel.saldoDoBanco ?? 0)
              : dinheiro(painel.divergencia)}
        </p>
        {painel.divergencia == null && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            O arquivo não trouxe o saldo do banco.
          </p>
        )}
      </div>
    </div>
  );
}

function LinhaDoExtrato({
  movimento,
  onLancar,
}: {
  movimento: MovimentoDoExtrato;
  onLancar: () => void;
}) {
  const conciliar = useConciliar();
  const ignorar = useIgnorarMovimento();
  const desfazer = useDesfazerConciliacao();

  const entrada = movimento.valor >= 0;
  const pendente = movimento.situacao === SITUACAO.pendente;

  async function casar(tipo: string, lancamentoId: string) {
    try {
      await conciliar.mutateAsync({ id: movimento.id, tipo, lancamentoId });
      toast.success("Conciliado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conciliar.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <span
            className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
              entrada ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {entrada ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{movimento.descricao || "Sem descrição"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data(movimento.data)}
              {movimento.situacao === SITUACAO.conciliado && movimento.lancamentoDescricao && (
                <> · casado com {movimento.lancamentoDescricao}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`font-mono text-sm font-medium tabular-nums ${
              entrada ? "text-success-soft-foreground" : ""
            }`}
          >
            {dinheiro(movimento.valor)}
          </span>
          {movimento.situacao === SITUACAO.conciliado && <Badge variant="secondary">Conciliado</Badge>}
          {movimento.situacao === SITUACAO.ignorado && <Badge variant="outline">Ignorado</Badge>}
        </div>
      </div>

      {pendente && movimento.sugestoes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            {movimento.sugestoes.length === 1 ? "Parece ser:" : "Qual destes é?"}
          </p>
          {movimento.sugestoes.map((s) => (
            <div
              key={`${s.tipo}-${s.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm break-words">{s.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {dinheiro(s.valor)} · vence {data(s.vencimento)}
                  {s.diasDeDiferenca > 0 && ` · ${s.diasDeDiferenca} dia(s) de diferença`}
                </p>
              </div>
              <Button size="sm" disabled={conciliar.isPending} onClick={() => casar(s.tipo, s.id)}>
                <Check className="size-4" />
                É este
              </Button>
            </div>
          ))}
        </div>
      )}

      {pendente && movimento.sugestoes.length === 0 && movimento.regraNome && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          A regra <span className="font-medium text-foreground">{movimento.regraNome}</span> reconhece esta
          linha{movimento.regraCategoriaNome ? ` como ${movimento.regraCategoriaNome}` : ""}.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {pendente && (
          <>
            <Button variant="outline" size="sm" onClick={onLancar}>
              <Plus className="size-4" />
              Lançar como novo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={ignorar.isPending}
              onClick={() => ignorar.mutate(movimento.id)}
            >
              <CircleSlash className="size-4" />
              Ignorar
            </Button>
          </>
        )}
        {!pendente && (
          <Button
            variant="ghost"
            size="sm"
            disabled={desfazer.isPending}
            onClick={() => desfazer.mutate(movimento.id)}
          >
            <RotateCcw className="size-4" />
            Desfazer
          </Button>
        )}
      </div>
    </div>
  );
}

function DialogDeLancamento({
  movimento,
  onFechar,
}: {
  movimento: MovimentoDoExtrato;
  onFechar: () => void;
}) {
  const tipo = movimento.valor >= 0 ? "Receita" : "Despesa";
  const { data: categorias } = useCategoriasFinanceiras();
  const { data: centros } = useCentrosDeCusto();
  const lancar = useLancarDoExtrato();

  const [descricao, setDescricao] = useState(movimento.descricao);
  const [categoriaId, setCategoriaId] = useState(movimento.regraCategoriaId ?? "");
  const [centroId, setCentroId] = useState("");

  const contas = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === tipo && c.paiId),
    [categorias, tipo]
  );
  const grupos = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === tipo && !c.paiId),
    [categorias, tipo]
  );

  async function confirmar() {
    try {
      await lancar.mutateAsync({
        id: movimento.id,
        descricao: descricao.trim() || null,
        categoriaFinanceiraId: categoriaId || null,
        centroDeCustoId: centroId || null,
      });
      toast.success(`${tipo} lançada e conciliada.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível lançar.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar {tipo.toLowerCase()} de {dinheiro(Math.abs(movimento.valor))}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <p className="text-[12.5px] text-muted-foreground">
            Esta linha do extrato não tem lançamento no sistema. Ao confirmar, ele é criado já pago em{" "}
            {data(movimento.data)} e a linha fica conciliada.
          </p>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Plano de contas</Label>
            <Select
              value={categoriaId || "__nenhum__"}
              onValueChange={(v) => v && setCategoriaId(v === "__nenhum__" ? "" : String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => contas.find((c) => c.id === categoriaId)?.nome ?? "Não informar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum__">Não informar</SelectItem>
                {grupos.flatMap((grupo) =>
                  contas
                    .filter((c) => c.paiId === grupo.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {grupo.nome} › {c.nome}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Centro de custo</Label>
            <Select
              value={centroId || "__nenhum__"}
              onValueChange={(v) => v && setCentroId(v === "__nenhum__" ? "" : String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => (centros ?? []).find((c) => c.id === centroId)?.nome ?? "Não informar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum__">Não informar</SelectItem>
                {(centros ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={lancar.isPending}>
            {lancar.isPending ? "Lançando…" : "Lançar e conciliar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const REGRA_VAZIA = {
  contem: "",
  tipo: "Despesa" as "Receita" | "Despesa",
  categoriaFinanceiraId: "",
  lancarAutomaticamente: false,
  ativa: true,
};

function DialogDeRegras({ onFechar }: { onFechar: () => void }) {
  const { data: regras } = useRegrasDeConciliacao();
  const { data: categorias } = useCategoriasFinanceiras();
  const salvar = useSalvarRegraDeConciliacao();
  const excluir = useExcluirRegraDeConciliacao();

  const [form, setForm] = useState(REGRA_VAZIA);
  const [editando, setEditando] = useState<string | null>(null);

  const contas = (categorias ?? []).filter((c) => c.tipo === form.tipo && c.paiId);
  const grupos = (categorias ?? []).filter((c) => c.tipo === form.tipo && !c.paiId);

  async function guardar() {
    try {
      await salvar.mutateAsync({
        id: editando ?? undefined,
        dados: {
          contem: form.contem.trim(),
          tipo: form.tipo,
          categoriaFinanceiraId: form.categoriaFinanceiraId || null,
          lancarAutomaticamente: form.lancarAutomaticamente,
          ativa: form.ativa,
          ordem: 0,
        },
      });
      toast.success(editando ? "Regra atualizada." : "Regra criada.");
      setForm(REGRA_VAZIA);
      setEditando(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
    }
  }

  function editar(regra: RegraDeConciliacao) {
    setEditando(regra.id);
    setForm({
      contem: regra.contem,
      tipo: regra.tipo,
      categoriaFinanceiraId: regra.categoriaFinanceiraId ?? "",
      lancarAutomaticamente: regra.lancarAutomaticamente,
      ativa: regra.ativa,
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regras do extrato</DialogTitle>
        </DialogHeader>

        <p className="text-[12.5px] text-muted-foreground">
          Tarifa, juros e rendimento nunca estão lançados — chegam todo mês pelo extrato e sempre na
          mesma categoria. A regra reconhece a linha pelo texto e poupa esse trabalho.
        </p>

        <div className="flex flex-col gap-2.5">
          {(regras ?? []).map((regra) => (
            <div
              key={regra.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm break-words">
                  Contém <span className="font-medium">{regra.contem}</span> →{" "}
                  {regra.categoriaNome ?? regra.tipo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {regra.lancarAutomaticamente ? "Lança sozinha" : "Só sugere"}
                  {!regra.ativa && " · inativa"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => editar(regra)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Apagar regra"
                  onClick={() => excluir.mutate(regra.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {(regras ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma regra ainda.</p>
          )}
        </div>

        <div className="flex flex-col gap-3.5 border-t border-border pt-3.5">
          <p className="text-xs font-medium text-muted-foreground">
            {editando ? "Editando regra" : "Nova regra"}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Quando a linha contiver</Label>
              <Input
                value={form.contem}
                placeholder="TARIFA"
                onChange={(e) => setForm((f) => ({ ...f, contem: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Vira</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, tipo: String(v) as "Receita" | "Despesa", categoriaFinanceiraId: "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => (form.tipo === "Despesa" ? "Saída" : "Entrada")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Despesa">Saída</SelectItem>
                  <SelectItem value="Receita">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Na categoria</Label>
            <Select
              value={form.categoriaFinanceiraId || "__nenhum__"}
              onValueChange={(v) =>
                v && setForm((f) => ({ ...f, categoriaFinanceiraId: v === "__nenhum__" ? "" : String(v) }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => contas.find((c) => c.id === form.categoriaFinanceiraId)?.nome ?? "Não informar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum__">Não informar</SelectItem>
                {grupos.flatMap((grupo) =>
                  contas
                    .filter((c) => c.paiId === grupo.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {grupo.nome} › {c.nome}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={form.lancarAutomaticamente}
              onCheckedChange={(v) => setForm((f) => ({ ...f, lancarAutomaticamente: v === true }))}
            />
            <span>
              Lançar sozinha
              <span className="block text-xs text-muted-foreground">
                Sem isto a regra só sugere. Ligada, ela cria o lançamento na importação.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          {editando && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditando(null);
                setForm(REGRA_VAZIA);
              }}
            >
              Cancelar edição
            </Button>
          )}
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button onClick={guardar} disabled={salvar.isPending || form.contem.trim().length < 3}>
            {salvar.isPending ? "Salvando…" : editando ? "Salvar" : "Criar regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
