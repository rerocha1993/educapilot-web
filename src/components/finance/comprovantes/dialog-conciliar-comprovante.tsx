"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

import { VisualizadorDoComprovante } from "@/components/finance/comprovantes/arquivo-do-comprovante";
import { Campo } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useLancamentosParaConciliar, type SugestaoDeLancamento } from "@/lib/finance/use-conciliacao";
import {
  useConciliarComprovante,
  useMovimentosSugeridos,
  type ComprovanteRecebido,
  type MovimentoSugerido,
} from "@/lib/finance/use-comprovantes";
import {
  diferencaComSinal,
  diferencaEmCentavos,
  moedaDeCentavos,
  paraCentavos,
} from "@/lib/finance/diferenca-do-pagamento";
import { useContas } from "@/lib/finance/use-tesouraria";
import { formatarSoData } from "@/lib/format/date";
import { cn } from "@/lib/utils";

const TODAS_AS_CONTAS = "__todas__";

type Modo = "criar" | "casar";

/** "mesmo valor" ou "R$ 2,00 a mais que o comprovante": a diferença entre a linha e o valor lido, em frase. */
function fraseDoValor(diferenca: number | null | undefined): string {
  const centavos = paraCentavos(diferenca);
  if (centavos === 0) return "mesmo valor do comprovante";
  return `${moedaDeCentavos(Math.abs(centavos))} a ${centavos > 0 ? "mais" : "menos"} que o comprovante`;
}

function fraseDosDias(dias: number | null | undefined): string {
  if (!dias) return "mesma data do comprovante";
  return `${dias} ${dias === 1 ? "dia" : "dias"} de diferença`;
}

/** A linha do extrato que está sendo casada, em resumo (passo 2). */
function ResumoDoMovimento({ movimento: m }: { movimento: MovimentoSugerido }) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium break-words">{m.descricao || "Sem descrição"}</span>
        <span className="font-mono font-medium tabular-nums">{moedaDeCentavos(paraCentavos(m.valor))}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {m.contaNome ?? "Conta"} · {formatarSoData(m.data)}
      </p>
    </div>
  );
}

/** Passo 1: as saídas do extrato que parecem ser este comprovante. */
function PassoDeEscolherAMovimento({
  comprovante: c,
  onEscolher,
}: {
  comprovante: ComprovanteRecebido;
  onEscolher: (m: MovimentoSugerido) => void;
}) {
  const { data: contas } = useContas();
  const [contaId, setContaId] = useState("");
  const { data, isLoading, isError, refetch } = useMovimentosSugeridos(c.id, contaId);

  const semLeitura = c.valorLido == null || !c.dataLida;
  const nomeDaConta = (contas ?? []).find((x) => x.id === contaId)?.nome;

  return (
    <div className="grid gap-3.5">
      <Campo id="conc-conta" rotulo="Conta do extrato">
        <Select value={contaId || TODAS_AS_CONTAS} onValueChange={(v) => v && setContaId(v === TODAS_AS_CONTAS ? "" : String(v))}>
          <SelectTrigger id="conc-conta" className="w-full">
            <SelectValue>{() => (contaId ? (nomeDaConta ?? "Conta escolhida") : "Todas as contas")}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODAS_AS_CONTAS}>Todas as contas</SelectItem>
            {(contas ?? []).map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      <div className="grid gap-2" aria-live="polite">
        {isLoading && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}

        {isError && (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível procurar no extrato.{" "}
            <button type="button" onClick={() => refetch()} className="font-semibold underline">
              Tentar de novo
            </button>
          </p>
        )}

        {data && data.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground">
              {data.length === 1 ? "Esta saída parece ser o pagamento:" : "Qual destas saídas é o pagamento?"}
            </p>
            {data.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm break-words">{m.descricao || "Sem descrição"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.contaNome ?? "Conta"} · {formatarSoData(m.data)} ·{" "}
                    <span className="font-mono tabular-nums">{moedaDeCentavos(paraCentavos(m.valor))}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fraseDoValor(m.diferencaDeValor)} · {fraseDosDias(m.diasDeDiferenca)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onEscolher(m)}>
                  Escolher
                </Button>
              </div>
            ))}
          </>
        )}

        {data && data.length === 0 && (
          <div className="grid gap-2.5 rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
            <p>
              {semLeitura
                ? "Sem o valor e a data lidos, não dá para procurar no extrato. Confira o comprovante e lance como despesa ou no projeto."
                : "Nenhuma saída parecida no extrato; importe o extrato da conta primeiro."}
            </p>
            {!semLeitura && (
              <div>
                <Link href="/finance/conciliacao" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Ir para a Conciliação
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Passo 2, opção "casar": procura entre as despesas em aberto e mostra o que muda se casar. */
function BuscaDaDespesa({
  movimento: m,
  escolhida,
  onEscolher,
}: {
  movimento: MovimentoSugerido;
  escolhida: SugestaoDeLancamento | null;
  onEscolher: (s: SugestaoDeLancamento) => void;
}) {
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const { data, isLoading, isError, isFetching } = useLancamentosParaConciliar({
    tipo: "Despesa",
    busca,
    valorAproximado: m.valor,
    contaId: m.contaId,
  });

  function procurar(e: React.FormEvent) {
    e.preventDefault();
    setBusca(texto);
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={procurar} noValidate className="flex items-end gap-2">
        <Campo id="conc-busca" rotulo="Descrição ou fornecedor (opcional)" className="flex-1">
          <Input
            id="conc-busca"
            value={texto}
            placeholder="Ex.: papelaria, energia"
            onChange={(e) => setTexto(e.target.value)}
          />
        </Campo>
        <Button type="submit" variant="outline" disabled={isFetching}>
          <Search />
          Procurar
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Aparecem as despesas em aberto com valor perto de {moedaDeCentavos(paraCentavos(m.valor))}.
      </p>

      <div className="grid gap-1.5" aria-live="polite">
        {isLoading && <Skeleton className="h-14 w-full" />}
        {isError && <p className="text-sm text-destructive">Não foi possível procurar as despesas.</p>}
        {data && data.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
            Nenhuma despesa em aberto parecida. Mude o texto ou crie a despesa a partir do comprovante.
          </p>
        )}
        {data?.map((s) => {
          const marcada = escolhida?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={marcada}
              onClick={() => onEscolher(s)}
              className={cn(
                "grid gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                marcada ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <span className="text-sm break-words">{s.descricao}</span>
              <span className="text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{moedaDeCentavos(paraCentavos(s.valor))}</span> · vence{" "}
                {formatarSoData(s.vencimento)}
                {s.categoria ? ` · ${s.categoria}` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {escolhida && <DiferencaDaDespesa movimento={m} despesa={escolhida} />}
    </div>
  );
}

/** O que acontece quando a despesa escolhida tem valor diferente do que saiu no extrato. */
function DiferencaDaDespesa({ movimento: m, despesa }: { movimento: MovimentoSugerido; despesa: SugestaoDeLancamento }) {
  const diferenca = diferencaEmCentavos(paraCentavos(m.valor), paraCentavos(despesa.valor));

  if (diferenca === 0) {
    return (
      <p className="rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success-soft-foreground">
        O valor da despesa é o mesmo que saiu no extrato. O comprovante será anexado a ela.
      </p>
    );
  }

  return (
    <div className="grid gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[13px]">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          Extrato {moedaDeCentavos(paraCentavos(m.valor))} · despesa {moedaDeCentavos(paraCentavos(despesa.valor))}
        </span>
        <span className="font-mono font-medium tabular-nums">{diferencaComSinal(diferenca)}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {diferenca > 0
          ? "Saiu mais do que o lançado: a diferença vira juros"
          : "Saiu menos do que o lançado: a diferença vira desconto"}
        . Calculamos sozinhos; você pode ajustar depois na despesa.
      </p>
    </div>
  );
}

/** Passo 2: criar a despesa ou casar com uma já cadastrada. */
function PassoDeConfirmar({
  movimento: m,
  modo,
  onModo,
  despesa,
  onDespesa,
}: {
  movimento: MovimentoSugerido;
  modo: Modo;
  onModo: (m: Modo) => void;
  despesa: SugestaoDeLancamento | null;
  onDespesa: (s: SugestaoDeLancamento | null) => void;
}) {
  const opcoes: { valor: Modo; titulo: string; texto: string }[] = [
    {
      valor: "criar",
      titulo: "Criar a despesa paga a partir deste comprovante",
      texto: "A despesa nasce paga, com o valor e a data da linha do extrato.",
    },
    {
      valor: "casar",
      titulo: "Casar com uma despesa já cadastrada",
      texto: "Para quando a despesa já está lançada e só falta dar baixa. O comprovante vai para ela.",
    },
  ];

  return (
    <div className="grid gap-3.5">
      <ResumoDoMovimento movimento={m} />

      <fieldset className="grid gap-2">
        <legend className="sr-only">O que fazer com esta linha do extrato</legend>
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5",
              modo === o.valor ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            )}
          >
            <input
              type="radio"
              name="modo-da-conciliacao"
              checked={modo === o.valor}
              onChange={() => {
                onModo(o.valor);
                onDespesa(null);
              }}
              className="mt-1 size-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">{o.titulo}</span>
              <span className="block text-xs text-muted-foreground">{o.texto}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {modo === "casar" && <BuscaDaDespesa movimento={m} escolhida={despesa} onEscolher={onDespesa} />}
    </div>
  );
}

/**
 * Conciliar o comprovante com o extrato: primeiro escolhe a linha (as sugestões do servidor),
 * depois decide se cria a despesa paga ou casa com uma já cadastrada. No fim, o arquivo fica
 * anexado à linha do extrato e à despesa, e o comprovante sai de "a lançar".
 */
export function DialogConciliarComprovante({
  comprovante: c,
  onFechar,
}: {
  comprovante: ComprovanteRecebido;
  onFechar: () => void;
}) {
  const router = useRouter();
  const conciliar = useConciliarComprovante();

  const [movimento, setMovimento] = useState<MovimentoSugerido | null>(null);
  const [modo, setModo] = useState<Modo>("criar");
  const [despesa, setDespesa] = useState<SugestaoDeLancamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeConfirmar = movimento !== null && (modo === "criar" || despesa !== null);

  async function confirmar() {
    if (!movimento) return;
    setErro(null);
    try {
      await conciliar.mutateAsync({
        id: c.id,
        dados: {
          contaFinanceiraId: movimento.contaId,
          movimentoId: movimento.id,
          lancamentoId: modo === "casar" ? despesa?.id : undefined,
        },
      });
      toast.success(
        modo === "casar" ? "Conciliado com a despesa já cadastrada." : "Despesa criada e conciliada com o extrato.",
        { action: { label: "Ver a conciliação", onClick: () => router.push("/finance/conciliacao") } }
      );
      onFechar();
    } catch (err) {
      // 409 (linha já conciliada, mês fechado) e os demais trazem a frase do servidor.
      setErro(err instanceof Error ? err.message : "Não foi possível conciliar o comprovante.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !conciliar.isPending && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Conciliar com o extrato</DialogTitle>
          <DialogDescription>
            {movimento
              ? "Diga o que fazer com esta linha do extrato. O comprovante fica anexado a ela."
              : "Procure no extrato do banco a saída que é o pagamento deste comprovante."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <VisualizadorDoComprovante comprovante={c} className="min-w-0" />

          <div className="grid min-w-0 gap-3.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <Badge variant="outline">Comprovante</Badge>
              <span className="font-mono font-medium tabular-nums">
                {c.valorLido == null ? "valor não lido" : moedaDeCentavos(paraCentavos(c.valorLido))}
              </span>
              <span className="text-muted-foreground">
                {c.dataLida ? formatarSoData(c.dataLida) : "data não lida"}
                {c.fornecedorLido ? ` · ${c.fornecedorLido}` : ""}
              </span>
            </p>

            {movimento ? (
              <PassoDeConfirmar
                movimento={movimento}
                modo={modo}
                onModo={setModo}
                despesa={despesa}
                onDespesa={setDespesa}
              />
            ) : (
              <PassoDeEscolherAMovimento comprovante={c} onEscolher={setMovimento} />
            )}

            {erro && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          {movimento && (
            <Button
              variant="outline"
              disabled={conciliar.isPending}
              onClick={() => {
                setMovimento(null);
                setDespesa(null);
                setErro(null);
              }}
              className="sm:mr-auto"
            >
              <ArrowLeft />
              Escolher outra linha
            </Button>
          )}
          <Button variant="outline" disabled={conciliar.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          {movimento && (
            <Button variant="action" disabled={conciliar.isPending || !podeConfirmar} onClick={confirmar}>
              {conciliar.isPending ? "Conciliando..." : "Conciliar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
