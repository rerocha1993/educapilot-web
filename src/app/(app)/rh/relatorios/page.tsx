"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileSearch } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { RhNav } from "@/components/rh/rh-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { competenciaDeIso, hojeIsoBrasilia } from "@/lib/format/date";
import { formatarHoras, formatarMinutos, limitesDoMes } from "@/lib/rh/formatar";
import { exportarRelatorioDaEquipe, useRelatorioDaEquipe, type LinhaDaEquipe } from "@/lib/rh/use-rh";
import { cn } from "@/lib/utils";

/** Saldo negativo em vermelho, positivo em verde. */
function Saldo({ valor }: { valor: number }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        valor < 0 && "font-semibold text-destructive",
        valor > 0 && "font-semibold text-success-soft-foreground"
      )}
    >
      {formatarHoras(valor, true)}
    </span>
  );
}

export default function RelatoriosDoRhPage() {
  // Período padrão: o mês corrente, do primeiro ao último dia.
  const [padrao] = useState(() => {
    const { ano, mes } = competenciaDeIso(hojeIsoBrasilia());
    return limitesDoMes(ano, mes);
  });
  const [de, setDe] = useState(padrao.de);
  const [ate, setAte] = useState(padrao.ate);
  const [exportando, setExportando] = useState(false);

  const periodoValido = !!de && !!ate && ate >= de;
  const { data, isLoading, isError, refetch } = useRelatorioDaEquipe(de, ate, periodoValido);

  const lista = data ?? [];
  const busca = `?de=${de}&ate=${ate}`;
  const linkDoFuncionario = (l: LinhaDaEquipe) => `/rh/relatorios/funcionario/${l.funcionarioId}${busca}`;

  async function exportar() {
    setExportando(true);
    try {
      await exportarRelatorioDaEquipe(de, ate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível exportar a planilha.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Relatórios"
        apoio="O resumo de ponto de toda a equipe no período. Abra um funcionário para ver o relatório completo e imprimir."
        acoesClassName="w-full md:w-auto"
        acoes={
          <Button
            variant="outline"
            className="w-full md:w-auto"
            disabled={exportando || !periodoValido}
            onClick={exportar}
          >
            <Download />
            {exportando ? "Exportando..." : "Exportar XLSX"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:flex md:items-start">
        <Campo id="rel-de" rotulo="De">
          <Input id="rel-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </Campo>
        <Campo id="rel-ate" rotulo="Até">
          <Input
            id="rel-ate"
            type="date"
            value={ate}
            min={de || undefined}
            onChange={(e) => setAte(e.target.value)}
            aria-invalid={!!de && !!ate && ate < de}
          />
        </Campo>
      </div>

      {!periodoValido ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          Informe um período em que o fim não seja antes do início.
        </p>
      ) : isError ? (
        <ErroDeCarga texto="Não foi possível carregar o relatório da equipe." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<FileSearch />}
          titulo="Nenhum funcionário no período"
          texto="Cadastre a equipe em Funcionários para ver o resumo de ponto."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((l) => (
              <CartaoDaLista
                key={l.funcionarioId}
                titulo={l.nome}
                subtitulo={l.cargo ?? undefined}
                etiquetas={<Saldo valor={l.saldo} />}
                detalhes={
                  <>
                    <span>
                      {formatarHoras(l.horasTrabalhadas)} de {formatarHoras(l.horasPrevistas)}
                    </span>
                    <span>
                      {l.faltas} {l.faltas === 1 ? "falta" : "faltas"} · atrasos {formatarMinutos(l.atrasosMinutos)}
                    </span>
                  </>
                }
                acoes={
                  <Link href={linkDoFuncionario(l)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Ver relatório
                  </Link>
                }
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right">Trabalhadas</TableHead>
                  <TableHead className="text-right">Previstas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Faltas</TableHead>
                  <TableHead className="text-right">Atrasos</TableHead>
                  <TableHead className="text-right">Atestado</TableHead>
                  <TableHead className="text-right">Afastado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((l) => (
                  <TableRow key={l.funcionarioId}>
                    <TableCell>
                      <p className="font-medium">{l.nome}</p>
                      {l.cargo && <p className="text-xs text-muted-foreground">{l.cargo}</p>}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarHoras(l.horasTrabalhadas)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarHoras(l.horasPrevistas)}</TableCell>
                    <TableCell className="text-right">
                      <Saldo valor={l.saldo} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {l.diasTrabalhados}/{l.diasPrevistos}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        l.faltas > 0 && "font-semibold text-destructive"
                      )}
                    >
                      {l.faltas}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatarMinutos(l.atrasosMinutos)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{l.diasComAtestado}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{l.diasAfastado}</TableCell>
                    <TableCell className="text-right">
                      <Link href={linkDoFuncionario(l)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Ver relatório
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
