"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight, Info, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { GraficoDeCaixa } from "@/components/finance/grafico-de-caixa";
import {
  usePainelFinanceiro,
  type AlertaDoPainel,
  type Indicador,
  type LinhaDoResultado,
} from "@/lib/finance/use-painel-financeiro";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PainelFinanceiroPage() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const { data: painel, isLoading, isError, error } = usePainelFinanceiro(ano, mes);

  function mover(passo: number) {
    const referencia = new Date(ano, mes - 1 + passo, 1);
    setAno(referencia.getFullYear());
    setMes(referencia.getMonth() + 1);
  }

  const noFuturo = ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes >= hoje.getMonth() + 1);

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Painel"
        apoio={`${MESES[mes - 1]} de ${ano}`}
        acoes={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => mover(-1)}>
              −
            </Button>
            <Button variant="outline" size="icon" aria-label="Próximo mês" disabled={noFuturo} onClick={() => mover(1)}>
              +
            </Button>
          </div>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar o painel."}
        </div>
      )}

      {isLoading && (
        <>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
      )}

      {painel && (
        <>
          {painel.alertas.length > 0 && (
            <div className="flex flex-col gap-2">
              {painel.alertas.map((alerta) => (
                <Alerta key={alerta.codigo} alerta={alerta} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Cartao indicador={painel.recebido} rotulo="Entrou no mês" positivo />
            <Cartao indicador={painel.pago} rotulo="Saiu no mês" />
            <Cartao indicador={painel.resultado} rotulo="Sobrou" destacarSinal />
            <div className="rounded-xl border border-border bg-card p-[18px]">
              <p className="text-[12.5px] font-medium text-muted-foreground">Em caixa hoje</p>
              <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] tabular-nums">
                {dinheiro(painel.saldoEmCaixa)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Somando as contas ativas.</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-[18px]">
            <h2 className="font-heading text-[15.5px] font-semibold">Entradas, saídas e saldo</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Doze meses para trás e três à frente, para a decisão de hoje caber numa tela.
            </p>
            <div className="mt-3.5">
              <GraficoDeCaixa meses={painel.projecao} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <Resultado titulo="De onde veio o dinheiro" linhas={painel.receitas} />
            <Resultado titulo="Para onde foi" linhas={painel.despesas} />
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-[18px] lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-heading text-[15.5px] font-semibold">Mensalidade em atraso</h2>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {painel.cobrancasEmAtraso} cobrança(s), {dinheiro(painel.emAtraso)} no total.
                  </p>
                </div>
                <Link
                  href="/finance/inadimplencia"
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-muted"
                >
                  Ver quem
                </Link>
              </div>

              {painel.emAtraso === 0 ? (
                <p className="mt-3.5 text-sm text-muted-foreground">Nenhuma mensalidade em atraso.</p>
              ) : (
                <>
                  <div className="mt-3.5 flex flex-col gap-2">
                    {painel.aging.map((faixa) => {
                      const proporcao = painel.emAtraso === 0 ? 0 : (faixa.valor / painel.emAtraso) * 100;
                      return (
                        <div key={faixa.faixa} className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                            <span>
                              {faixa.faixa}
                              <span className="ml-1.5 text-muted-foreground">
                                {faixa.cobrancas} cobrança(s)
                              </span>
                            </span>
                            <span className="font-mono tabular-nums">{dinheiro(faixa.valor)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-chart-2"
                              style={{ width: `${Math.max(proporcao, faixa.valor > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {painel.atrasoPorTurma.length > 0 && (
                    <div className="mt-4 border-t border-border pt-3.5">
                      <p className="text-xs font-medium text-muted-foreground">Por turma</p>
                      <div className="mt-2 flex flex-col divide-y divide-border">
                        {painel.atrasoPorTurma.map((turma) => (
                          <div
                            key={`${turma.turmaId ?? "sem"}-${turma.turma}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-[12.5px]"
                          >
                            <span>
                              {turma.turma}
                              <span className="ml-1.5 text-muted-foreground">
                                {turma.alunos} aluno(s)
                              </span>
                            </span>
                            <span className="font-mono tabular-nums">{dinheiro(turma.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="rounded-xl border border-border bg-card p-[18px]">
                <p className="text-[12.5px] font-medium text-muted-foreground">Mensalidade média</p>
                <p className="mt-2 font-heading font-mono text-[clamp(20px,2.2vw,26px)] leading-none font-semibold tabular-nums">
                  {dinheiro(painel.ticketMedio)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Entre {painel.alunosComPlano} aluno(s) com plano ativo.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-[18px]">
                <h2 className="font-heading text-[15.5px] font-semibold">Maiores gastos do mês</h2>
                {painel.maioresGastos.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Nada pago neste mês ainda.</p>
                ) : (
                  <div className="mt-3 flex flex-col divide-y divide-border">
                    {painel.maioresGastos.map((gasto) => (
                      <div key={gasto.nome} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                        <span className="min-w-0 text-[12.5px] break-words">{gasto.nome}</span>
                        <span className="font-mono text-[12.5px] tabular-nums">{dinheiro(gasto.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Cartao({
  indicador,
  rotulo,
  positivo,
  destacarSinal,
}: {
  indicador: Indicador;
  rotulo: string;
  positivo?: boolean;
  destacarSinal?: boolean;
}) {
  const cor = destacarSinal
    ? indicador.valor < 0
      ? "text-destructive-soft-foreground"
      : "text-success-soft-foreground"
    : positivo
      ? "text-success-soft-foreground"
      : "";

  // A variação só vira texto quando houve base de comparação: "+∞%" contra um mês vazio não
  // informa nada e ainda parece uma notícia boa.
  const variacao = indicador.variacao;
  const subiu = variacao != null && variacao > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <p className="text-[12.5px] font-medium text-muted-foreground">{rotulo}</p>
      <p
        className={`mt-2 font-heading font-mono text-[clamp(20px,2.2vw,28px)] leading-none font-semibold tracking-[-.03em] tabular-nums ${cor}`}
      >
        {dinheiro(indicador.valor)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {variacao == null ? (
          "Sem mês anterior para comparar."
        ) : (
          <>
            <span className={subiu ? "text-success-soft-foreground" : "text-destructive-soft-foreground"}>
              {subiu ? "+" : ""}
              {variacao}%
            </span>{" "}
            vs. mês anterior
            {indicador.anoPassado != null && indicador.anoPassado !== 0 && (
              <> · {dinheiro(indicador.anoPassado)} no ano passado</>
            )}
          </>
        )}
      </p>
    </div>
  );
}

function Resultado({ titulo, linhas }: { titulo: string; linhas: LinhaDoResultado[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const total = linhas.reduce((soma, l) => soma + l.valor, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-[15.5px] font-semibold">{titulo}</h2>
        <span className="font-mono text-sm tabular-nums">{dinheiro(total)}</span>
      </div>

      {linhas.length === 0 ? (
        <p className="mt-3.5 text-sm text-muted-foreground">Nada lançado neste mês.</p>
      ) : (
        <div className="mt-3.5 flex flex-col gap-2.5">
          {linhas.map((linha) => {
            const expandido = aberto === linha.nome;
            return (
              <div key={linha.nome} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setAberto(expandido ? null : linha.nome)}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-left text-[12.5px]"
                >
                  <span className="flex items-center gap-1">
                    {expandido ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    {linha.nome}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-muted-foreground">{linha.percentual}%</span>
                    <span className="font-mono tabular-nums">{dinheiro(linha.valor)}</span>
                  </span>
                </button>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${linha.tipo === "Receita" ? "bg-chart-1" : "bg-chart-2"}`}
                    style={{ width: `${Math.max(linha.percentual, 2)}%` }}
                  />
                </div>

                {expandido && linha.contas.length > 0 && (
                  <div className="mt-1 ml-4.5 flex flex-col divide-y divide-border border-l border-border pl-2.5">
                    {linha.contas.map((conta) => (
                      <span
                        key={conta.nome}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-1 text-xs text-muted-foreground"
                      >
                        <span className="min-w-0 break-words">{conta.nome}</span>
                        <span className="font-mono tabular-nums">{dinheiro(conta.valor)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Alerta({ alerta }: { alerta: AlertaDoPainel }) {
  const estilo =
    alerta.gravidade === "grave"
      ? "border-destructive-border bg-destructive-soft text-destructive-soft-foreground"
      : alerta.gravidade === "atencao"
        ? "border-border bg-muted"
        : "border-border bg-card";

  const Icone = alerta.gravidade === "grave" ? TriangleAlert : alerta.gravidade === "atencao" ? AlertTriangle : Info;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm ${estilo}`}>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icone className="size-4 shrink-0" />
        <span className="break-words">{alerta.texto}</span>
      </span>
      {alerta.link && (
        <Link href={alerta.link} className="shrink-0 text-[12.5px] font-medium underline">
          Resolver
        </Link>
      )}
    </div>
  );
}
