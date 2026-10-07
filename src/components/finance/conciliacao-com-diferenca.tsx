"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro } from "@/components/finance/campo-de-dinheiro";
import { ClassificarDiferenca, useDivisaoDaDiferenca } from "@/components/finance/classificar-diferenca";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  diferencaComSinal,
  diferencaEmCentavos,
  moedaDeCentavos,
  paraCentavos,
  paraReais,
} from "@/lib/finance/diferenca-do-pagamento";
import {
  useConciliar,
  useLancamentosParaConciliar,
  type MovimentoDoExtrato,
  type SugestaoDeLancamento,
} from "@/lib/finance/use-conciliacao";
import { formatarSoData } from "@/lib/format/date";

/** Quanto o extrato tem a mais (ou a menos) que o lançamento, em centavos. */
export function diferencaDoCasamento(movimento: MovimentoDoExtrato, lancamento: SugestaoDeLancamento): number {
  return diferencaEmCentavos(paraCentavos(Math.abs(movimento.valor)), paraCentavos(lancamento.valor));
}

/** "extrato R$ 112,00 · lançamento R$ 100,00 · + R$ 12,00": a frase da sugestão com valor diferente. */
export function FraseDaDiferenca({
  movimento,
  lancamento,
}: {
  movimento: MovimentoDoExtrato;
  lancamento: SugestaoDeLancamento;
}) {
  const diferenca = diferencaDoCasamento(movimento, lancamento);
  if (diferenca === 0) return null;
  return (
    <>
      extrato {moedaDeCentavos(paraCentavos(Math.abs(movimento.valor)))} · lançamento{" "}
      {moedaDeCentavos(paraCentavos(lancamento.valor))} ·{" "}
      <span className="font-medium text-foreground">{diferencaComSinal(diferenca)}</span>
    </>
  );
}

/**
 * Conciliar uma linha do extrato com um lançamento. Cuida do envio e do aviso na tela; quem
 * chama só diz qual lançamento e, se o valor difere, a divisão escolhida.
 */
function useCasar(movimento: MovimentoDoExtrato, aoConcluir: () => void) {
  const conciliar = useConciliar();

  async function casar(lancamento: SugestaoDeLancamento, divisao?: { juros: number; multa: number; desconto: number }) {
    try {
      await conciliar.mutateAsync({
        id: movimento.id,
        tipo: lancamento.tipo,
        lancamentoId: lancamento.id,
        ...(divisao
          ? {
              juros: paraReais(divisao.juros),
              multa: paraReais(divisao.multa),
              desconto: paraReais(divisao.desconto),
            }
          : {}),
      });
      toast.success("Conciliado.");
      aoConcluir();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conciliar.");
    }
  }

  return { casar, pendente: conciliar.isPending };
}

/**
 * Mini-passo "Classificar a diferença": a diferença entre o extrato e o lançamento vem dividida
 * (a mais vira juros, a menos vira desconto) e a pessoa ajusta antes de conciliar.
 */
function PassoDeClassificar({
  movimento,
  lancamento,
  pendente,
  onVoltar,
  onConfirmar,
}: {
  movimento: MovimentoDoExtrato;
  lancamento: SugestaoDeLancamento;
  pendente: boolean;
  onVoltar: () => void;
  onConfirmar: (divisao: { juros: number; multa: number; desconto: number }) => void;
}) {
  const diferenca = diferencaDoCasamento(movimento, lancamento);
  const { divisao, mudar, erro } = useDivisaoDaDiferenca(diferenca);

  return (
    <>
      <div className="grid gap-1 rounded-lg border border-border px-3 py-2.5 text-sm">
        <p className="break-words font-medium">{lancamento.descricao}</p>
        <p className="text-xs text-muted-foreground">
          <FraseDaDiferenca movimento={movimento} lancamento={lancamento} />
        </p>
      </div>

      <ClassificarDiferenca
        diferenca={diferenca}
        divisao={divisao}
        onMudar={mudar}
        erro={erro}
        desabilitado={pendente}
        idBase="conciliar"
        frase={
          diferenca > 0
            ? `O extrato tem ${moedaDeCentavos(diferenca)} a mais que o lançamento.`
            : `O extrato tem ${moedaDeCentavos(-diferenca)} a menos que o lançamento.`
        }
      />

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pendente} onClick={onVoltar}>
          Voltar
        </Button>
        <Button type="button" variant="action" disabled={pendente || erro !== null} onClick={() => onConfirmar(divisao)}>
          {pendente ? "Conciliando..." : "Conciliar com esta diferença"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** O passo de classificar, sozinho, para a sugestão com valor diferente. */
export function DialogDeDiferenca({
  movimento,
  lancamento,
  onFechar,
}: {
  movimento: MovimentoDoExtrato;
  lancamento: SugestaoDeLancamento;
  onFechar: () => void;
}) {
  const { casar, pendente } = useCasar(movimento, onFechar);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Classificar a diferença</DialogTitle>
          <DialogDescription>
            O valor do extrato não é o do lançamento. Diga se a diferença foi juros, multa ou desconto para o caixa
            ficar certo.
          </DialogDescription>
        </DialogHeader>
        <PassoDeClassificar
          movimento={movimento}
          lancamento={lancamento}
          pendente={pendente}
          onVoltar={onFechar}
          onConfirmar={(divisao) => casar(lancamento, divisao)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Procurar outro lançamento": busca entre os lançamentos em aberto (até 50), por texto, tipo e
 * valor aproximado. Se o escolhido tem valor diferente, segue para o passo de classificar.
 */
export function DialogDeBusca({ movimento, onFechar }: { movimento: MovimentoDoExtrato; onFechar: () => void }) {
  const valorDoMovimento = paraCentavos(Math.abs(movimento.valor));

  // Os campos editam; a busca só muda quando a pessoa manda procurar, para não consultar a cada letra.
  const [tipo, setTipo] = useState<"Receita" | "Despesa">(movimento.valor >= 0 ? "Receita" : "Despesa");
  const [texto, setTexto] = useState("");
  const [valor, setValor] = useState<number | null>(valorDoMovimento);
  const [aplicada, setAplicada] = useState({ tipo, busca: "", valorAproximado: paraReais(valorDoMovimento) as number | null });
  const [escolhido, setEscolhido] = useState<SugestaoDeLancamento | null>(null);

  const { data, isLoading, isError, isFetching } = useLancamentosParaConciliar(aplicada);
  const { casar, pendente } = useCasar(movimento, onFechar);

  function procurar(e: React.FormEvent) {
    e.preventDefault();
    setAplicada({ tipo, busca: texto, valorAproximado: valor ? paraReais(valor) : null });
  }

  function escolher(lancamento: SugestaoDeLancamento) {
    if (diferencaDoCasamento(movimento, lancamento) === 0) return void casar(lancamento);
    setEscolhido(lancamento);
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{escolhido ? "Classificar a diferença" : "Procurar outro lançamento"}</DialogTitle>
          <DialogDescription className="break-words">
            {escolhido
              ? "O valor do extrato não é o do lançamento. Diga se a diferença foi juros, multa ou desconto."
              : `Linha do extrato: ${movimento.descricao || "sem descrição"} · ${moedaDeCentavos(valorDoMovimento)}. Procure entre o que está em aberto e ainda não foi casado.`}
          </DialogDescription>
        </DialogHeader>

        {escolhido ? (
          <PassoDeClassificar
            movimento={movimento}
            lancamento={escolhido}
            pendente={pendente}
            onVoltar={() => setEscolhido(null)}
            onConfirmar={(divisao) => casar(escolhido, divisao)}
          />
        ) : (
          <>
            <form onSubmit={procurar} noValidate className="grid gap-3">
              <div className="flex w-max gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Tipo de lançamento">
                {(["Receita", "Despesa"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tipo === t}
                    onClick={() => setTipo(t)}
                    className={`shrink-0 rounded-[9px] px-3.5 py-2 text-[13.5px] whitespace-nowrap transition-colors ${
                      tipo === t
                        ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                        : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "Receita" ? "Receitas" : "Despesas"}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Campo id="busca-texto" rotulo="Descrição, nome ou fornecedor">
                  <Input
                    id="busca-texto"
                    value={texto}
                    placeholder="Ex.: mensalidade, energia"
                    onChange={(e) => setTexto(e.target.value)}
                  />
                </Campo>
                <Campo id="busca-valor" rotulo="Valor aproximado">
                  <CampoDeDinheiro id="busca-valor" valorEmCentavos={valor} onChange={setValor} />
                </Campo>
              </div>
              <p className="text-xs text-muted-foreground">
                Com o valor preenchido, aparecem só os lançamentos até 30% (ou R$ 50) distantes dele. Apague o valor para
                ver todos.
              </p>

              <div>
                <Button type="submit" variant="outline" disabled={isFetching}>
                  <Search />
                  {isFetching ? "Procurando..." : "Procurar"}
                </Button>
              </div>
            </form>

            <div className="grid gap-1.5" aria-live="polite">
              {isLoading && <Skeleton className="h-16 w-full" />}
              {isError && <p className="text-sm text-destructive">Não foi possível procurar os lançamentos.</p>}
              {data && data.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum lançamento em aberto encontrado. Mude o valor ou o texto e procure de novo.
                </p>
              )}
              {data?.map((s) => {
                const diferenca = diferencaDoCasamento(movimento, s);
                return (
                  <div
                    key={`${s.tipo}-${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm break-words">
                        {s.descricao}{" "}
                        <Badge variant="outline">{s.tipo === "Receita" ? "Receita" : "Despesa"}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {diferenca === 0 ? (
                          <>{moedaDeCentavos(paraCentavos(s.valor))}</>
                        ) : (
                          <FraseDaDiferenca movimento={movimento} lancamento={s} />
                        )}{" "}
                        · vence {formatarSoData(s.vencimento)}
                      </p>
                    </div>
                    <Button size="sm" disabled={pendente} onClick={() => escolher(s)}>
                      {diferenca === 0 ? "É este" : "Escolher"}
                    </Button>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFechar}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
