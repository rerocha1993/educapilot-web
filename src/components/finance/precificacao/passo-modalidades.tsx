"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { EtiquetaDoStatus } from "@/components/finance/precificacao/passo-nivelamento";
import {
  BarraDeSalvar,
  modalidadeEditavel,
  type EdicaoDoEstudo,
  type ModalidadeEditavel,
} from "@/components/finance/precificacao/rascunho";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatarAlunos,
  formatarInteiro,
  formatarPercentual,
  formatarReajuste,
} from "@/lib/finance/precificacao-formatar";
import {
  useDefinirModalidadesDoEstudo,
  type ModalidadeDoEstudo,
  type ModalidadeParaSalvar,
} from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

const ROTA_DAS_MODALIDADES = "/finance/precificacao/modalidades";
const ROTA_DOS_ALUNOS = "/admin/alunos";

/** Média ponderada pelos alunos, ignorando o grupo sem o número. */
function mediaPonderada(
  grupos: ModalidadeDoEstudo[],
  valor: (m: ModalidadeDoEstudo) => number | null | undefined
): number | null {
  let soma = 0;
  let peso = 0;
  for (const m of grupos) {
    const v = valor(m);
    if (v === null || v === undefined || m.alunos <= 0) continue;
    soma += v * m.alunos;
    peso += m.alunos;
  }
  return peso > 0 ? soma / peso : null;
}

const dinheiroOuTravessao = (v: number | null | undefined) => (v === null || v === undefined ? "—" : formatarMoeda(v));
const horasOuTravessao = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${formatarAlunos(v)} h`);
const refeicoesOuTravessao = (v: number | null | undefined) => (v === null || v === undefined ? "—" : formatarAlunos(v));

/** A diferença para o preço sugerido: negativa (cobra menos que o sugerido) em vermelho. */
function Diferenca({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return <span className="font-mono text-sm">—</span>;
  return (
    <span className={cn("font-mono text-sm tabular-nums", valor < 0 && "font-semibold text-destructive")}>
      {formatarReajuste(Math.round(valor * 10) / 10)}
    </span>
  );
}

function textoDosExtras(m: ModalidadeDoEstudo): string {
  if (m.extras === null || m.extras === undefined) return "—";
  return m.extras ? "Sim" : "Não";
}

/**
 * Passo "Modalidades": cada jeito de a criança ficar na escola (integral, 8 horas, meio período...)
 * com o custo por aluno que sai da divisão dos custos, o preço sugerido e a mensalidade que a escola
 * decide. Só aparece quando o estudo tem modalidades.
 *
 * Os números vêm do último cálculo salvo; a capacidade e a mensalidade são o que a pessoa edita.
 */
export function PassoModalidades({ edicao }: { edicao: EdicaoDoEstudo }) {
  const { estudo, modalidades, premissas, alvos, somenteLeitura } = edicao;
  const salvar = useDefinirModalidadesDoEstudo(estudo.id);
  const grupos = estudo.modalidades;
  const semPeriodo = grupos.filter((m) => m.semPeriodo && m.alunos > 0);

  const edicaoDe = (m: ModalidadeDoEstudo): ModalidadeEditavel =>
    modalidades.valor.find((x) => x.id === m.id) ?? modalidadeEditavel(m);

  function mudar(id: string, parte: Partial<ModalidadeEditavel>) {
    modalidades.editar((atual) => atual.map((x) => (x.id === id ? { ...x, ...parte } : x)));
  }

  async function gravar() {
    const corpo: ModalidadeParaSalvar[] = grupos.map((m) => {
      const e = edicaoDe(m);
      const item: ModalidadeParaSalvar = { id: m.id, capacidadeMeta: e.capacidadeMeta };
      // O grupo "sem período" não aceita valor. Reajuste ou valor, nunca os dois.
      if (!m.semPeriodo) {
        if (e.reajustePercentual !== null) item.reajustePercentual = e.reajustePercentual;
        else if (e.mensalidadeDefinida !== null) item.mensalidadeDefinida = e.mensalidadeDefinida;
      }
      return item;
    });
    try {
      await salvar.mutateAsync(corpo);
      modalidades.descartar();
      toast.success("Modalidades salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar as modalidades.");
    }
  }

  const totalAlunos = grupos.reduce((s, m) => s + m.alunos, 0);
  const totalCapacidade = grupos.reduce((s, m) => s + edicaoDe(m).capacidadeMeta, 0);
  const alunosForaDoAlvo = grupos.filter((m) => m.foraDoAlvo).reduce((s, m) => s + m.alunos, 0);
  const totais = {
    custo: mediaPonderada(grupos, (m) => m.custoPorAluno),
    sugerido: mediaPonderada(grupos, (m) => m.precoSugerido),
    atual: mediaPonderada(grupos, (m) => m.mensalidadeAtualMedia),
    diferenca: mediaPonderada(grupos, (m) => m.diferencaPercentual),
  };

  const editores = (m: ModalidadeDoEstudo) => {
    const e = edicaoDe(m);
    return {
      capacidade: somenteLeitura ? (
        <span className="font-mono text-sm tabular-nums">{formatarInteiro(e.capacidadeMeta)}</span>
      ) : (
        <CampoNumerico
          valor={e.capacidadeMeta}
          ariaLabel={`Capacidade meta de ${m.nome}`}
          onChange={(v) => mudar(m.id, { capacidadeMeta: Math.max(0, Math.round(v ?? 0)) })}
          className="w-28 lg:w-24"
        />
      ),
      definida: m.semPeriodo ? (
        <span className="font-mono text-sm text-muted-foreground">—</span>
      ) : somenteLeitura ? (
        <span className="font-mono text-sm tabular-nums">{dinheiroOuTravessao(m.mensalidadeDefinida)}</span>
      ) : (
        <CampoDeDinheiro
          valorEmCentavos={emCentavos(e.mensalidadeDefinida)}
          ariaLabel={`Mensalidade definida de ${m.nome}`}
          placeholder={m.precoSugerido === null || m.precoSugerido === undefined ? "0,00" : formatarMoeda(m.precoSugerido).replace(/^R\$\s?/, "")}
          onChange={(c) =>
            mudar(m.id, { mensalidadeDefinida: c === null ? null : emReais(c), reajustePercentual: null })
          }
          className="w-36 lg:w-32"
        />
      ),
      reajuste: m.semPeriodo ? (
        <span className="font-mono text-sm text-muted-foreground">—</span>
      ) : somenteLeitura ? (
        <span className="font-mono text-sm tabular-nums">—</span>
      ) : (
        <CampoNumerico
          valor={e.reajustePercentual}
          ariaLabel={`Reajuste em porcentagem de ${m.nome}`}
          sufixo="%"
          placeholder="—"
          onChange={(v) =>
            mudar(m.id, { reajustePercentual: v, mensalidadeDefinida: v === null ? e.mensalidadeDefinida : null })
          }
          className="w-28 lg:w-24"
        />
      ),
    };
  };

  const final = (m: ModalidadeDoEstudo) =>
    m.semPeriodo ? (
      <span className="font-mono text-sm text-muted-foreground">—</span>
    ) : (
      <span className="flex flex-col items-end">
        <span className="font-mono text-sm font-semibold tabular-nums">{dinheiroOuTravessao(m.mensalidadeFinal)}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatarReajuste(m.reajustePercentual)}
        </span>
      </span>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        Cada modalidade é um jeito de a criança ficar na escola. O custo é dividido por horas, refeições e atividades, e
        cada modalidade fica com a parte dela. Defina a mensalidade em reais <strong>ou</strong> em reajuste (%); em
        branco usa o preço sugerido.{" "}
        <Link href={ROTA_DAS_MODALIDADES} className="font-medium text-primary hover:underline">
          Gerenciar modalidades
        </Link>
      </p>

      {semPeriodo.map((m) => (
        <div
          key={m.id}
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {m.aviso ??
              `${formatarInteiro(m.alunos)} ${m.alunos === 1 ? "aluno está" : "alunos estão"} sem período informado, então a mensalidade deles não entra na conta por modalidade.`}{" "}
            <Link href={ROTA_DOS_ALUNOS} className="font-semibold underline">
              Cadastrar o período dos alunos
            </Link>
          </span>
        </div>
      ))}

      {(premissas.sujo || alvos.sujo) && (
        <p className="text-xs text-muted-foreground">
          Há alterações não salvas nos outros passos; os números abaixo são do último cálculo salvo.
        </p>
      )}

      {grupos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma modalidade com alunos neste estudo ainda.
        </p>
      ) : (
        <>
          {/* Celular e tablet: um cartão por modalidade. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {grupos.map((m) => {
              const ed = editores(m);
              return (
                <div key={m.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-heading text-[15px] font-semibold break-words">{m.nome}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {formatarInteiro(m.alunos)} {m.alunos === 1 ? "aluno" : "alunos"}
                      </p>
                    </div>
                    <EtiquetaDoStatus status={m.status} />
                  </div>

                  {m.semPeriodo && m.aviso && <p className="text-[13px] text-warning-soft-foreground">{m.aviso}</p>}

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                    <Dado rotulo="Horas por dia" valor={horasOuTravessao(m.horasPorDia)} />
                    <Dado rotulo="Refeições por dia" valor={refeicoesOuTravessao(m.refeicoes)} />
                    <Dado rotulo="Atividades extras" valor={textoDosExtras(m)} />
                    <Dado rotulo="Custo por aluno" valor={dinheiroOuTravessao(m.custoPorAluno)} />
                    <Dado rotulo="Preço sugerido" valor={dinheiroOuTravessao(m.precoSugerido)} forte />
                    <Dado rotulo="Mensalidade atual" valor={dinheiroOuTravessao(m.mensalidadeAtualMedia)} />
                    <div>
                      <dt className="text-muted-foreground">Diferença</dt>
                      <dd className="mt-0.5">
                        <Diferenca valor={m.diferencaPercentual} />
                      </dd>
                    </div>
                  </dl>

                  <div className="grid gap-2.5 border-t border-border pt-3">
                    <LinhaDeCampo rotulo="Capacidade meta">{ed.capacidade}</LinhaDeCampo>
                    <LinhaDeCampo rotulo="Mensalidade definida">{ed.definida}</LinhaDeCampo>
                    <LinhaDeCampo rotulo="Ou reajuste">{ed.reajuste}</LinhaDeCampo>
                    <LinhaDeCampo rotulo="Mensalidade final">{final(m)}</LinhaDeCampo>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/40 p-3.5 text-[13px]">
              <p className="col-span-2 font-heading text-sm font-semibold">Total da escola</p>
              <Dado rotulo="Alunos" valor={formatarInteiro(totalAlunos)} />
              <Dado rotulo="Capacidade meta" valor={formatarInteiro(totalCapacidade)} />
              <Dado rotulo="Custo por aluno (média)" valor={dinheiroOuTravessao(totais.custo)} />
              <Dado rotulo="Preço sugerido (média)" valor={dinheiroOuTravessao(totais.sugerido)} />
              <Dado rotulo="Mensalidade atual (média)" valor={dinheiroOuTravessao(totais.atual)} />
              <Dado
                rotulo="Alunos fora do alvo"
                valor={formatarInteiro(alunosForaDoAlvo)}
              />
            </div>
          </div>

          {/* Computador: tabela; se faltar largura, rola de lado. */}
          <div className="hidden rounded-xl border border-border bg-card lg:block">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-right">Alunos</TableHead>
                  <TableHead className="text-right">Horas/dia</TableHead>
                  <TableHead className="text-right">Refeições/dia</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Custo/aluno</TableHead>
                  <TableHead className="text-right">Preço sugerido</TableHead>
                  <TableHead className="text-right">Mensalidade atual</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Capacidade meta</TableHead>
                  <TableHead className="text-right">Mensalidade definida</TableHead>
                  <TableHead className="text-right">Ou reajuste</TableHead>
                  <TableHead className="text-right">Mensalidade final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((m) => {
                  const ed = editores(m);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-48 font-medium whitespace-normal">
                        {m.nome}
                        {m.semPeriodo && (
                          <Link
                            href={ROTA_DOS_ALUNOS}
                            className="mt-0.5 block text-xs font-normal text-primary hover:underline"
                          >
                            Cadastrar o período
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{formatarInteiro(m.alunos)}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{horasOuTravessao(m.horasPorDia)}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{refeicoesOuTravessao(m.refeicoes)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {textoDosExtras(m)}
                        {!!m.alunosComExtras && m.alunosComExtras > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {formatarInteiro(m.alunosComExtras)} {m.alunosComExtras === 1 ? "aluno" : "alunos"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{dinheiroOuTravessao(m.custoPorAluno)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{dinheiroOuTravessao(m.precoSugerido)}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">{dinheiroOuTravessao(m.mensalidadeAtualMedia)}</TableCell>
                      <TableCell className="text-right">
                        <Diferenca valor={m.diferencaPercentual} />
                      </TableCell>
                      <TableCell>
                        <EtiquetaDoStatus status={m.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{ed.capacidade}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{ed.definida}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{ed.reajuste}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{final(m)}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                  <TableCell className="font-heading">Total da escola</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{formatarInteiro(totalAlunos)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono text-sm tabular-nums">{dinheiroOuTravessao(totais.custo)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{dinheiroOuTravessao(totais.sugerido)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{dinheiroOuTravessao(totais.atual)}</TableCell>
                  <TableCell className="text-right">
                    <Diferenca valor={totais.diferenca} />
                  </TableCell>
                  <TableCell className="text-xs font-normal text-muted-foreground">
                    {alunosForaDoAlvo > 0
                      ? `${formatarInteiro(alunosForaDoAlvo)} ${alunosForaDoAlvo === 1 ? "aluno" : "alunos"} fora do alvo`
                      : "Tudo no alvo"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{formatarInteiro(totalCapacidade)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Custo por aluno, preço sugerido e diferença são médias ponderadas pelo número de alunos
            {totais.diferenca !== null ? ` (diferença média: ${formatarPercentual(Math.round(totais.diferenca * 10) / 10)})` : ""}.
            Depois de mudar a capacidade, salve para recalcular.
          </p>
        </>
      )}

      {!somenteLeitura && grupos.length > 0 && (
        <BarraDeSalvar
          sujo={modalidades.sujo}
          salvando={salvar.isPending}
          onSalvar={gravar}
          onDescartar={modalidades.descartar}
        />
      )}
    </div>
  );
}

function Dado({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className={cn("mt-0.5 font-mono tabular-nums", forte && "font-semibold")}>{valor}</dd>
    </div>
  );
}

function LinhaDeCampo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{rotulo}</span>
      {children}
    </div>
  );
}
