"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CamposDoValorPago, useValorPago } from "@/components/finance/valor-pago-com-diferenca";
import { Campo } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moedaDeCentavos, paraCentavos, rotuloDaSituacao, situacaoPelaData } from "@/lib/finance/diferenca-do-pagamento";
import { useBaixarDespesa, type ExpenseDto } from "@/lib/finance/use-expenses";
import { useBaixarReceita, type RevenueEntryDto } from "@/lib/finance/use-revenues";
import { useContas } from "@/lib/finance/use-tesouraria";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";

const NENHUMA = "__nenhuma__";

/** As formas que a baixa aceita, com o nome que o servidor espera. */
const FORMAS_DA_BAIXA: { valor: string; rotulo: string }[] = [
  { valor: "Dinheiro", rotulo: "Dinheiro" },
  { valor: "Pix", rotulo: "Pix" },
  { valor: "Boleto", rotulo: "Boleto" },
  { valor: "CartaoCredito", rotulo: "Cartão de crédito" },
  { valor: "CartaoDebito", rotulo: "Cartão de débito" },
  { valor: "Transferencia", rotulo: "Transferência" },
  { valor: "Outro", rotulo: "Outro" },
];

/** O que o formulário entrega: já com a divisão decidida e as datas no formato da API. */
interface DadosDaBaixa {
  dataPagamento: string;
  valorPago: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  contaFinanceiraId?: string;
  metodoPagamento?: string;
  observacao?: string;
}

/**
 * A forma gravada pode ser uma que a lista não conhece (texto livre de despesa antiga); só entra
 * como padrão se casar com uma das opções, ignorando maiúsculas e espaços.
 */
function formaConhecida(forma: string | null | undefined): string {
  const limpa = (forma ?? "").replace(/\s/g, "").toLowerCase();
  return FORMAS_DA_BAIXA.find((f) => f.valor.toLowerCase() === limpa)?.valor ?? "";
}

function DialogDeBaixa({
  titulo,
  descricao,
  rotuloDoValor,
  rotuloDoBotao,
  verbo,
  lancamento,
  valor,
  vencimento,
  contaInicial,
  formaInicial,
  comObservacao,
  pendente,
  onEnviar,
  onFechar,
}: {
  titulo: string;
  descricao: string;
  rotuloDoValor: string;
  rotuloDoBotao: string;
  verbo: "pago" | "recebido";
  lancamento: "despesa" | "receita";
  valor: number;
  vencimento: string;
  contaInicial: string | null;
  formaInicial: string | null;
  comObservacao: boolean;
  pendente: boolean;
  onEnviar: (dados: DadosDaBaixa) => Promise<void>;
  onFechar: () => void;
}) {
  const hoje = hojeIsoBrasilia();
  const { data: contas } = useContas();

  const valorPago = useValorPago(valor);
  const [data, setData] = useState(hoje);
  const [contaEscolhida, setContaEscolhida] = useState<string | null>(null);
  const [formaEscolhida, setFormaEscolhida] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // A conta da própria despesa ou receita; sem ela, a conta principal — lançamento sem conta
  // sai em branco na planilha do contador.
  const contaPadrao = contaInicial || (contas ?? []).find((c) => c.padraoParaRecebimento)?.id || "";
  const conta = contaEscolhida ?? contaPadrao;
  const forma = formaEscolhida ?? formaConhecida(formaInicial);
  const nomeDaConta = (contas ?? []).find((c) => c.id === conta)?.nome;

  const situacao = data && data <= hoje ? situacaoPelaData(vencimento, data) : null;

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();

    let problema: string | null = null;
    if (!data) problema = "Informe a data do pagamento.";
    else if (data > hoje) problema = "A data não pode ser no futuro. Use o dia em que o dinheiro realmente passou.";
    else problema = valorPago.problema;

    setErro(problema);
    if (problema) return;

    try {
      await onEnviar({
        dataPagamento: data,
        ...valorPago.corpo(),
        contaFinanceiraId: conta || undefined,
        metodoPagamento: forma || undefined,
        observacao: comObservacao ? observacao.trim() || undefined : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="break-words">{descricao}</DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <Campo id="baixa-data" rotulo="Data do pagamento">
            <Input
              id="baixa-data"
              type="date"
              value={data}
              max={hoje}
              onChange={(e) => {
                setData(e.target.value);
                setErro(null);
              }}
            />
          </Campo>

          {situacao && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              Vencimento em {formatarSoData(vencimento)}:
              <Badge variant={situacao.tipo === "atrasado" ? "overdue" : "success"}>{rotuloDaSituacao(situacao)}</Badge>
            </p>
          )}

          <CamposDoValorPago
            id="baixa"
            estado={valorPago}
            rotulo={rotuloDoValor}
            verbo={verbo}
            lancamento={lancamento}
            desabilitado={pendente}
          />

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="baixa-conta" rotulo="Conta">
              <Select value={conta || NENHUMA} onValueChange={(v) => v && setContaEscolhida(v === NENHUMA ? "" : String(v))}>
                <SelectTrigger id="baixa-conta" className="w-full">
                  <SelectValue>{() => nomeDaConta ?? "Não informar"}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NENHUMA}>Não informar</SelectItem>
                  {(contas ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="baixa-forma" rotulo="Forma de pagamento">
              <Select value={forma || NENHUMA} onValueChange={(v) => v && setFormaEscolhida(v === NENHUMA ? "" : String(v))}>
                <SelectTrigger id="baixa-forma" className="w-full">
                  <SelectValue>
                    {() => FORMAS_DA_BAIXA.find((f) => f.valor === forma)?.rotulo ?? "Não informar"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NENHUMA}>Não informar</SelectItem>
                  {FORMAS_DA_BAIXA.map((f) => (
                    <SelectItem key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          {comObservacao && (
            <Campo id="baixa-obs" rotulo="Observação (opcional)">
              <Input
                id="baixa-obs"
                value={observacao}
                maxLength={300}
                placeholder="Ex.: pago com atraso por causa do feriado"
                onChange={(e) => setObservacao(e.target.value)}
              />
            </Campo>
          )}

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={pendente}>
              {pendente ? "Salvando..." : rotuloDoBotao}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Registrar pagamento" de uma despesa: data real, valor real e a divisão da diferença. */
export function DialogRegistrarPagamento({ despesa: d, onFechar }: { despesa: ExpenseDto; onFechar: () => void }) {
  const baixar = useBaixarDespesa();

  return (
    <DialogDeBaixa
      titulo="Registrar pagamento"
      descricao={`${d.nome} · valor ${moedaDeCentavos(paraCentavos(d.valor))} · vence em ${formatarSoData(d.dataVencimento)}`}
      rotuloDoValor="Valor pago"
      rotuloDoBotao="Registrar pagamento"
      verbo="pago"
      lancamento="despesa"
      valor={d.valor}
      vencimento={d.dataVencimento.slice(0, 10)}
      contaInicial={d.bancoContaId ?? null}
      formaInicial={d.metodoPagamento ?? null}
      comObservacao
      pendente={baixar.isPending}
      onEnviar={async (dados) => {
        await baixar.mutateAsync({ id: d.id, ...dados });
        toast.success("Pagamento registrado.");
        onFechar();
      }}
      onFechar={onFechar}
    />
  );
}

/** "Registrar recebimento" de uma receita. */
export function DialogRegistrarRecebimento({ receita: r, onFechar }: { receita: RevenueEntryDto; onFechar: () => void }) {
  const baixar = useBaixarReceita();

  return (
    <DialogDeBaixa
      titulo="Registrar recebimento"
      descricao={`${r.description ?? "Receita"} · valor ${moedaDeCentavos(paraCentavos(r.expectedAmount))} · vence em ${formatarSoData(r.dueDate)}`}
      rotuloDoValor="Valor recebido"
      rotuloDoBotao="Registrar recebimento"
      verbo="recebido"
      lancamento="receita"
      valor={r.expectedAmount}
      vencimento={r.dueDate.slice(0, 10)}
      contaInicial={r.bancoContaId ?? null}
      formaInicial={null}
      comObservacao={false}
      pendente={baixar.isPending}
      onEnviar={async (dados) => {
        await baixar.mutateAsync({
          id: r.id,
          dataPagamento: dados.dataPagamento,
          valorRecebido: dados.valorPago,
          juros: dados.juros,
          multa: dados.multa,
          desconto: dados.desconto,
          contaFinanceiraId: dados.contaFinanceiraId,
          metodoPagamento: dados.metodoPagamento,
        });
        toast.success("Recebimento registrado.");
        onFechar();
      }}
      onFechar={onFechar}
    />
  );
}
