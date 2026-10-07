"use client";

import { useId, useState } from "react";
import type { MesProjetado } from "@/lib/finance/use-painel-financeiro";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Entradas, saídas e a linha de saldo — realizado à esquerda, projeção à direita.
 *
 * SVG à mão em vez de biblioteca de gráfico: o desenho é uma barra dupla e uma linha, e uma
 * dependência de gráfico custaria mais em peso de página do que entrega aqui. O mais importante
 * do desenho é a fronteira entre o que aconteceu e o que é previsão — sem ela, a diretora lê os
 * dois com a mesma confiança, e só um dos dois merece.
 */
export function GraficoDeCaixa({ meses }: { meses: MesProjetado[] }) {
  const recorte = useId();
  const [ativo, setAtivo] = useState<number | null>(null);

  if (meses.length === 0) return null;

  const largura = 760;
  const altura = 240;
  const margem = { topo: 16, base: 28, esquerda: 8, direita: 8 };

  const areaAltura = altura - margem.topo - margem.base;
  const areaLargura = largura - margem.esquerda - margem.direita;
  const passo = areaLargura / meses.length;

  const maiorBarra = Math.max(1, ...meses.map((m) => Math.max(m.entradas, m.saidas)));
  const saldos = meses.map((m) => m.saldoAcumulado);
  const maiorSaldo = Math.max(...saldos, 0);
  const menorSaldo = Math.min(...saldos, 0);
  const faixaDoSaldo = Math.max(1, maiorSaldo - menorSaldo);

  const alturaDaBarra = (valor: number) => (valor / maiorBarra) * (areaAltura * 0.72);
  const yDoSaldo = (valor: number) =>
    margem.topo + areaAltura - ((valor - menorSaldo) / faixaDoSaldo) * areaAltura;

  const primeiroProjetado = meses.findIndex((m) => !m.realizado);
  const xDaFronteira =
    primeiroProjetado > 0 ? margem.esquerda + primeiroProjetado * passo : null;

  const linha = meses
    .map((m, i) => `${i === 0 ? "M" : "L"} ${margem.esquerda + passo * i + passo / 2} ${yDoSaldo(m.saldoAcumulado)}`)
    .join(" ");

  const destacado = ativo == null ? null : meses[ativo];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-chart-1" />
          Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-chart-2" />
          Saídas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-chart-3" />
          Saldo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] border border-dashed border-border" />
          Projeção
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-[240px] w-full min-w-[560px]"
          role="img"
          aria-label="Entradas, saídas e saldo por mês"
        >
          <defs>
            {/* A área da projeção ganha um hachurado leve: diz "isto ainda não aconteceu" sem
                precisar de legenda dentro do gráfico. */}
            <pattern id={`${recorte}-previsao`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-border" strokeWidth="1.5" />
            </pattern>
          </defs>

          {xDaFronteira != null && (
            <>
              <rect
                x={xDaFronteira}
                y={margem.topo}
                width={largura - margem.direita - xDaFronteira}
                height={areaAltura}
                fill={`url(#${recorte}-previsao)`}
                opacity="0.35"
              />
              <line
                x1={xDaFronteira}
                y1={margem.topo}
                x2={xDaFronteira}
                y2={margem.topo + areaAltura}
                className="stroke-border"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </>
          )}

          {/* Linha do zero do saldo: é o que separa "tem dinheiro" de "não tem". */}
          {menorSaldo < 0 && (
            <line
              x1={margem.esquerda}
              y1={yDoSaldo(0)}
              x2={largura - margem.direita}
              y2={yDoSaldo(0)}
              className="stroke-destructive-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {meses.map((m, i) => {
            const x = margem.esquerda + passo * i;
            const meio = x + passo / 2;
            const base = margem.topo + areaAltura;
            const larguraDaBarra = Math.min(14, passo * 0.26);

            return (
              <g
                key={`${m.ano}-${m.mes}`}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo((atual) => (atual === i ? null : atual))}
              >
                <rect x={x} y={margem.topo} width={passo} height={areaAltura} fill="transparent" />

                <rect
                  x={meio - larguraDaBarra - 2}
                  y={base - alturaDaBarra(m.entradas)}
                  width={larguraDaBarra}
                  height={alturaDaBarra(m.entradas)}
                  rx="3"
                  className="fill-chart-1"
                  opacity={m.realizado ? 1 : 0.45}
                />
                <rect
                  x={meio + 2}
                  y={base - alturaDaBarra(m.saidas)}
                  width={larguraDaBarra}
                  height={alturaDaBarra(m.saidas)}
                  rx="3"
                  className="fill-chart-2"
                  opacity={m.realizado ? 1 : 0.45}
                />

                <text
                  x={meio}
                  y={altura - 8}
                  textAnchor="middle"
                  className={`fill-muted-foreground text-[10px] ${ativo === i ? "font-semibold" : ""}`}
                >
                  {MESES[m.mes - 1]}
                </text>
              </g>
            );
          })}

          <path d={linha} fill="none" className="stroke-chart-3" strokeWidth="2" strokeLinejoin="round" />

          {meses.map((m, i) => (
            <circle
              key={`ponto-${m.ano}-${m.mes}`}
              cx={margem.esquerda + passo * i + passo / 2}
              cy={yDoSaldo(m.saldoAcumulado)}
              r={ativo === i ? 4 : 2.5}
              className="fill-chart-3"
            />
          ))}
        </svg>
      </div>

      <div className="min-h-[34px] text-xs">
        {destacado ? (
          <p className="flex flex-wrap gap-x-3.5 gap-y-1">
            <span className="font-medium">
              {MESES[destacado.mes - 1]}/{destacado.ano}
              {!destacado.realizado && " (previsto)"}
            </span>
            <span className="text-muted-foreground">
              Entradas <span className="font-mono tabular-nums text-foreground">{dinheiro(destacado.entradas)}</span>
            </span>
            <span className="text-muted-foreground">
              Saídas <span className="font-mono tabular-nums text-foreground">{dinheiro(destacado.saidas)}</span>
            </span>
            <span className="text-muted-foreground">
              Saldo{" "}
              <span
                className={`font-mono tabular-nums ${
                  destacado.saldoAcumulado < 0 ? "text-destructive-soft-foreground" : "text-foreground"
                }`}
              >
                {dinheiro(destacado.saldoAcumulado)}
              </span>
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Passe o mouse num mês para ver os números. À direita da linha tracejada é previsão,
            montada só com o que já está lançado.
          </p>
        )}
      </div>
    </div>
  );
}
