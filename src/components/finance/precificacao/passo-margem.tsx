"use client";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { Celula } from "@/components/finance/precificacao/celula";
import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { usePersistirEdicao } from "@/components/finance/precificacao/persistir";
import { BarraDeSalvar, type EdicaoDoEstudo } from "@/components/finance/precificacao/rascunho";
import { Campo } from "@/components/rh/campo";
import { formatarPercentual, formatarReajuste } from "@/lib/finance/precificacao-formatar";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const COLUNAS = "md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_9.5rem_minmax(0,1fr)_5.5rem] md:items-center";

/** Reajuste negativo é mensalidade que cairia: vermelho. Positivo segue a cor do texto. */
const corDoReajuste = (v: number | undefined | null) =>
  v !== undefined && v !== null && v < 0 ? "font-semibold text-destructive" : "";

/**
 * Passo 4 — margem e retorno: quanto a escola quer sobrar além do custo, o resultado disso e o
 * valor de cada turma. A "mensalidade definida" é a decisão da pessoa: vale no lugar do alvo.
 */
export function PassoMargem({ edicao }: { edicao: EdicaoDoEstudo }) {
  const { estudo, premissas, alvos, somenteLeitura } = edicao;
  const persistir = usePersistirEdicao(edicao);
  const r = estudo.resultado;
  const p = premissas.valor;

  // Receita necessária: o custo do ano mais a margem sobre ele, mais o retorno que a escola quer
  // tirar. Calculada com o estudo salvo, junto dos demais números do servidor.
  const receitaNecessaria =
    r.custoAnual * (1 + estudo.margemDesejadaPercentual / 100) + estudo.retornoAnualDesejado;

  const definidaDe = (id: string) => alvos.valor.find((a) => a.id === id)?.mensalidadeDefinida ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <Campo
            id="p-margem"
            rotulo="Margem desejada"
            dica="Quanto a receita deve passar do custo, em %. Ex.: 15% de margem sobre R$ 100 mil de custo pede R$ 115 mil."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.min(100, Math.max(0, p.margemDesejadaPercentual))}
                disabled={somenteLeitura}
                aria-label="Margem desejada"
                onChange={(e) => premissas.editar((a) => ({ ...a, margemDesejadaPercentual: Number(e.target.value) }))}
                className="h-2 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <CampoNumerico
                id="p-margem"
                valor={p.margemDesejadaPercentual}
                onChange={(v) => premissas.editar((a) => ({ ...a, margemDesejadaPercentual: v ?? 0 }))}
                sufixo="%"
                min={0}
                disabled={somenteLeitura}
                className="w-28"
              />
            </div>
          </Campo>
        </div>

        <Campo
          id="p-retorno"
          rotulo="Retorno anual desejado"
          dica="Valor por ano para pró-labore, reserva ou investimento, além da margem."
        >
          {somenteLeitura ? (
            <p className="font-mono text-sm tabular-nums">{formatarMoeda(p.retornoAnualDesejado)}</p>
          ) : (
            <CampoDeDinheiro
              id="p-retorno"
              valorEmCentavos={emCentavos(p.retornoAnualDesejado)}
              onChange={(c) => premissas.editar((a) => ({ ...a, retornoAnualDesejado: emReais(c) }))}
            />
          )}
        </Campo>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-heading text-sm font-semibold">Resultado do estudo</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <Linha rotulo="Custo do ano" valor={formatarMoeda(r.custoAnual)} />
          <Linha rotulo="Receita necessária" valor={formatarMoeda(receitaNecessaria)} dica="custo + margem + retorno" />
          <Linha rotulo="Receita prevista" valor={formatarMoeda(r.receitaPrevistaAnual)} dica="com as mensalidades finais" />
          <Linha
            rotulo="Resultado previsto"
            valor={formatarMoeda(r.resultadoPrevisto)}
            destaque={r.resultadoPrevisto < 0 ? "perigo" : undefined}
          />
          <Linha
            rotulo="Margem realizada"
            valor={formatarPercentual(r.margemRealizadaPercentual)}
            destaque={r.margemRealizadaPercentual < 0 ? "perigo" : undefined}
          />
        </dl>
        {premissas.sujo && (
          <p className="mt-3 text-xs text-muted-foreground">Salve para recalcular o resultado com a margem e o retorno novos.</p>
        )}
      </section>

      {estudo.alvos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Sem turmas para precificar.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={cn(
              "hidden gap-2 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid",
              COLUNAS
            )}
          >
            <span>Turma</span>
            <span className="text-right">Custo por aluno</span>
            <span className="text-right">Equilíbrio</span>
            <span className="text-right">Alvo</span>
            <span className="text-right">Mensalidade definida</span>
            <span className="text-right">Mensalidade final</span>
            <span className="text-right">Reajuste</span>
          </div>

          {estudo.alvos.map((a) => {
            const definida = definidaDe(a.id);
            return (
              <div key={a.id} className={cn("grid gap-2 border-b border-border px-3 py-3 last:border-0", COLUNAS)}>
                <span className="text-sm font-medium break-words">{a.nomeDaTurma}</span>
                <Celula rotulo="Custo por aluno">
                  <span className="font-mono text-sm tabular-nums">{formatarMoeda(a.custoPorAluno)}</span>
                </Celula>
                <Celula rotulo="Equilíbrio">
                  <span className="font-mono text-sm tabular-nums">{formatarMoeda(a.mensalidadeEquilibrio)}</span>
                </Celula>
                <Celula rotulo="Alvo">
                  <span className="font-mono text-sm tabular-nums">{formatarMoeda(a.mensalidadeAlvo)}</span>
                </Celula>
                <Celula rotulo="Mensalidade definida">
                  {somenteLeitura ? (
                    <span className="font-mono text-sm tabular-nums">
                      {definida === null ? "—" : formatarMoeda(definida)}
                    </span>
                  ) : (
                    <CampoDeDinheiro
                      valorEmCentavos={emCentavos(definida)}
                      placeholder={formatarMoeda(a.mensalidadeAlvo).replace(/^R\$\s?/, "")}
                      onChange={(c) =>
                        alvos.editar((atual) =>
                          atual.map((x) =>
                            x.id === a.id ? { ...x, mensalidadeDefinida: c === null ? null : emReais(c) } : x
                          )
                        )
                      }
                      className="w-36 md:w-full"
                    />
                  )}
                </Celula>
                <Celula rotulo="Mensalidade final">
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatarMoeda(a.mensalidadeFinal)}</span>
                </Celula>
                <Celula rotulo="Reajuste">
                  <span className={cn("font-mono text-sm tabular-nums", corDoReajuste(a.reajustePercentual))}>
                    {formatarReajuste(a.reajustePercentual)}
                  </span>
                </Celula>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Deixe a mensalidade definida em branco para usar o alvo da turma. Reajuste é a diferença para a mensalidade
        média de hoje.
      </p>

      {!somenteLeitura && (
        <BarraDeSalvar
          sujo={premissas.sujo || alvos.sujo}
          salvando={persistir.salvando}
          onSalvar={persistir.salvar}
          onDescartar={() => {
            premissas.descartar();
            alvos.descartar();
          }}
        />
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  dica,
  destaque,
}: {
  rotulo: string;
  valor: string;
  dica?: string;
  destaque?: "perigo";
}) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{rotulo}</dt>
      <dd
        className={cn(
          "mt-0.5 font-mono text-[15px] font-semibold tabular-nums",
          destaque === "perigo" && "text-destructive"
        )}
      >
        {valor}
      </dd>
      {dica && <dd className="text-[11.5px] text-muted-foreground">{dica}</dd>}
    </div>
  );
}
