"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Landmark, Pencil, Plus, Trash2 } from "lucide-react";

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
import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { BANCOS, banco } from "@/lib/finance/bancos";
import {
  TIPOS_DE_CONTA,
  useContas,
  useExcluirConta,
  useExcluirTransferencia,
  useSalvarConta,
  useTransferencias,
  useTransferir,
  type SaldoDaConta,
  type TipoDaConta,
} from "@/lib/finance/use-tesouraria";

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const CONTA_VAZIA = {
  nome: "",
  bancoCodigo: "itau",
  tipo: 1 as TipoDaConta,
  agencia: "",
  numero: "",
  saldoInicial: null as number | null,
  dataDoSaldoInicial: hoje(),
  ativa: true,
  padraoParaRecebimento: false,
};

export default function ContasPage() {
  const { data: contas, isLoading, isError } = useContas(true);
  const { data: transferencias } = useTransferencias();
  const salvarConta = useSalvarConta();
  const excluirConta = useExcluirConta();
  const transferir = useTransferir();
  const excluirTransferencia = useExcluirTransferencia();

  const [dialogConta, setDialogConta] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState(CONTA_VAZIA);

  const [dialogTransferencia, setDialogTransferencia] = useState(false);
  const [transf, setTransf] = useState({
    contaOrigemId: "",
    contaDestinoId: "",
    valor: null as number | null,
    data: hoje(),
    descricao: "",
  });

  const ativas = useMemo(() => (contas ?? []).filter((c) => c.ativa), [contas]);
  const inativas = useMemo(() => (contas ?? []).filter((c) => !c.ativa), [contas]);

  const total = ativas.reduce((soma, c) => soma + c.saldoAtual, 0);
  const totalAReceber = ativas.reduce((soma, c) => soma + c.aReceber, 0);
  const totalAPagar = ativas.reduce((soma, c) => soma + c.aPagar, 0);

  function abrirNova() {
    setEditando(null);
    setForm({ ...CONTA_VAZIA, padraoParaRecebimento: (contas ?? []).length === 0 });
    setDialogConta(true);
  }

  function abrirEdicao(conta: SaldoDaConta) {
    setEditando(conta.id);
    setForm({
      nome: conta.nome,
      bancoCodigo: conta.banco,
      tipo: conta.tipo,
      agencia: conta.agencia ?? "",
      numero: conta.numero ?? "",
      saldoInicial: emCentavos(conta.saldoInicial),
      dataDoSaldoInicial: conta.dataDoSaldoInicial.slice(0, 10),
      ativa: conta.ativa,
      padraoParaRecebimento: conta.padraoParaRecebimento,
    });
    setDialogConta(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Dê um nome para a conta.");
      return;
    }
    try {
      await salvarConta.mutateAsync({
        id: editando ?? undefined,
        dados: {
          nome: form.nome.trim(),
          banco: form.bancoCodigo,
          tipo: form.tipo,
          agencia: form.agencia || null,
          numero: form.numero || null,
          saldoInicial: emReais(form.saldoInicial),
          dataDoSaldoInicial: form.dataDoSaldoInicial,
          ativa: form.ativa,
          padraoParaRecebimento: form.padraoParaRecebimento,
        },
      });
      toast.success(editando ? "Conta atualizada." : "Conta cadastrada.");
      setDialogConta(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a conta.");
    }
  }

  async function apagar(conta: SaldoDaConta) {
    try {
      await excluirConta.mutateAsync(conta.id);
      toast.success("Conta removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover a conta.");
    }
  }

  async function confirmarTransferencia() {
    const valor = emReais(transf.valor);
    if (!transf.contaOrigemId || !transf.contaDestinoId || !valor) {
      toast.error("Escolha as duas contas e o valor.");
      return;
    }
    try {
      await transferir.mutateAsync({
        contaOrigemId: transf.contaOrigemId,
        contaDestinoId: transf.contaDestinoId,
        valor,
        data: transf.data,
        descricao: transf.descricao || null,
      });
      toast.success("Transferência registrada.");
      setDialogTransferencia(false);
      setTransf({ contaOrigemId: "", contaDestinoId: "", valor: null, data: hoje(), descricao: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a transferência.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Contas"
        apoio="Onde o dinheiro da escola está. O saldo é o inicial mais o que já entrou, menos o que já saiu."
        acoes={
          <div className="flex flex-wrap gap-2">
            {ativas.length > 1 && (
              <Button variant="outline" onClick={() => setDialogTransferencia(true)}>
                <ArrowRight className="size-4" />
                Transferir
              </Button>
            )}
            <Button onClick={abrirNova}>
              <Plus className="size-4" />
              Nova conta
            </Button>
          </div>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as contas.
        </div>
      )}

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && ativas.length === 0 && (
        <EstadoVazio
          icone={<Landmark />}
          titulo="Nenhuma conta cadastrada"
          texto="Cadastre a conta onde a escola recebe as mensalidades. O saldo de hoje é o ponto de partida."
          textoClassName="max-w-[360px]"
          acao={<Button onClick={abrirNova}>Cadastrar a primeira conta</Button>}
        />
      )}

      {ativas.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Saldo somado</p>
              <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
                {dinheiro(total)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Ainda a receber</p>
              <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums text-success-soft-foreground">
                {dinheiro(totalAReceber)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Ainda a pagar</p>
              <p className="mt-2 font-heading font-mono text-[clamp(22px,2.4vw,30px)] leading-none font-semibold tracking-[-.03em] whitespace-nowrap tabular-nums">
                {dinheiro(totalAPagar)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {ativas.map((conta) => (
              <CartaoDaConta key={conta.id} conta={conta} onEditar={() => abrirEdicao(conta)} onApagar={() => apagar(conta)} />
            ))}
          </div>
        </>
      )}

      {inativas.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <h2 className="font-heading text-[15.5px] font-semibold text-muted-foreground">Contas encerradas</h2>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {inativas.map((conta) => (
              <CartaoDaConta key={conta.id} conta={conta} onEditar={() => abrirEdicao(conta)} onApagar={() => apagar(conta)} />
            ))}
          </div>
        </div>
      )}

      {(transferencias ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-[18px]">
          <h2 className="font-heading text-[15.5px] font-semibold">Transferências entre contas</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Dinheiro que só mudou de lugar — não conta como receita nem como despesa.
          </p>
          <div className="mt-3.5 flex flex-col divide-y divide-border">
            {(transferencias ?? []).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium">{t.contaOrigemNome}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{t.contaDestinoNome}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.data).toLocaleDateString("pt-BR")}
                    {t.descricao ? ` · ${t.descricao}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">{dinheiro(t.valor)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Apagar transferência"
                    onClick={() => excluirTransferencia.mutate(t.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogConta} onOpenChange={setDialogConta}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome da conta</Label>
              <Input
                value={form.nome}
                placeholder="Itaú movimento"
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Banco</Label>
                <Select
                  value={form.bancoCodigo}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, bancoCodigo: String(v) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{() => banco(form.bancoCodigo).nome}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map((b) => (
                      <SelectItem key={b.codigo} value={b.codigo}>
                        {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select
                  value={String(form.tipo)}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, tipo: Number(v) as TipoDaConta }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => TIPOS_DE_CONTA.find((t) => t.valor === form.tipo)?.rotulo ?? "Tipo"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DE_CONTA.map((t) => (
                      <SelectItem key={t.valor} value={String(t.valor)}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Agência</Label>
                <Input value={form.agencia} onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Conta</Label>
                <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Saldo hoje</Label>
                <CampoDeDinheiro
                  valorEmCentavos={form.saldoInicial}
                  onChange={(centavos) => setForm((f) => ({ ...f, saldoInicial: centavos }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Nesta data</Label>
                <Input
                  type="date"
                  value={form.dataDoSaldoInicial}
                  onChange={(e) => setForm((f) => ({ ...f, dataDoSaldoInicial: e.target.value }))}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O saldo de hoje é o ponto de partida. Daí em diante o sistema soma o que for recebido e
              subtrai o que for pago nesta conta.
            </p>

            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={form.padraoParaRecebimento}
                onCheckedChange={(v) => setForm((f) => ({ ...f, padraoParaRecebimento: v === true }))}
              />
              <span>
                Conta principal
                <span className="block text-xs text-muted-foreground">
                  Já vem escolhida ao lançar um recebimento.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={form.ativa}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativa: v === true }))}
              />
              <span>
                Conta ativa
                <span className="block text-xs text-muted-foreground">
                  Desmarque para tirar das listas sem perder o histórico.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConta(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvarConta.isPending}>
              {salvarConta.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTransferencia} onOpenChange={setDialogTransferencia}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir entre contas</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Sai de</Label>
              <Select
                value={transf.contaOrigemId || undefined}
                onValueChange={(v) => v && setTransf((t) => ({ ...t, contaOrigemId: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => ativas.find((c) => c.id === transf.contaOrigemId)?.nome ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ativas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} — {dinheiro(c.saldoAtual)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Vai para</Label>
              <Select
                value={transf.contaDestinoId || undefined}
                onValueChange={(v) => v && setTransf((t) => ({ ...t, contaDestinoId: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => ativas.find((c) => c.id === transf.contaDestinoId)?.nome ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ativas
                    .filter((c) => c.id !== transf.contaOrigemId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor</Label>
                <CampoDeDinheiro
                  valorEmCentavos={transf.valor}
                  onChange={(centavos) => setTransf((t) => ({ ...t, valor: centavos }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input
                  type="date"
                  value={transf.data}
                  onChange={(e) => setTransf((t) => ({ ...t, data: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input
                value={transf.descricao}
                placeholder="Reserva do 13º"
                onChange={(e) => setTransf((t) => ({ ...t, descricao: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferencia(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarTransferencia} disabled={transferir.isPending}>
              {transferir.isPending ? "Registrando…" : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CartaoDaConta({
  conta,
  onEditar,
  onApagar,
}: {
  conta: SaldoDaConta;
  onEditar: () => void;
  onApagar: () => void;
}) {
  const marca = banco(conta.banco);
  const negativo = conta.saldoAtual < 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-[18px] pl-5">
      {/* Faixa da cor do banco: com várias contas na tela, é o que identifica antes da leitura. */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: marca.cor }} aria-hidden />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-[15.5px] font-semibold break-words">{conta.nome}</h3>
            {conta.padraoParaRecebimento && <Badge variant="secondary">Principal</Badge>}
            {!conta.ativa && <Badge variant="outline">Encerrada</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {marca.nome}
            {conta.agencia ? ` · ag. ${conta.agencia}` : ""}
            {conta.numero ? ` · cc. ${conta.numero}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Editar conta" onClick={onEditar}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Apagar conta" onClick={onApagar}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <p
        className={`mt-3.5 font-heading font-mono text-[clamp(22px,2.4vw,28px)] leading-none font-semibold tracking-[-.03em] tabular-nums ${
          negativo ? "text-destructive-soft-foreground" : ""
        }`}
      >
        {dinheiro(conta.saldoAtual)}
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>
          Entrou <span className="font-mono tabular-nums text-foreground">{dinheiro(conta.recebido + conta.transferidoParaDentro)}</span>
        </span>
        <span>
          Saiu <span className="font-mono tabular-nums text-foreground">{dinheiro(conta.pago + conta.transferidoParaFora)}</span>
        </span>
        <span>
          A receber <span className="font-mono tabular-nums text-foreground">{dinheiro(conta.aReceber)}</span>
        </span>
        <span>
          A pagar <span className="font-mono tabular-nums text-foreground">{dinheiro(conta.aPagar)}</span>
        </span>
      </div>
    </div>
  );
}
