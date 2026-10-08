"use client";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { BarraDeSalvar, type EdicaoDoEstudo } from "@/components/finance/precificacao/rascunho";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDataHora } from "@/lib/format/date";
import { formatarPercentual } from "@/lib/finance/precificacao-formatar";
import { useIndicesEconomicos, type IndicesEconomicos } from "@/lib/finance/use-precificacao";
import { usePersistirEdicao } from "@/components/finance/precificacao/persistir";

type Indices = Partial<IndicesEconomicos>;

const temNumero = (i: Indices | undefined) =>
  !!i && [i.selicMeta, i.ipca12m, i.focusIpca, i.focusSelic].some((n) => n !== undefined && n !== null);

/**
 * Passo 2 — o próximo ano: Selic, IPCA e expectativas Focus do Banco Central, e as premissas que
 * o estudo usa (aumento geral, inadimplência, meses letivos, encargos).
 *
 * Rascunho consulta os índices ao vivo; o aprovado mostra a foto que ficou gravada nele.
 */
export function PassoIndices({ edicao }: { edicao: EdicaoDoEstudo }) {
  const { estudo, premissas, somenteLeitura } = edicao;
  const aoVivo = useIndicesEconomicos(somenteLeitura ? null : estudo.anoAlvo);
  const persistir = usePersistirEdicao(edicao);

  // Se a consulta de agora falhou mas o estudo guarda uma foto com números, a foto vale.
  const indices: Indices | undefined =
    aoVivo.data && (temNumero(aoVivo.data) || !temNumero(estudo.indices)) ? aoVivo.data : estudo.indices;
  const erro = aoVivo.data?.erro ?? (aoVivo.isError ? "Não foi possível consultar o Banco Central agora." : undefined);
  const ano = estudo.anoAlvo;
  const p = premissas.valor;

  const mudar = (parte: Partial<typeof p>) => premissas.editar((atual) => ({ ...atual, ...parte }));
  const sugestao = indices?.sugestaoDeAumento;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        O sistema busca os índices no Banco Central e sugere um aumento geral para {ano}. A sugestão é um ponto de
        partida: você decide o percentual e ainda pode mudar o aumento de cada custo no passo 1.
      </p>

      {aoVivo.isLoading && !somenteLeitura ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {erro && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {erro} Preencha o aumento geral à mão.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoDeIndice rotulo="Selic meta" valor={indices?.selicMeta} sufixo="ao ano" />
            <CartaoDeIndice rotulo="IPCA 12 meses" valor={indices?.ipca12m} sufixo="acumulado" />
            <CartaoDeIndice rotulo={`Focus IPCA ${ano}`} valor={indices?.focusIpca} sufixo="expectativa" />
            <CartaoDeIndice rotulo={`Focus Selic ${ano}`} valor={indices?.focusSelic} sufixo="expectativa" />
          </div>

          <p className="text-xs text-muted-foreground">
            {indices?.atualizadoEm ? `Atualizado em ${formatarDataHora(indices.atualizadoEm)}` : "Sem data de atualização"}
            {indices?.fonte ? ` · Fonte: ${indices.fonte}` : ""}
          </p>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="font-heading text-sm font-semibold">Premissas do estudo</h3>
          {!somenteLeitura && sugestao !== undefined && sugestao !== null && (
            <Button
              variant="outline"
              onClick={() => {
                mudar({ aumentoGeralPercentual: sugestao });
                toast.info(`Aumento geral em ${formatarPercentual(sugestao)}. Salve para gravar.`);
              }}
            >
              Usar {formatarPercentual(sugestao)} como aumento geral
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo id="p-aumento" rotulo="Aumento geral" dica="Vale para todo custo sem aumento próprio.">
            <CampoNumerico
              id="p-aumento"
              valor={p.aumentoGeralPercentual}
              onChange={(v) => mudar({ aumentoGeralPercentual: v ?? 0 })}
              sufixo="%"
              disabled={somenteLeitura}
            />
          </Campo>
          <Campo id="p-inadimplencia" rotulo="Inadimplência prevista" dica="Parte da receita que não deve entrar.">
            <CampoNumerico
              id="p-inadimplencia"
              valor={p.inadimplenciaPrevistaPercentual}
              onChange={(v) => mudar({ inadimplenciaPrevistaPercentual: v ?? 0 })}
              sufixo="%"
              min={0}
              max={100}
              disabled={somenteLeitura}
            />
          </Campo>
          <Campo id="p-meses" rotulo="Meses letivos" dica="Quantas mensalidades a escola cobra no ano.">
            <CampoNumerico
              id="p-meses"
              valor={p.mesesLetivos}
              onChange={(v) => mudar({ mesesLetivos: Math.round(v ?? 12) })}
              sufixo="meses"
              min={1}
              max={12}
              disabled={somenteLeitura}
              className="pr-14"
            />
          </Campo>
          <Campo id="p-encargos" rotulo="Encargos sobre a folha" dica="Somados ao salário das linhas de pessoal com CLT.">
            <CampoNumerico
              id="p-encargos"
              valor={p.encargosSobreFolhaPercentual}
              onChange={(v) => mudar({ encargosSobreFolhaPercentual: v ?? 0 })}
              sufixo="%"
              min={0}
              disabled={somenteLeitura}
            />
          </Campo>
        </div>
      </section>

      {!somenteLeitura && (
        <BarraDeSalvar
          sujo={premissas.sujo}
          salvando={persistir.salvando}
          onSalvar={persistir.salvar}
          onDescartar={premissas.descartar}
        />
      )}
    </div>
  );
}

function CartaoDeIndice({
  rotulo,
  valor,
  sufixo,
}: {
  rotulo: string;
  valor: number | undefined;
  sufixo: string;
}) {
  const ausente = valor === undefined || valor === null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-[12.5px] font-medium text-muted-foreground">{rotulo}</p>
      <p
        className={`mt-1.5 font-heading text-[24px] font-semibold tracking-[-.02em] tabular-nums ${
          ausente ? "text-muted-foreground" : ""
        }`}
      >
        {ausente ? "—" : formatarPercentual(valor)}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{sufixo}</p>
    </div>
  );
}
