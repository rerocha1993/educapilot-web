"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Campo } from "@/components/rh/campo";
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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financeiroJson } from "@/lib/finance/financeiro-api";
import { invalidarFinanceiro } from "@/lib/finance/invalidar-financeiro";
import { executarEmLote, type ResultadoDoLote } from "@/lib/finance/lote";
import { useContas } from "@/lib/finance/use-tesouraria";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { formatarMoeda } from "@/lib/rh/formatar";

const CADA_UMA = "__cada__";
const NENHUMA = "__nenhuma__";

const FORMAS: { valor: string; rotulo: string }[] = [
  { valor: "Dinheiro", rotulo: "Dinheiro" },
  { valor: "Pix", rotulo: "Pix" },
  { valor: "Boleto", rotulo: "Boleto" },
  { valor: "CartaoCredito", rotulo: "Cartão de crédito" },
  { valor: "CartaoDebito", rotulo: "Cartão de débito" },
  { valor: "Transferencia", rotulo: "Transferência" },
  { valor: "Outro", rotulo: "Outro" },
];

export interface ItemDoLote {
  id: string;
  /** Descrição curta, para a lista de falhas. */
  rotulo: string;
  valor: number;
  /** Conta (carteira) do lançamento, se tiver. */
  contaId?: string | null;
}

/**
 * Baixa de vários lançamentos de uma vez ("Registrar recebimento de N" e "Registrar pagamento de N").
 *
 * Cada item é baixado pelo valor previsto, na mesma data e forma, com a conta escolhida ou a conta
 * própria de cada lançamento. Juros e multa por atraso seguem a configuração da escola, como na
 * baixa individual. Quem precisa de valor diferente usa o botão da própria linha. O resultado mostra
 * o que deu certo e o motivo de cada falha; `onConcluir` recebe os que foram baixados.
 */
export function DialogDeBaixaEmLote({
  tipo,
  itens,
  onConcluir,
  onFechar,
}: {
  tipo: "receita" | "despesa";
  itens: ItemDoLote[];
  onConcluir: (baixados: string[]) => void;
  onFechar: () => void;
}) {
  const receita = tipo === "receita";
  const hoje = hojeIsoBrasilia();
  const queryClient = useQueryClient();
  const { data: contas } = useContas();

  const [data, setData] = useState(hoje);
  const [conta, setConta] = useState(CADA_UMA);
  const [forma, setForma] = useState(NENHUMA);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoDoLote | null>(null);

  const executando = progresso !== null && resultado === null;
  const soma = itens.reduce((s, i) => s + i.valor, 0);
  const porId = new Map(itens.map((i) => [i.id, i]));
  const nomeDaConta = (contas ?? []).find((c) => c.id === conta)?.nome;

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro(receita ? "Informe a data do recebimento." : "Informe a data do pagamento.");
    if (data > hoje) return setErro("A data não pode ser no futuro. Use o dia em que o dinheiro realmente passou.");
    setErro(null);
    setProgresso({ feitos: 0, total: itens.length });

    const caminho = receita ? "/api/RevenueEntries" : "/api/Expenses";
    const falha = receita ? "Não foi possível registrar o recebimento." : "Não foi possível registrar o pagamento.";

    const r = await executarEmLote(
      itens.map((i) => i.id),
      (id) => {
        const item = porId.get(id);
        const contaFinanceiraId =
          conta === CADA_UMA ? (item?.contaId ?? undefined) : conta === NENHUMA ? undefined : conta;
        return financeiroJson(
          `${caminho}/${id}/baixar`,
          {
            method: "POST",
            body: JSON.stringify({
              dataPagamento: data,
              contaFinanceiraId,
              metodoPagamento: forma === NENHUMA ? undefined : forma,
            }),
          },
          falha
        );
      },
      (feitos, total) => setProgresso({ feitos, total })
    );

    // Uma releitura só, no fim: invalidar a cada item faria a lista piscar N vezes.
    invalidarFinanceiro(queryClient);
    setResultado(r);
    onConcluir(r.feitos);
  }

  const titulo = receita ? `Registrar recebimento de ${itens.length}` : `Registrar pagamento de ${itens.length}`;
  const feitos = resultado?.feitos.length ?? 0;
  const falhas = resultado?.falhas.length ?? 0;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !executando && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {resultado
              ? "Veja como ficou."
              : `Cada uma é baixada pelo valor previsto, somando ${formatarMoeda(soma)}. Juros e multa por atraso seguem a regra da escola.`}
          </DialogDescription>
        </DialogHeader>

        {!resultado && (
          <form onSubmit={confirmar} noValidate className="grid gap-3.5">
            <Campo id="lote-data" rotulo={receita ? "Data do recebimento" : "Data do pagamento"}>
              <Input
                id="lote-data"
                type="date"
                value={data}
                max={hoje}
                disabled={executando}
                onChange={(e) => {
                  setData(e.target.value);
                  setErro(null);
                }}
              />
            </Campo>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo id="lote-conta" rotulo={receita ? "Carteira" : "Conta"}>
                <Select value={conta} onValueChange={(v) => v && setConta(String(v))} disabled={executando}>
                  <SelectTrigger id="lote-conta" className="w-full">
                    <SelectValue>
                      {() =>
                        conta === CADA_UMA ? "A de cada lançamento" : conta === NENHUMA ? "Não informar" : (nomeDaConta ?? "—")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value={CADA_UMA}>A de cada lançamento</SelectItem>
                    {(contas ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value={NENHUMA}>Não informar</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>
              <Campo id="lote-forma" rotulo="Forma de pagamento">
                <Select value={forma} onValueChange={(v) => v && setForma(String(v))} disabled={executando}>
                  <SelectTrigger id="lote-forma" className="w-full">
                    <SelectValue>{() => FORMAS.find((f) => f.valor === forma)?.rotulo ?? "Não informar"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value={NENHUMA}>Não informar</SelectItem>
                    {FORMAS.map((f) => (
                      <SelectItem key={f.valor} value={f.valor}>
                        {f.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
            </div>

            {executando && progresso && (
              <div aria-live="polite" className="grid gap-1.5">
                <Progress value={Math.round((progresso.feitos / progresso.total) * 100)} />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {progresso.feitos} de {progresso.total}
                </p>
              </div>
            )}

            {erro && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={executando} onClick={onFechar}>
                Cancelar
              </Button>
              <Button type="submit" variant="action" disabled={executando}>
                {executando ? "Registrando..." : titulo}
              </Button>
            </DialogFooter>
          </form>
        )}

        {resultado && (
          <div className="grid gap-3.5">
            <p className="text-sm" aria-live="polite">
              <span className="font-numeric font-semibold">{feitos}</span>{" "}
              {receita
                ? feitos === 1
                  ? "recebimento registrado"
                  : "recebimentos registrados"
                : feitos === 1
                  ? "pagamento registrado"
                  : "pagamentos registrados"}
              {falhas > 0 && (
                <>
                  {" "}e <span className="font-numeric font-semibold text-destructive">{falhas}</span> com problema
                </>
              )}
              .
            </p>

            {falhas > 0 && resultado && (
              <>
                <ul className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-destructive-border bg-destructive-soft p-2.5 text-[13px] text-destructive-soft-foreground">
                  {resultado.falhas.map((f) => (
                    <li key={f.id} className="break-words">
                      <span className="font-medium">{porId.get(f.id)?.rotulo ?? "Lançamento"}</span>: {f.mensagem}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Os que deram problema continuam marcados na lista, para você corrigir e tentar de novo.
                </p>
              </>
            )}

            <DialogFooter>
              <Button variant="action" onClick={onFechar}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
