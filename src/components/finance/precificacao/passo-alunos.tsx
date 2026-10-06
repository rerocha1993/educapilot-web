"use client";

import { Celula } from "@/components/finance/precificacao/celula";
import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { usePersistirEdicao } from "@/components/finance/precificacao/persistir";
import { BarraDeSalvar, type EdicaoDoEstudo } from "@/components/finance/precificacao/rascunho";
import { Campo } from "@/components/rh/campo";
import { formatarInteiro, formatarPercentual } from "@/lib/finance/precificacao-formatar";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const COLUNAS = "md:grid-cols-[minmax(0,1.6fr)_7rem_9rem_7.5rem_9rem] md:items-center";

/** Ocupação em %, ou nulo sem capacidade. */
const ocupacao = (alunos: number, capacidade: number) => (capacidade > 0 ? (alunos / capacidade) * 100 : null);

/**
 * Passo 3 — alunos e capacidade: as turmas de hoje, a capacidade que a escola quer ter em cada uma
 * e a meta de ocupação. É a conta que divide o custo: menos alunos, mensalidade mais alta.
 */
export function PassoAlunos({ edicao }: { edicao: EdicaoDoEstudo }) {
  const { estudo, premissas, alvos, somenteLeitura } = edicao;
  const persistir = usePersistirEdicao(edicao);

  const capacidadeDe = (id: string) => alvos.valor.find((a) => a.id === id)?.capacidadeMeta ?? 0;

  const totalAlunos = estudo.alvos.reduce((s, a) => s + a.alunosAtuais, 0);
  const totalCapacidade = estudo.alvos.reduce((s, a) => s + capacidadeDe(a.id), 0);
  // Média ponderada pelos alunos: a turma maior pesa mais no valor médio da escola.
  const mensalidadeMedia =
    totalAlunos > 0 ? estudo.alvos.reduce((s, a) => s + a.mensalidadeAtualMedia * a.alunosAtuais, 0) / totalAlunos : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        Os alunos vêm do cadastro de hoje. Diga quantos alunos a escola quer ter em cada turma e qual ocupação ela
        espera atingir: o custo é dividido pelos alunos previstos.
      </p>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <Campo
          id="p-ocupacao"
          rotulo="Meta de ocupação"
          dica="Quanto da capacidade das turmas a escola espera preencher."
        >
          <CampoNumerico
            id="p-ocupacao"
            valor={premissas.valor.metaDeOcupacaoPercentual}
            onChange={(v) => premissas.editar((a) => ({ ...a, metaDeOcupacaoPercentual: v ?? 0 }))}
            sufixo="%"
            min={0}
            max={100}
            disabled={somenteLeitura}
          />
        </Campo>
        <div className="grid content-start gap-1">
          <span className="text-sm font-medium">Alunos previstos</span>
          <span className="font-heading text-[26px] font-semibold tracking-[-.02em] tabular-nums">
            {formatarInteiro(estudo.resultado.alunosPrevistos)}
          </span>
          <span className="text-xs text-muted-foreground">Hoje a escola tem {formatarInteiro(estudo.resultado.alunosAtuais)}.</span>
        </div>
      </div>

      {estudo.alvos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma turma com alunos foi encontrada no cadastro.
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
            <span className="text-right">Alunos hoje</span>
            <span className="text-right">Capacidade meta</span>
            <span className="text-right">Ocupação hoje</span>
            <span className="text-right">Mensalidade média hoje</span>
          </div>

          {estudo.alvos.map((a) => {
            const capacidade = capacidadeDe(a.id);
            const oc = ocupacao(a.alunosAtuais, capacidade);
            return (
              <div key={a.id} className={cn("grid gap-2 border-b border-border px-3 py-3", COLUNAS)}>
                <span className="text-sm font-medium break-words">{a.nomeDaTurma}</span>
                <Celula rotulo="Alunos hoje">
                  <span className="font-mono text-sm tabular-nums">{formatarInteiro(a.alunosAtuais)}</span>
                </Celula>
                <Celula rotulo="Capacidade meta">
                  {somenteLeitura ? (
                    <span className="font-mono text-sm tabular-nums">{formatarInteiro(capacidade)}</span>
                  ) : (
                    <CampoNumerico
                      valor={capacidade}
                      ariaLabel={`Capacidade meta de ${a.nomeDaTurma}`}
                      onChange={(v) =>
                        alvos.editar((atual) =>
                          atual.map((x) =>
                            x.id === a.id ? { ...x, capacidadeMeta: Math.max(0, Math.round(v ?? 0)) } : x
                          )
                        )
                      }
                      className="w-28 md:w-full"
                    />
                  )}
                </Celula>
                <Celula rotulo="Ocupação hoje">
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      oc !== null && oc > 100 && "font-semibold text-destructive"
                    )}
                  >
                    {formatarPercentual(oc === null ? null : Math.round(oc * 10) / 10)}
                  </span>
                </Celula>
                <Celula rotulo="Mensalidade média hoje">
                  <span className="font-mono text-sm tabular-nums">{formatarMoeda(a.mensalidadeAtualMedia)}</span>
                </Celula>
              </div>
            );
          })}

          <div className={cn("grid gap-2 bg-muted/40 px-3 py-3 font-semibold", COLUNAS)}>
            <span className="font-heading text-sm">Total da escola</span>
            <Celula rotulo="Alunos hoje">
              <span className="font-mono text-sm tabular-nums">{formatarInteiro(totalAlunos)}</span>
            </Celula>
            <Celula rotulo="Capacidade meta">
              <span className="font-mono text-sm tabular-nums">{formatarInteiro(totalCapacidade)}</span>
            </Celula>
            <Celula rotulo="Ocupação hoje">
              <span className="font-mono text-sm tabular-nums">
                {formatarPercentual(
                  ocupacao(totalAlunos, totalCapacidade) === null
                    ? null
                    : Math.round((ocupacao(totalAlunos, totalCapacidade) ?? 0) * 10) / 10
                )}
              </span>
            </Celula>
            <Celula rotulo="Mensalidade média hoje">
              <span className="font-mono text-sm tabular-nums">{formatarMoeda(mensalidadeMedia)}</span>
            </Celula>
          </div>
        </div>
      )}

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
