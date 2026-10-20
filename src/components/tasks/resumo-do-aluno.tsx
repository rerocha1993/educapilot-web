"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Circle, CircleCheck, Info, Lock } from "lucide-react";

import { Estatistica } from "@/components/padroes/estatistica";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarDataHora, formatarSoData } from "@/lib/format/date";
import type {
  EventoDaLinhaDoTempo,
  OcorrenciaDoResumo,
  ResumoDoAluno,
  TipoDeEventoDoResumo,
} from "@/lib/tasks/use-resumo-do-aluno";
import { ROTULO_DE_QUEM_FAZ, ROTULO_DO_STATUS, VARIANTE_DO_STATUS, textoDasNotas } from "@/lib/tasks/use-reunioes-e-atendimentos";
import { cn } from "@/lib/utils";

/**
 * A folha do dossiê do aluno. Serve a tela e o papel: na impressão (A4 retrato) o menu e os controles
 * somem (print:hidden na página), a primeira folha é a capa e cada bloco evita quebrar no meio.
 *
 * Cada bloco diz de onde vem o dado. Bloco que o acesso de quem abriu não cobre nem aparece vazio:
 * o aviso "Não incluído" nomeia o que ficou de fora, para ninguém ler "zero faltas" onde não há leitura.
 * O que o sistema não registra (notas, avaliação pedagógica) também é dito, em vez de ficar em branco.
 */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERCENTUAL = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const AVISO_DE_SIGILO = "Documento interno da escola. Contém dados de criança: não compartilhe nem deixe impresso à vista.";

const ROTULO_DO_TIPO: Record<TipoDeEventoDoResumo, string> = {
  Falta: "Falta",
  Atraso: "Atraso",
  Ocorrencia: "Ocorrência",
  ReuniaoComPais: "Reunião c/ pais",
  Reuniao: "Reunião turma",
  Visita: "Visita",
  ObservacaoSemanal: "Obs. semanal",
  Diario: "Diário",
  Portaria: "Portaria",
};

const VARIANTE_DO_TIPO: Record<TipoDeEventoDoResumo, "overdue" | "pending" | "default" | "waiting" | "success" | "outline"> = {
  Falta: "overdue",
  Atraso: "pending",
  Ocorrencia: "default",
  ReuniaoComPais: "success",
  Reuniao: "waiting",
  Visita: "success",
  ObservacaoSemanal: "outline",
  Diario: "outline",
  Portaria: "pending",
};

function Bloco({
  id,
  titulo,
  fonte,
  children,
  quebraLivre = false,
}: {
  id: string;
  titulo: string;
  fonte: string;
  children: ReactNode;
  /** Blocos longos (linha do tempo, reuniões) podem quebrar de página; os curtos, não. */
  quebraLivre?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "rounded-xl border border-border bg-card p-4 md:p-5 print:rounded-none print:border-x-0 print:border-b print:border-t-0 print:px-0 print:py-3",
        !quebraLivre && "print:break-inside-avoid"
      )}
    >
      <h2 id={id} className="font-heading text-[16px] font-semibold print:text-[13pt]">
        {titulo}
      </h2>
      <p className="mb-3 mt-0.5 flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground print:text-[8.5pt]">
        <Info aria-hidden className="mt-px size-3.5 shrink-0 print:hidden" />
        <span>{fonte}</span>
      </p>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground print:text-[8pt]">{children}</h3>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground print:text-[7.5pt]">
        {rotulo}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium print:text-[10pt]">{children}</dd>
    </div>
  );
}

function OcorrenciaItem({ o }: { o: OcorrenciaDoResumo }) {
  return (
    <li className="rounded-lg border border-border bg-background p-3 print:break-inside-avoid print:bg-transparent">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {o.categoria}
          {o.paisAvisados && <Badge variant="success">Pais avisados</Badge>}
        </span>
        <span className="font-numeric text-xs text-muted-foreground">
          {formatarSoData(o.data)}
          {o.hora ? ` · ${o.hora}` : ""}
        </span>
      </div>
      {o.observacao && <p className="mt-1.5 whitespace-pre-line break-words text-sm">{o.observacao}</p>}
      {o.solucao && (
        <p className="mt-1.5 whitespace-pre-line break-words text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Solução:</span> {o.solucao}
        </p>
      )}
    </li>
  );
}

function LinhaDoTempo({ eventos }: { eventos: EventoDaLinhaDoTempo[] }) {
  const [maisRecentesPrimeiro, setMaisRecentesPrimeiro] = useState(false);
  const ordenados = maisRecentesPrimeiro ? [...eventos].reverse() : eventos;

  if (eventos.length === 0) return <Vazio>Nada registrado para este aluno no período.</Vazio>;

  return (
    <>
      <label className="mb-3 flex min-h-10 items-center gap-2 text-sm print:hidden md:min-h-0">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={maisRecentesPrimeiro}
          onChange={(e) => setMaisRecentesPrimeiro(e.target.checked)}
        />
        Mostrar os mais recentes primeiro
      </label>
      <ol className="flex flex-col">
        {ordenados.map((e, i) => (
          <li
            key={`${e.data}-${e.hora ?? ""}-${e.tipo}-${i}`}
            className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 border-t border-border py-2.5 first:border-t-0 print:break-inside-avoid sm:grid-cols-[5.5rem_8rem_minmax(0,1fr)]"
          >
            <span className="font-numeric text-[13px] text-muted-foreground print:text-[9pt]">
              {formatarSoData(e.data)}
              {e.hora && <span className="block text-[11px]">{e.hora}</span>}
            </span>
            <span className="hidden sm:block">
              <Badge variant={VARIANTE_DO_TIPO[e.tipo]} className="print:border-black/30">
                {ROTULO_DO_TIPO[e.tipo]}
              </Badge>
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-medium print:text-[10pt]">
                <span className="sm:hidden">
                  <span className="mr-1.5 text-xs font-semibold text-muted-foreground">{ROTULO_DO_TIPO[e.tipo]}.</span>
                </span>
                {e.titulo}
              </p>
              {e.detalhe && (
                <p className="mt-0.5 whitespace-pre-line break-words text-[13px] text-muted-foreground print:text-[9pt]">
                  {e.detalhe}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function minutosParaTexto(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

const ROTULO_DA_SAUDE: Record<string, string> = { Temperatura: "Temperatura", Medicamento: "Medicamento", Observacao: "Observação" };

export function ResumoDoAlunoFolha({ resumo, escola }: { resumo: ResumoDoAluno; escola: string | null }) {
  const { aluno, periodo, totais, frequencia, ocorrencias, portaria, reunioes, reunioesComPais, diario, financeiro } = resumo;
  const fonte = (bloco: string) => resumo.fontes.find((f) => f.bloco.startsWith(bloco))?.origem ?? "";
  const maiorMes = Math.max(1, ...(frequencia?.porMes.map((m) => m.faltas) ?? [1]));
  const percentual = totais.percentualDeFrequencia;
  const [mostrarAtas, setMostrarAtas] = useState(true);

  const intervalo = (
    <>
      <span className="font-numeric">{formatarSoData(periodo.inicio)}</span> a{" "}
      {periodo.ateHoje ? (
        <>
          hoje (<span className="font-numeric">{formatarSoData(periodo.fim)}</span>)
        </>
      ) : (
        <span className="font-numeric">{formatarSoData(periodo.fim)}</span>
      )}
    </>
  );

  const saude = aluno.saude;
  const saudeVazia = !saude || (!saude.alergias && !saude.medicacaoContinua && !saude.restricaoAlimentar && !saude.convenio);

  return (
    <article className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 text-foreground print:max-w-none print:gap-3">
      <style media="print">{"@page { size: A4 portrait; margin: 12mm; }"}</style>

      {/* Capa: só no papel. Escola, aluno, período, quando e por quem foi emitido. */}
      <section
        aria-label="Capa do dossiê"
        className="hidden print:flex print:min-h-[250mm] print:flex-col print:justify-between print:break-after-page"
      >
        <div>
          {escola && <p className="text-[12pt] font-bold uppercase tracking-[.16em]">{escola}</p>}
          <div className="mt-[60mm]">
            <p className="text-[14pt] uppercase tracking-[.2em]">Dossiê do aluno</p>
            <h1 className="mt-3 break-words font-heading text-[34pt] font-semibold leading-tight">{aluno.nome}</h1>
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5">
              <Dado rotulo="Turma">{aluno.turma ?? "—"}</Dado>
              <Dado rotulo="Período">{intervalo}</Dado>
              <Dado rotulo="Emitido em">
                <span className="font-numeric">{formatarDataHora(resumo.geradoEm)}</span>
              </Dado>
              <Dado rotulo="Emitido por">{resumo.emitidoPor ?? "Não identificado"}</Dado>
            </dl>
          </div>
        </div>
        <p className="border-t border-black pt-3 text-[9pt]">{AVISO_DE_SIGILO}</p>
      </section>

      {/* Cabeçalho da ficha: escola, aluno e período. É o que identifica o papel. */}
      <header className="rounded-xl border border-border bg-card p-4 md:p-5 print:rounded-none print:border-0 print:border-b-2 print:border-black print:px-0 print:pt-0">
        {escola && (
          <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action print:text-[10pt] print:text-black">{escola}</p>
        )}
        <p className="mt-0.5 text-sm text-muted-foreground print:text-[10pt]">Dossiê do aluno</p>
        <h1 className="mt-1 break-words font-heading text-[26px] font-semibold leading-tight tracking-[-.02em] print:text-[20pt]">
          {aluno.nome}
        </h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground print:text-[8.5pt]">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{AVISO_DE_SIGILO}</span>
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Dado rotulo="Turma">{aluno.turma ?? "—"}</Dado>
          <Dado rotulo="Período contratado">{aluno.periodoContratado ?? "Não cadastrado"}</Dado>
          <Dado rotulo="Nascimento">{aluno.dataDeNascimento ? formatarSoData(aluno.dataDeNascimento) : "—"}</Dado>
          <Dado rotulo="Na escola desde">{aluno.cadastradoEm ? formatarSoData(aluno.cadastradoEm) : "—"}</Dado>
          <Dado rotulo="Uso de imagem">
            {aluno.autorizaUsoDeImagem === true ? "Autorizado" : aluno.autorizaUsoDeImagem === false ? "Não autorizado" : "Não informado"}
          </Dado>
          <Dado rotulo="Período do dossiê">{intervalo}</Dado>
        </dl>

        {aluno.responsaveis.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <h2 className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground print:text-[7.5pt]">
              Responsáveis
            </h2>
            <ul className="mt-1 flex flex-col gap-1 text-sm print:text-[10pt]">
              {aluno.responsaveis.map((r) => (
                <li key={`${r.nome}-${r.parentesco ?? ""}`} className="break-words">
                  <span className="font-medium">{r.nome}</span>
                  {r.parentesco && <span className="text-muted-foreground"> ({r.parentesco})</span>}
                  {r.responsavelFinanceiro && <span className="text-muted-foreground"> · financeiro</span>}
                  {(r.telefone || r.email) && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {[r.telefone, r.email].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Totais no topo. Número nulo é área sem acesso: o cartão nem aparece, em vez de mostrar zero. */}
      <section aria-label="Totais do período" className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
        {percentual !== null && totais.diasLetivos !== null && (
          <Estatistica
            rotulo="Frequência"
            valor={`${PERCENTUAL.format(percentual)}%`}
            proporcao={percentual}
            alertarAbaixoDe={75}
            rodape={
              <>
                <span className="font-numeric">{totais.presencas}</span> presenças em{" "}
                <span className="font-numeric">{totais.diasLetivos}</span> dias com chamada
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.faltas !== null && (
          <Estatistica
            rotulo="Faltas"
            valor={totais.faltas}
            tom={totais.faltasSemJustificativa ? "danger" : undefined}
            rodape={
              <>
                <span className="font-numeric">{totais.faltasJustificadas}</span>{" "}
                {totais.faltasJustificadas === 1 ? "justificada" : "justificadas"} ·{" "}
                <span className="font-numeric">{totais.faltasSemJustificativa}</span> sem justificativa
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.ocorrencias !== null && (
          <Estatistica
            rotulo="Ocorrências"
            valor={totais.ocorrencias}
            rodape={
              <>
                <span className="font-numeric">{totais.ocorrenciasComPaisAvisados}</span> com pais avisados
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.reunioesComPaisRealizadas !== null && (
          <Estatistica
            rotulo="Reuniões e atendimentos"
            valor={totais.reunioesComPaisRealizadas}
            rodape={
              <>
                feitas · <span className="font-numeric">{totais.reunioesComPaisAgendadas}</span>{" "}
                {totais.reunioesComPaisAgendadas === 1 ? "agendada" : "agendadas"}
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.combinadosEmAberto !== null && (
          <Estatistica
            rotulo="Encaminhamentos em aberto"
            valor={totais.combinadosEmAberto}
            tom={totais.combinadosVencidos ? "danger" : undefined}
            rodape={
              <>
                <span className="font-numeric">{totais.combinadosVencidos}</span>{" "}
                {totais.combinadosVencidos === 1 ? "vencido" : "vencidos"}
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.atrasosNaChegada !== null && (
          <Estatistica
            rotulo="Atrasos na chegada"
            valor={totais.atrasosNaChegada}
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.reunioesDaTurma !== null && (
          <Estatistica
            rotulo="Reuniões da turma"
            valor={totais.reunioesDaTurma}
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.visitasNaPortaria !== null && (
          <Estatistica
            rotulo="Visitas na portaria"
            valor={totais.visitasNaPortaria}
            rodape={
              <>
                <span className="font-numeric">{totais.visitasDeResponsaveis}</span> de responsáveis
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
        {totais.multaTotal !== null && (
          <Estatistica
            rotulo="Multa por atraso na saída"
            valor={BRL.format(totais.multaTotal)}
            rodape={
              <>
                <span className="font-numeric">{totais.diasComAtrasoNaSaida}</span> dias com atraso
              </>
            }
            className="print:break-inside-avoid print:px-3 print:py-2"
          />
        )}
      </section>

      {resumo.ocultos.length > 0 && (
        <div
          role="note"
          className="rounded-xl border border-border-dashed bg-muted/50 px-4 py-3 text-[13px] leading-snug text-muted-foreground print:rounded-none print:px-0"
        >
          <span className="font-semibold text-foreground">Não incluído no seu acesso:</span> {resumo.ocultos.join(", ")}.
          Peça à direção da escola se precisar desses dados.
        </div>
      )}

      {!resumo.ocultos.includes("Dados de saúde da ficha") && (
        <Bloco
          id="bloco-saude"
          titulo="Ficha de saúde"
          fonte="Cadastro do aluno (Administração › Alunos). Dado sensível de criança: só quem cuida do cadastro, do diário ou do cardápio vê."
        >
          {saudeVazia ? (
            <Vazio>Nada informado no cadastro (alergias, medicação, restrição alimentar, convênio).</Vazio>
          ) : (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Dado rotulo="Alergias">{saude?.alergias ?? "Nada informado"}</Dado>
              <Dado rotulo="Medicação contínua">{saude?.medicacaoContinua ?? "Nada informado"}</Dado>
              <Dado rotulo="Restrição alimentar">{saude?.restricaoAlimentar ?? "Nada informado"}</Dado>
              <Dado rotulo="Convênio">{saude?.convenio ?? "Nada informado"}</Dado>
            </dl>
          )}
        </Bloco>
      )}

      {frequencia && (
        <Bloco id="bloco-frequencia" titulo="Frequência" fonte={fonte("Frequência")}>
          {frequencia.diasLetivos === 0 ? (
            <Vazio>Nenhuma chamada registrada para este aluno no período.</Vazio>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2">
              <table className="w-full text-sm print:text-[9.5pt]">
                <caption className="sr-only">Faltas por mês</caption>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="pb-1.5 font-semibold">Mês</th>
                    <th scope="col" className="pb-1.5 text-right font-semibold">Faltas</th>
                    <th scope="col" className="pb-1.5 text-right font-semibold">Justif.</th>
                    <th scope="col" className="w-[30%] pb-1.5"><span className="sr-only">Proporção</span></th>
                  </tr>
                </thead>
                <tbody>
                  {frequencia.porMes.map((m) => (
                    <tr key={m.mes} className="border-t border-border">
                      <th scope="row" className="py-1.5 pr-2 text-left font-normal">{m.nome}</th>
                      <td className="py-1.5 text-right font-numeric">{m.faltas}</td>
                      <td className="py-1.5 text-right font-numeric text-muted-foreground">{m.justificadas}</td>
                      <td className="py-1.5 pl-3">
                        <div aria-hidden className="h-2 overflow-hidden rounded bg-muted print:border print:border-border">
                          <div className="h-full rounded bg-primary print:bg-black" style={{ width: `${(m.faltas / maiorMes) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <Subtitulo>Últimas faltas</Subtitulo>
                {frequencia.ultimasFaltas.length === 0 ? (
                  <Vazio>Nenhuma falta no período.</Vazio>
                ) : (
                  <ul className="flex flex-col text-sm print:text-[9.5pt]">
                    {frequencia.ultimasFaltas.map((f) => (
                      <li key={f.data} className="flex flex-wrap items-baseline gap-x-2 border-t border-border py-1.5 first:border-t-0">
                        <span className="font-numeric">{formatarSoData(f.data)}</span>
                        <Badge variant={f.justificada ? "success" : "overdue"} className="print:border-black/30">
                          {f.justificada ? "Justificada" : "Sem justificativa"}
                        </Badge>
                        {f.motivo && <span className="min-w-0 break-words text-muted-foreground">{f.motivo}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Bloco>
      )}

      {ocorrencias && (
        <Bloco id="bloco-ocorrencias" titulo="Ocorrências" fonte={fonte("Ocorrências")} quebraLivre>
          {ocorrencias.total === 0 ? (
            <Vazio>Nenhuma ocorrência registrada no período.</Vazio>
          ) : (
            <>
              <ul aria-label="Ocorrências por categoria" className="mb-3 flex flex-wrap gap-2">
                {ocorrencias.porCategoria.map((c) => (
                  <li key={c.categoria}>
                    <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
                      {c.categoria} <span className="font-numeric">{c.total}</span>
                    </Badge>
                  </li>
                ))}
              </ul>
              <ol className="flex flex-col gap-2">
                {ocorrencias.itens.map((o) => (
                  <OcorrenciaItem key={o.id} o={o} />
                ))}
              </ol>
            </>
          )}
        </Bloco>
      )}

      {reunioesComPais && (
        <Bloco
          id="bloco-reunioes-pais"
          titulo="Reuniões e atendimentos"
          fonte={fonte("Reuniões e atendimentos") || fonte("Reuniões com os pais")}
          quebraLivre
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Dado rotulo="Realizadas">{reunioesComPais.realizadas}</Dado>
            <Dado rotulo="Agendadas">{reunioesComPais.agendadas}</Dado>
            <Dado rotulo="Família não veio">{reunioesComPais.responsavelNaoCompareceu}</Dado>
            <Dado rotulo="Canceladas">{reunioesComPais.canceladas}</Dado>
            {/* Médias das notas: só a gestão recebe; para os demais o campo nem existe. */}
            {reunioesComPais.mediaDaNotaDoAssunto != null && (
              <Dado rotulo="Nota média do assunto">{PERCENTUAL.format(reunioesComPais.mediaDaNotaDoAssunto)}</Dado>
            )}
            {reunioesComPais.mediaDaNotaDoDesfecho != null && (
              <Dado rotulo="Nota média do desfecho">{PERCENTUAL.format(reunioesComPais.mediaDaNotaDoDesfecho)}</Dado>
            )}
          </dl>

          {(reunioesComPais.porAssunto?.length ?? 0) > 0 && (
            <div className="mt-4">
              <Subtitulo>Por assunto</Subtitulo>
              <ul aria-label="Reuniões por assunto" className="flex flex-wrap gap-2">
                {reunioesComPais.porAssunto!.map((a) => (
                  <li key={a.assunto}>
                    <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
                      {a.assunto} <span className="font-numeric">{a.total}</span>
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <Subtitulo>Encaminhamentos em aberto (de qualquer data)</Subtitulo>
            {reunioesComPais.pendencias.length === 0 ? (
              <Vazio>Nenhum encaminhamento em aberto.</Vazio>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {reunioesComPais.pendencias.map((p, i) => (
                  <li
                    key={`${p.reuniaoId}-${i}`}
                    className={cn(
                      "rounded-lg border p-2.5 text-sm print:break-inside-avoid",
                      p.vencido ? "border-destructive-border bg-destructive-soft text-destructive-soft-foreground" : "border-border bg-background"
                    )}
                  >
                    <p className="break-words font-medium">{p.descricao}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
                      <Badge variant="outline">{ROTULO_DE_QUEM_FAZ[p.responsavel]}</Badge>
                      <span>
                        Reunião de <span className="font-numeric">{formatarSoData(p.dataDaReuniao)}</span> ({p.assuntoDaReuniao ?? p.tipoDaReuniao})
                      </span>
                      {p.prazo && (
                        <span>
                          · prazo <span className="font-numeric">{formatarSoData(p.prazo)}</span>
                        </span>
                      )}
                      {p.vencido && <Badge variant="overdue">Vencido</Badge>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <Subtitulo>Reuniões do período</Subtitulo>
              {reunioesComPais.itens.length > 0 && (
                <label className="flex min-h-10 items-center gap-2 text-[13px] print:hidden md:min-h-0">
                  <Checkbox checked={mostrarAtas} onCheckedChange={(v) => setMostrarAtas(v === true)} />
                  Mostrar o texto das atas
                </label>
              )}
            </div>
            {reunioesComPais.itens.length === 0 ? (
              <Vazio>Nenhuma reunião ou atendimento no período.</Vazio>
            ) : (
              <ol className="flex flex-col gap-2">
                {reunioesComPais.itens.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-background p-3 print:break-inside-avoid print:bg-transparent">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {r.assunto ?? r.tipo}
                        <Badge variant={VARIANTE_DO_STATUS[r.status]}>{ROTULO_DO_STATUS[r.status]}</Badge>
                      </span>
                      <span className="font-numeric text-xs text-muted-foreground">
                        {formatarSoData(r.data)}
                        {r.hora ? ` · ${r.hora}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      Conduzida por {r.condutores?.join(", ") ?? r.conduzidaPor}
                      {(r.envolvidos ?? r.responsaveis ?? []).length > 0 && <> · com {(r.envolvidos ?? r.responsaveis ?? []).map((x) => x.nome).join(", ")}</>}
                      {textoDasNotas(r.notaDoAssunto, r.notaDoDesfecho) && (
                        <>
                          {" "}· notas <span className="font-numeric">{textoDasNotas(r.notaDoAssunto, r.notaDoDesfecho)}</span>
                        </>
                      )}
                    </p>
                    {r.status === "Cancelada" && r.motivoDoCancelamento && (
                      <p className="mt-1.5 break-words text-sm text-muted-foreground">Motivo do cancelamento: {r.motivoDoCancelamento}</p>
                    )}
                    {r.pauta && (
                      <p className="mt-1.5 whitespace-pre-line break-words text-sm">
                        <span className="font-medium">Pauta:</span> {r.pauta}
                      </p>
                    )}
                    {mostrarAtas && r.conversado && (
                      <p className="mt-1.5 whitespace-pre-line break-words text-sm">
                        <span className="font-medium">Conversado:</span> {r.conversado}
                      </p>
                    )}
                    {r.encaminhamentos.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-sm">
                        {r.encaminhamentos.map((e) => (
                          <li key={e.id} className="flex items-start gap-2">
                            {e.cumprido ? (
                              <CircleCheck aria-label="Cumprido" className="mt-0.5 size-4 shrink-0 text-success-soft-foreground" />
                            ) : (
                              <Circle aria-label="Em aberto" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="min-w-0 break-words">
                              <span className={e.cumprido ? "text-muted-foreground line-through" : ""}>{e.descricao}</span>{" "}
                              <span className="text-[12.5px] text-muted-foreground">
                                ({ROTULO_DE_QUEM_FAZ[e.responsavel]}
                                {e.prazo && (
                                  <>
                                    , prazo <span className="font-numeric">{formatarSoData(e.prazo)}</span>
                                  </>
                                )}
                                )
                              </span>{" "}
                              {e.vencido && <Badge variant="overdue">Vencido</Badge>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-right text-[12.5px] print:hidden">
                      <Link href={`/reunioes-e-atendimentos/${r.id}`} className="font-medium text-action hover:underline">
                        Abrir reunião
                      </Link>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Bloco>
      )}

      <Bloco
        id="bloco-familia"
        titulo="Pais avisados, reuniões da turma e visitas"
        fonte="Ocorrências em que a escola marcou “pais avisados”, reuniões da turma (da equipe, não são reuniões com os pais) e visitas registradas na portaria para este aluno."
      >
        <div className="flex flex-col gap-4">
          <div>
            <Subtitulo>Ocorrências com pais avisados</Subtitulo>
            {reunioes.paisAvisados === null ? (
              <Vazio>Não incluído no seu acesso.</Vazio>
            ) : reunioes.paisAvisados.length === 0 ? (
              <Vazio>Nenhuma ocorrência com aviso aos pais no período.</Vazio>
            ) : (
              <ul className="flex flex-col text-sm print:text-[9.5pt]">
                {reunioes.paisAvisados.map((o) => (
                  <li key={o.id} className="flex flex-wrap gap-x-2 border-t border-border py-1.5 first:border-t-0">
                    <span className="font-numeric">{formatarSoData(o.data)}</span>
                    <span className="font-medium">{o.categoria}</span>
                    <span className="text-muted-foreground">(o texto está em Ocorrências)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Subtitulo>Reuniões da turma</Subtitulo>
            {reunioes.daTurma === null ? (
              <Vazio>Não incluído no seu acesso.</Vazio>
            ) : reunioes.daTurma.length === 0 ? (
              <Vazio>Nenhuma reunião da turma no período.</Vazio>
            ) : (
              <>
                <p className="mb-1 text-[12px] text-muted-foreground">{fonte("Reuniões da turma")}</p>
                <ul className="flex flex-col text-sm print:text-[9.5pt]">
                  {reunioes.daTurma.map((r) => (
                    <li key={`${r.data}-${r.status}`} className="flex flex-wrap items-center gap-x-2 border-t border-border py-1.5 first:border-t-0">
                      <span className="font-numeric">{formatarSoData(r.data)}</span>
                      <Badge variant={r.status === "Finalizado" ? "success" : "waiting"}>{r.status}</Badge>
                      {r.citaOAluno && <span className="text-muted-foreground">A ata cita o aluno.</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div>
            <Subtitulo>Visitas na portaria</Subtitulo>
            {reunioes.visitas === null ? (
              <Vazio>Não incluído no seu acesso.</Vazio>
            ) : reunioes.visitas.length === 0 ? (
              <Vazio>Nenhuma visita registrada para este aluno no período.</Vazio>
            ) : (
              <>
                <p className="mb-1 text-[12px] text-muted-foreground">{fonte("Visitas")}</p>
                <ul className="flex flex-col text-sm print:text-[9.5pt]">
                  {reunioes.visitas.map((v, i) => (
                    <li key={`${v.data}-${v.horaEntrada}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-border py-1.5 first:border-t-0">
                      <span className="font-numeric">
                        {formatarSoData(v.data)}
                        {v.horaEntrada ? ` ${v.horaEntrada}` : ""}
                        {v.horaSaida ? `–${v.horaSaida}` : ""}
                      </span>
                      <span className="font-medium">{v.visitante}</span>
                      {v.responsavelCadastrado && <Badge variant="success">Responsável</Badge>}
                      {v.motivo && <span className="min-w-0 break-words text-muted-foreground">{v.motivo}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </Bloco>

      {resumo.observacoesSemanais && (
        <Bloco id="bloco-semanais" titulo="Observações semanais da turma" fonte={fonte("Observações semanais")}>
          {resumo.observacoesSemanais.length === 0 ? (
            <Vazio>Nenhuma observação semanal cita este aluno pelo nome.</Vazio>
          ) : (
            <ul className="flex flex-col gap-2">
              {resumo.observacoesSemanais.map((o, i) => (
                <li key={`${o.data}-${i}`} className="rounded-lg border border-border bg-background p-3 text-sm print:break-inside-avoid print:bg-transparent">
                  <p className="font-numeric text-xs text-muted-foreground">
                    {formatarSoData(o.data)}
                    {o.semanaDoMes ? ` · semana ${o.semanaDoMes}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words">{o.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      )}

      {diario && (
        <Bloco id="bloco-diario" titulo="Dia a dia: diário do aluno" fonte={fonte("Diário")}>
          {diario.diasComDiario === 0 ? (
            <Vazio>Nenhum diário registrado para este aluno no período.</Vazio>
          ) : (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Dado rotulo="Dias com diário">{diario.diasComDiario}</Dado>
                <Dado rotulo="Comeu bem ou tudo">
                  {diario.percentualDeBoaAceitacao === null ? "—" : `${PERCENTUAL.format(diario.percentualDeBoaAceitacao)}%`}
                  <span className="block text-[11.5px] font-normal text-muted-foreground">de {diario.registrosDeAlimentacao} refeições</span>
                </Dado>
                <Dado rotulo="Sono por dia">
                  {diario.minutosDeSonoPorDia === null ? "—" : minutosParaTexto(diario.minutosDeSonoPorDia)}
                  <span className="block text-[11.5px] font-normal text-muted-foreground">{diario.sonecas} sonecas</span>
                </Dado>
                <Dado rotulo="Higiene e reposições">
                  {diario.registrosDeHigiene} · {diario.reposicoes}
                </Dado>
              </dl>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Subtitulo>Aceitação das refeições</Subtitulo>
                  {diario.aceitacaoDosAlimentos.length === 0 ? (
                    <Vazio>Sem refeições registradas.</Vazio>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {diario.aceitacaoDosAlimentos.map((c) => (
                        <li key={c.rotulo}>
                          <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
                            {c.rotulo} <span className="font-numeric">{c.total}</span>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <Subtitulo>Humor</Subtitulo>
                  {diario.humor.length === 0 ? (
                    <Vazio>Sem registros de humor.</Vazio>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {diario.humor.map((c) => (
                        <li key={c.rotulo}>
                          <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
                            {c.rotulo} <span className="font-numeric">{c.total}</span>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <Subtitulo>Saúde no dia a dia ({diario.registrosDeSaude} registros)</Subtitulo>
                {diario.ultimosRegistrosDeSaude.length === 0 ? (
                  <Vazio>Nenhum registro de saúde no período.</Vazio>
                ) : (
                  <ul className="flex flex-col text-sm print:text-[9.5pt]">
                    {diario.ultimosRegistrosDeSaude.map((s, i) => (
                      <li key={`${s.data}-${i}`} className="flex flex-wrap items-baseline gap-x-2 border-t border-border py-1.5 first:border-t-0">
                        <span className="font-numeric">{formatarSoData(s.data)}</span>
                        <Badge variant="outline">{ROTULO_DA_SAUDE[s.tipo] ?? s.tipo}</Badge>
                        <span className="min-w-0 break-words text-muted-foreground">{s.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Bloco>
      )}

      {financeiro && (
        <Bloco id="bloco-financeiro" titulo="Pagamentos (resumo)" fonte={fonte("Financeiro")}>
          <p className="mb-3">
            {financeiro.emDia ? <Badge variant="success">Sem atraso</Badge> : <Badge variant="overdue">Com atraso</Badge>}
          </p>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Dado rotulo="Em aberto">
              {financeiro.emAberto.quantidade} · {BRL.format(financeiro.emAberto.valor)}
            </Dado>
            <Dado rotulo="Vencidas">
              {financeiro.vencidas.quantidade} · {BRL.format(financeiro.vencidas.valor)}
              {financeiro.vencidas.quantidade > 0 && (
                <span className="block text-[11.5px] font-normal text-muted-foreground">
                  maior atraso: {financeiro.maiorAtrasoEmDias} {financeiro.maiorAtrasoEmDias === 1 ? "dia" : "dias"}
                </span>
              )}
            </Dado>
            <Dado rotulo="Pagas no período">
              {financeiro.pagasNoPeriodo.quantidade} · {BRL.format(financeiro.pagasNoPeriodo.valor)}
            </Dado>
          </dl>
        </Bloco>
      )}

      {portaria && (
        <Bloco id="bloco-portaria" titulo="Portaria: atraso na saída e multa" fonte={fonte("Portaria")}>
          {portaria.diasComRegistro === 0 ? (
            <Vazio>Nenhuma chegada ou saída registrada na portaria no período.</Vazio>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Dado rotulo="Dias com registro">{portaria.diasComRegistro}</Dado>
                <Dado rotulo="Dias com atraso na saída">{portaria.diasComAtrasoNaSaida}</Dado>
                <Dado rotulo="Minutos de atraso">{portaria.minutosDeAtrasoNaSaida}</Dado>
                <Dado rotulo="Multa total">{BRL.format(portaria.multaTotal)}</Dado>
              </dl>
              {portaria.multas.length > 0 && (
                <ul className="mt-3 flex flex-col text-sm print:text-[9.5pt]">
                  {portaria.multas.map((m) => (
                    <li key={m.data} className="flex flex-wrap items-baseline gap-x-3 border-t border-border py-1.5">
                      <span className="font-numeric">{formatarSoData(m.data)}</span>
                      <span className="text-muted-foreground">{m.minutosDeAtraso} min de atraso</span>
                      <span className="font-numeric font-medium">{BRL.format(m.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Bloco>
      )}

      <Bloco
        id="bloco-linha-do-tempo"
        titulo="Linha do tempo"
        fonte="Tudo o que aparece acima, junto e em ordem de data. A reunião com os pais entra sem o texto da ata."
        quebraLivre
      >
        <LinhaDoTempo eventos={resumo.linhaDoTempo} />
      </Bloco>

      {resumo.naoRegistrado.length > 0 && (
        <Bloco
          id="bloco-lacunas"
          titulo="O que o sistema não registra"
          fonte="Sobre o desempenho do aluno, o EducaPilot só guarda o que está nos blocos acima. Estes assuntos não existem hoje: se a escola quiser acompanhá-los, é preciso criar o registro."
        >
          <ul className="flex flex-col gap-2 text-sm print:text-[9.5pt]">
            {resumo.naoRegistrado.map((l) => (
              <li key={l.assunto} className="print:break-inside-avoid">
                <span className="font-medium">{l.assunto}.</span> <span className="text-muted-foreground">{l.explicacao}</span>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <p className="text-[12px] text-muted-foreground print:text-[8pt]">
        Emitido em <span className="font-numeric">{formatarDataHora(resumo.geradoEm)}</span>
        {resumo.emitidoPor ? ` por ${resumo.emitidoPor}` : ""}. Dados do período de{" "}
        <span className="font-numeric">{formatarSoData(periodo.inicio)}</span> a{" "}
        <span className="font-numeric">{formatarSoData(periodo.fim)}</span>
        {periodo.ateHoje ? " (dia da emissão)" : ""}. {AVISO_DE_SIGILO}
      </p>
    </article>
  );
}
