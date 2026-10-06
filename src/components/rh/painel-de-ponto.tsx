"use client";

import { useMemo, useState } from "react";
import { Clock, FileUp, Plus } from "lucide-react";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Estatistica } from "@/components/padroes/estatistica";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { competenciaDeIso, hojeIsoBrasilia } from "@/lib/format/date";
import { formatarHoras, formatarMinutos, horaOuTravessao, limitesDoMes } from "@/lib/rh/formatar";
import {
  CONFIGURACAO_PADRAO,
  ROTULO_DO_AFASTAMENTO,
  useAfastamentos,
  useAtestados,
  useConfiguracaoDoRh,
  useFuncionario,
  usePonto,
  useResumoDePonto,
  type RegistroDePonto,
} from "@/lib/rh/use-rh";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  DIAS_DA_SEMANA_CURTOS,
  diaDaSemana,
  diaEMes,
  diasNoMes,
  montarIso,
} from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

import { ErroDeCarga } from "./campo";
import { DialogImportarPonto } from "./dialog-importar-ponto";
import { DialogPonto } from "./dialog-ponto";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";
import { SeletorDeMes } from "./seletor-de-mes";

type Dialogo = { tipo: "dia"; data: string } | { tipo: "importar" };

/**
 * Ponto de um funcionário, mês a mês: resumo do período e uma linha por dia.
 *
 * Serve a página Ponto (com o seletor de funcionário) e a aba do funcionário (`funcionarioFixo`,
 * sem seletor). Quem não escreve (professor) vê o mesmo, sem os botões e sem abrir o lançamento.
 *
 * Os dias úteis vêm da jornada padrão (Configuração). Atestado e afastamento do dia vêm das
 * listas do ano; se a pessoa não tem essas áreas, o servidor recusa e o dia só fica sem a marca —
 * o resumo de cima continua valendo.
 */
export function PainelDePonto({ funcionarioFixo }: { funcionarioFixo?: string }) {
  const podeEscrever = usePodeEscreverNoRh();
  const hoje = hojeIsoBrasilia();
  const [escolhido, setEscolhido] = useState("");
  const [{ ano, mes }, setCompetencia] = useState(() => competenciaDeIso(hoje));
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const funcionarioId = funcionarioFixo ?? escolhido;
  const { de, ate } = limitesDoMes(ano, mes);

  const { data: ficha } = useFuncionario(funcionarioId);
  const { data: registros, isLoading, isError, refetch } = usePonto(funcionarioId, de, ate);
  const { data: resumo, isLoading: carregandoResumo, isError: resumoFalhou } = useResumoDePonto(funcionarioId, de, ate);
  const { data: configuracao } = useConfiguracaoDoRh();
  const { data: atestados } = useAtestados(funcionarioId || null, ano);
  const { data: afastamentos } = useAfastamentos(funcionarioId || null, ano);

  const diasUteis = configuracao?.diasDaSemana ?? CONFIGURACAO_PADRAO.diasDaSemana;

  const dias = useMemo(() => {
    const porData = new Map<string, RegistroDePonto>((registros ?? []).map((r) => [r.data, r]));
    return Array.from({ length: diasNoMes(ano, mes) }, (_, i) => {
      const data = montarIso(ano, mes, i + 1);
      const semana = diaDaSemana(data);
      return {
        data,
        semana,
        util: diasUteis.includes(semana),
        registro: porData.get(data) ?? null,
        atestado: (atestados ?? []).find((a) => a.inicio <= data && data <= a.fim) ?? null,
        afastamento: (afastamentos ?? []).find((a) => a.inicio <= data && data <= a.fim) ?? null,
      };
    });
  }, [ano, mes, registros, atestados, afastamentos, diasUteis]);

  const nomeDoFuncionario = ficha?.nomeCompleto ?? "Funcionário";

  function lancarHoje() {
    setCompetencia(competenciaDeIso(hoje));
    setDialogo({ tipo: "dia", data: hoje });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {!funcionarioFixo && (
            <SeletorDeFuncionario valor={escolhido} onChange={setEscolhido} />
          )}
          <SeletorDeMes ano={ano} mes={mes} onChange={setCompetencia} />
        </div>

        {podeEscrever && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogo({ tipo: "importar" })}>
              <FileUp />
              Importar planilha
            </Button>
            <Button variant="action" disabled={!funcionarioId} onClick={lancarHoje}>
              <Plus />
              Lançar hoje
            </Button>
          </div>
        )}
      </div>

      {!funcionarioId ? (
        <EstadoVazio
          icone={<Clock />}
          titulo="Escolha um funcionário"
          texto="Selecione quem você quer ver para abrir o ponto do mês."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {carregandoResumo ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : resumoFalhou || !resumo ? (
              <div className="col-span-full">
                <ErroDeCarga texto="Não foi possível calcular o resumo do mês." />
              </div>
            ) : (
              <>
                <Estatistica
                  rotulo="Horas trabalhadas"
                  valor={formatarHoras(resumo.horasTrabalhadas)}
                  rodape={`${resumo.diasTrabalhados} de ${resumo.diasPrevistos} dias`}
                />
                <Estatistica rotulo="Horas previstas" valor={formatarHoras(resumo.horasPrevistas)} />
                <Estatistica
                  rotulo="Saldo"
                  tom={resumo.saldo < 0 ? "danger" : undefined}
                  valor={
                    <span className={cn(resumo.saldo > 0 && "text-success-soft-foreground")}>
                      {formatarHoras(resumo.saldo, true)}
                    </span>
                  }
                  rodape={resumo.saldo < 0 ? "Devendo no período" : resumo.saldo > 0 ? "Horas extras" : "Em dia"}
                />
                <Estatistica
                  rotulo="Faltas"
                  valor={resumo.faltas}
                  tom={resumo.faltas > 0 ? "danger" : undefined}
                  rodape={
                    resumo.diasComAtestado + resumo.diasAfastado > 0
                      ? `${resumo.diasComAtestado} com atestado · ${resumo.diasAfastado} afastado`
                      : undefined
                  }
                />
                <Estatistica rotulo="Atrasos" valor={formatarMinutos(resumo.atrasosMinutos)} />
              </>
            )}
          </div>

          {isError ? (
            <ErroDeCarga texto="Não foi possível carregar o ponto do mês." onTentar={() => refetch()} />
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída int.</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!isLoading &&
                    dias.map((d) => {
                      const futuro = d.data > hoje;
                      const clicavel = podeEscrever;
                      return (
                        <TableRow
                          key={d.data}
                          onClick={clicavel ? () => setDialogo({ tipo: "dia", data: d.data }) : undefined}
                          className={cn(clicavel && "cursor-pointer", !d.util && !d.registro && "bg-muted/40")}
                        >
                          <TableCell className="py-1">
                            {clicavel ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogo({ tipo: "dia", data: d.data });
                                }}
                                className="min-h-10 text-left md:min-h-8"
                              >
                                <CelulaDoDia data={d.data} semana={d.semana} hoje={d.data === hoje} util={d.util} />
                              </button>
                            ) : (
                              <CelulaDoDia data={d.data} semana={d.semana} hoje={d.data === hoje} util={d.util} />
                            )}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">{horaOuTravessao(d.registro?.entrada)}</TableCell>
                          <TableCell className="font-mono tabular-nums">{horaOuTravessao(d.registro?.saidaIntervalo)}</TableCell>
                          <TableCell className="font-mono tabular-nums">{horaOuTravessao(d.registro?.retornoIntervalo)}</TableCell>
                          <TableCell className="font-mono tabular-nums">{horaOuTravessao(d.registro?.saida)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {d.registro?.horasTrabalhadas != null ? formatarHoras(d.registro.horasTrabalhadas) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {d.atestado && <Badge variant="waiting">Atestado</Badge>}
                              {d.afastamento && <Badge variant="waiting">{ROTULO_DO_AFASTAMENTO[d.afastamento.tipo]}</Badge>}
                              {d.registro?.origem && /import/i.test(d.registro.origem) && (
                                <Badge variant="secondary">Importado</Badge>
                              )}
                              {d.registro && !(d.registro.origem && /import/i.test(d.registro.origem)) && (
                                <Badge variant="success">Manual</Badge>
                              )}
                              {!d.registro && !d.atestado && !d.afastamento && d.util && !futuro && (
                                <Badge variant="overdue">Sem registro</Badge>
                              )}
                              {!d.registro && !d.util && <span className="text-xs text-muted-foreground">Folga</span>}
                              {d.registro?.observacao && (
                                <span className="max-w-48 truncate text-xs text-muted-foreground" title={d.registro.observacao}>
                                  {d.registro.observacao}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {dialogo?.tipo === "dia" && funcionarioId && (
        <DialogPonto
          funcionarioId={funcionarioId}
          funcionarioNome={nomeDoFuncionario}
          data={dialogo.data}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "importar" && <DialogImportarPonto onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function CelulaDoDia({
  data,
  semana,
  hoje,
  util,
}: {
  data: string;
  semana: number;
  hoje: boolean;
  util: boolean;
}) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span
        className={cn(
          "w-8 text-xs font-semibold uppercase",
          util ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {DIAS_DA_SEMANA_CURTOS[semana]}
      </span>
      <span className={cn("font-mono tabular-nums", hoje && "font-bold text-action-soft-foreground")}>
        {diaEMes(data)}
      </span>
      {hoje && <Badge variant="pending">Hoje</Badge>}
    </span>
  );
}
