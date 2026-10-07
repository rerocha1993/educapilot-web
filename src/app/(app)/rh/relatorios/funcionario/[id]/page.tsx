"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Estatistica } from "@/components/padroes/estatistica";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { RhNav } from "@/components/rh/rh-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { formatarHoras, formatarMinutos, limitesDoMes } from "@/lib/rh/formatar";
import {
  ROTULO_DO_AFASTAMENTO,
  ROTULO_DO_CONTRATO,
  useRelatorioDoFuncionario,
} from "@/lib/rh/use-rh";
import { cn } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Relatório individual: dados, resumo de ponto, atestados, afastamentos e documentos no período.
 *
 * O período vem da tela de relatórios (?de=&ate=) e, sem ele, é o mês corrente. A pessoa pode
 * trocá-lo aqui; o que ela digita vale por cima da URL. `window.print()` imprime só o relatório:
 * o menu, as abas e os controles levam `print:hidden`, como em /ocorrencias.
 *
 * Salário e CPF ficam de fora de propósito — é uma folha que vai para o papel.
 */
export default function RelatorioDoFuncionarioPage() {
  const { id } = useParams<{ id: string }>();
  const busca = useQueryStringLocal();

  const hoje = hojeIsoBrasilia();
  const mesCorrente = limitesDoMes(competenciaDeIso(hoje).ano, competenciaDeIso(hoje).mes);
  const daUrl = (nome: string, padrao: string) => {
    const valor = busca.get(nome);
    return valor && ISO.test(valor) ? valor : padrao;
  };

  // O que a pessoa digitou aqui tem prioridade; enquanto não digitou, vale a URL.
  const [digitadoDe, setDigitadoDe] = useState<string | null>(null);
  const [digitadoAte, setDigitadoAte] = useState<string | null>(null);
  const de = digitadoDe ?? daUrl("de", mesCorrente.de);
  const ate = digitadoAte ?? daUrl("ate", mesCorrente.ate);

  const periodoValido = !!de && !!ate && ate >= de;
  const { data, isLoading, isError, refetch } = useRelatorioDoFuncionario(id, de, ate, periodoValido);

  const f = data?.funcionario;
  const p = data?.ponto;

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow={<span className="print:hidden">← Relatórios</span>}
        eyebrowHref="/rh/relatorios"
        titulo={f ? f.nomeCompleto : "Relatório do funcionário"}
        apoio={
          <>
            {periodoValido && (
              <span>
                Período de {formatarSoData(de)} a {formatarSoData(ate)}
              </span>
            )}
            <span className="hidden print:block">Emitido em {formatarSoData(hoje)}</span>
          </>
        }
        acoesClassName="w-full md:w-auto print:hidden"
        acoes={
          <Button
            variant="outline"
            className="w-full md:w-auto"
            disabled={!data}
            onClick={() => window.print()}
          >
            <Printer />
            Imprimir
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:flex md:items-start print:hidden">
        <Campo id="rel-func-de" rotulo="De">
          <Input id="rel-func-de" type="date" value={de} onChange={(e) => setDigitadoDe(e.target.value)} />
        </Campo>
        <Campo id="rel-func-ate" rotulo="Até">
          <Input
            id="rel-func-ate"
            type="date"
            value={ate}
            min={de || undefined}
            onChange={(e) => setDigitadoAte(e.target.value)}
            aria-invalid={!!de && !!ate && ate < de}
          />
        </Campo>
      </div>

      {!periodoValido ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          Informe um período em que o fim não seja antes do início.
        </p>
      ) : isError ? (
        <ErroDeCarga texto="Não foi possível carregar o relatório do funcionário." onTentar={() => refetch()} />
      ) : isLoading || !data || !f || !p ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Secao titulo="Dados">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Dado rotulo="Cargo">{f.cargo}</Dado>
              <Dado rotulo="Departamento">{f.departamento}</Dado>
              <Dado rotulo="Contrato">{ROTULO_DO_CONTRATO[f.tipoDeContrato]}</Dado>
              <Dado rotulo="Admissão">{f.dataDeAdmissao ? formatarSoData(f.dataDeAdmissao) : null}</Dado>
              <Dado rotulo="Carga horária semanal">
                {f.cargaHorariaSemanal != null ? `${f.cargaHorariaSemanal} horas` : null}
              </Dado>
              <Dado rotulo="Situação">
                {f.ativo
                  ? "Ativo"
                  : `Desligado${f.dataDeDesligamento ? ` em ${formatarSoData(f.dataDeDesligamento)}` : ""}`}
              </Dado>
              <Dado rotulo="Documentos arquivados">{String(data.documentos)}</Dado>
            </dl>
          </Secao>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-[15.5px] font-semibold">Ponto no período</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Estatistica
                rotulo="Horas trabalhadas"
                valor={formatarHoras(p.horasTrabalhadas)}
                rodape={`${p.diasTrabalhados} de ${p.diasPrevistos} dias`}
              />
              <Estatistica rotulo="Horas previstas" valor={formatarHoras(p.horasPrevistas)} />
              <Estatistica
                rotulo="Saldo"
                tom={p.saldo < 0 ? "danger" : undefined}
                valor={
                  <span className={cn(p.saldo > 0 && "text-success-soft-foreground")}>
                    {formatarHoras(p.saldo, true)}
                  </span>
                }
              />
              <Estatistica
                rotulo="Faltas"
                valor={p.faltas}
                tom={p.faltas > 0 ? "danger" : undefined}
                rodape={`${p.diasComAtestado} com atestado · ${p.diasAfastado} afastado`}
              />
              <Estatistica rotulo="Atrasos" valor={formatarMinutos(p.atrasosMinutos)} />
            </div>
          </section>

          <Secao titulo={`Atestados (${data.atestados.length})`}>
            {data.atestados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atestado no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Falta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.atestados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {a.inicio === a.fim
                          ? formatarSoData(a.inicio)
                          : `${formatarSoData(a.inicio)} a ${formatarSoData(a.fim)}`}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{a.dias}</TableCell>
                      <TableCell>{a.cid ?? "—"}</TableCell>
                      <TableCell>{a.profissional ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.abonado ? "success" : "waiting"}>
                          {a.abonado ? "Abonada" : "Não abonada"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Secao>

          <Secao titulo={`Afastamentos (${data.afastamentos.length})`}>
            {data.afastamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum afastamento no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.afastamentos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{ROTULO_DO_AFASTAMENTO[a.tipo]}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {a.inicio === a.fim
                          ? formatarSoData(a.inicio)
                          : `${formatarSoData(a.inicio)} a ${formatarSoData(a.fim)}`}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{a.dias}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{a.observacao ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Secao>
        </>
      )}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 break-inside-avoid">
      <h2 className="font-heading text-[15.5px] font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">{rotulo}</dt>
      <dd className="mt-1 text-sm break-words">{children || "—"}</dd>
    </div>
  );
}
