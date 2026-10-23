"use client";

import { CelulaDoPrato } from "@/components/relacionamento/cardapio/celula";
import { chaveDaCelula, type CelulaEditada, type GradeEditada } from "@/lib/relacionamento/cardapio-edicao";
import { DIAS_DO_CARDAPIO, dataDoDiaDaGrade, rotuloDaRefeicao } from "@/lib/relacionamento/cardapio-vocabulario";
import { diaEMes } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

interface Props {
  /** Segunda-feira da semana ("yyyy-MM-dd"). */
  semana: string;
  dias: readonly string[];
  refeicoes: readonly string[];
  grade: GradeEditada;
  onChange: (chave: string, celula: CelulaEditada) => void;
  somenteLeitura?: boolean;
  /** Hoje, para destacar o dia da semana corrente. */
  hoje: string;
}

const dadosDoDia = (id: string) => DIAS_DO_CARDAPIO.find((d) => d.id === id) ?? DIAS_DO_CARDAPIO[0];

/**
 * A grade da semana: colunas são os dias, linhas são as refeições, e cada célula é um prato em
 * texto curto com as etiquetas dele. No computador é uma tabela densa; no celular vira uma lista
 * por dia (a tabela não cabe, e duas colunas de texto seriam ilegíveis). As duas visões editam o
 * mesmo estado.
 */
export function GradeDoCardapio({ semana, dias, refeicoes, grade, onChange, somenteLeitura = false, hoje }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <caption className="sr-only">Cardápio da semana: refeições por dia</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="w-[7.5rem] p-2 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                Refeição
              </th>
              {dias.map((d) => {
                const data = dataDoDiaDaGrade(semana, d);
                return (
                  <th
                    key={d}
                    scope="col"
                    className={cn("p-2 text-[12.5px] font-semibold", data === hoje && "bg-action-soft text-action-soft-foreground")}
                  >
                    {dadosDoDia(d).curto} <span className="font-normal text-muted-foreground tabular-nums">{diaEMes(data)}</span>
                    {data === hoje && <span className="ml-1 text-[11px] font-semibold">hoje</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {refeicoes.map((r) => (
              <tr key={r} className="border-b border-border last:border-b-0">
                <th scope="row" className="p-2 align-top text-[12.5px] font-semibold">
                  {rotuloDaRefeicao(r)}
                </th>
                {dias.map((d) => {
                  const chave = chaveDaCelula(d, r);
                  return (
                    <td key={d} className={cn("border-l border-border p-1.5 align-top", dataDoDiaDeHoje(semana, d, hoje) && "bg-action-soft/30")}>
                      <CelulaDoPrato
                        valor={grade[chave]}
                        rotulo={`${dadosDoDia(d).rotulo}, ${rotuloDaRefeicao(r).toLowerCase()}`}
                        onChange={(c) => onChange(chave, c)}
                        somenteLeitura={somenteLeitura}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="flex flex-col gap-2 md:hidden" aria-label="Cardápio por dia">
        {dias.map((d) => {
          const data = dataDoDiaDaGrade(semana, d);
          return (
            <li
              key={d}
              className={cn("rounded-xl border bg-card", data === hoje ? "border-action-border" : "border-border")}
            >
              <h3
                className={cn(
                  "flex items-baseline justify-between rounded-t-xl border-b px-3 py-2 text-[13.5px] font-semibold",
                  data === hoje ? "border-action-border bg-action-soft text-action-soft-foreground" : "border-border bg-muted/50"
                )}
              >
                <span>{dadosDoDia(d).rotulo}</span>
                <span className="text-[12px] font-normal tabular-nums">{data === hoje ? "hoje · " : ""}{diaEMes(data)}</span>
              </h3>
              <ul className="flex flex-col divide-y divide-border">
                {refeicoes.map((r) => {
                  const chave = chaveDaCelula(d, r);
                  return (
                    <li key={r} className="flex flex-col gap-1 p-2.5">
                      <span className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">{rotuloDaRefeicao(r)}</span>
                      <CelulaDoPrato
                        valor={grade[chave]}
                        rotulo={`${dadosDoDia(d).rotulo}, ${rotuloDaRefeicao(r).toLowerCase()}`}
                        onChange={(c) => onChange(chave, c)}
                        somenteLeitura={somenteLeitura}
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function dataDoDiaDeHoje(semana: string, dia: string, hoje: string): boolean {
  return dataDoDiaDaGrade(semana, dia) === hoje;
}
