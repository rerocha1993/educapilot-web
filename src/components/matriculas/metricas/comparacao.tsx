"use client";

import { Cartao, Variacao, duracao, numero, percentual } from "@/components/matriculas/metricas/pecas";
import type { IndicadorComparado, MetricasDoFunil } from "@/lib/matriculas/tipos";

/** Todos os indicadores principais do período, lado a lado com os do anterior. */
export function CartaoDaComparacao({ m }: { m: MetricasDoFunil }) {
  const p = m.periodo;
  return (
    <Cartao
      className="lg:col-span-2 print:col-span-2"
      titulo="Contra o período anterior"
      texto={
        p.anteriorDe && p.anteriorAte
          ? `O período anterior tem o mesmo tamanho (${p.dias} ${p.dias === 1 ? "dia" : "dias"}): de ${p.anteriorDe.split("-").reverse().join("/")} a ${p.anteriorAte.split("-").reverse().join("/")}.`
          : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[.1em] text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-bold">
                Indicador
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-bold">
                Agora
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-bold">
                Anterior
              </th>
              <th scope="col" className="py-1.5 font-bold">
                Variação
              </th>
            </tr>
          </thead>
          <tbody>
            {m.comparacao.map((c) => (
              <tr key={c.chave} className="border-b border-border/60 last:border-0">
                <th scope="row" className="py-2 pr-3 font-medium">
                  {c.titulo}
                </th>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{valor(c, c.atual)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{valor(c, c.anterior)}</td>
                <td className="py-2">
                  <Variacao item={c} curto />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Cartao>
  );
}

function valor(c: IndicadorComparado, v: number | null | undefined): string {
  if (v == null) return "—";
  if (c.unidade === "percentual") return percentual(v, 1);
  if (c.unidade === "horas") return duracao(v);
  return numero(v);
}
