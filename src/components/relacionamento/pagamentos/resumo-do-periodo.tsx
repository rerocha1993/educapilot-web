"use client";

import { Numero } from "@/components/finance/projetos/comum";
import type { FiltrosDeCobranca } from "@/components/relacionamento/pagamentos/filtros-de-cobranca";
import { ErroDeCarga } from "@/components/rh/campo";
import { formatarSoData, competenciaDeIso } from "@/lib/format/date";
import { MESES } from "@/lib/relacionamento/pagamentos-util";
import { useResumoDeCobrancas } from "@/lib/relacionamento/use-pagamentos";
import { formatarMoeda } from "@/lib/rh/formatar";

/**
 * Os quatro números do topo: quantas cobranças estão em aberto e vencidas, quanto falta receber e
 * quanto já foi recebido. Seguem o período de vencimento e a carteira escolhidos nos filtros;
 * sem período ("Tudo"), valem para o mês de hoje, e a frase de cima diz isso.
 */
export function ResumoDoPeriodo({ f }: { f: FiltrosDeCobranca }) {
  const { mes, ano } = competenciaDeIso(f.hoje);
  const resumo = useResumoDeCobrancas(mes, ano, { de: f.deValido, ate: f.ateValido, contaId: f.carteira });
  const dados = resumo.data;

  const porPeriodo = f.deValido !== "" || f.ateValido !== "";
  const frase =
    f.atalho === "este-mes"
      ? `Resumo de ${MESES[mes - 1]}`
      : porPeriodo
        ? `Resumo do período: ${f.deValido ? formatarSoData(f.deValido) : "o começo"} a ${f.ateValido ? formatarSoData(f.ateValido) : "sem data final"}`
        : `Resumo do mês de ${MESES[mes - 1]} (a lista abaixo mostra todas as cobranças)`;

  return (
    <section aria-label={frase} className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{frase}</p>
      {resumo.isError ? (
        <ErroDeCarga texto="Não foi possível carregar o resumo." onTentar={() => resumo.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <Numero rotulo="Em aberto" valor={dados ? String(dados.emAberto) : "—"} />
          <Numero
            rotulo="Vencidas"
            valor={dados ? String(dados.vencidas) : "—"}
            tom={dados && dados.vencidas > 0 ? "danger" : undefined}
          />
          <Numero rotulo="A receber" valor={dados ? formatarMoeda(dados.valorEmAberto) : "—"} />
          <Numero
            rotulo="Recebido"
            valor={dados ? formatarMoeda(dados.valorPagoNoMes) : "—"}
            tom={dados && dados.valorPagoNoMes > 0 ? "success" : undefined}
          />
        </div>
      )}
    </section>
  );
}
