"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, Plus } from "lucide-react";

import { DialogNovoEstudo } from "@/components/finance/precificacao/dialog-novo-estudo";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData } from "@/lib/format/date";
import { formatarReajuste } from "@/lib/finance/precificacao-formatar";
import { useEstudos, type EstudoResumo } from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";

const PASSOS = [
  ["Custos", "a base vem das despesas dos últimos 12 meses; você completa o que falta."],
  ["Próximo ano", "Selic e inflação do Banco Central sugerem o aumento; você decide."],
  ["Alunos e capacidade", "quantos alunos a escola quer ter em cada turma."],
  ["Margem e retorno", "quanto deve sobrar, e o valor de equilíbrio e o alvo de cada turma."],
  ["Nivelamento", "compara cada mensalidade de hoje com o alvo e aprova o reajuste."],
];

function EtiquetaDoEstudo({ status }: { status: EstudoResumo["status"] }) {
  return status === "Aprovado" ? (
    <Badge variant="success">Aprovado</Badge>
  ) : (
    <Badge variant="pending">Rascunho</Badge>
  );
}

export default function PrecificacaoPage() {
  const { data, isLoading, isError, refetch } = useEstudos();
  const [criando, setCriando] = useState(false);

  const lista = [...(data ?? [])].sort((a, b) => b.anoAlvo - a.anoAlvo || b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Precificação"
        apoio="Forme a mensalidade do próximo ano a partir dos custos que o financeiro já tem."
        acoes={
          <Button variant="action" className="w-full md:w-auto" onClick={() => setCriando(true)}>
            <Plus />
            Novo estudo
          </Button>
        }
      />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os estudos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col gap-4">
          <EstadoVazio
            icone={<Calculator />}
            titulo="Nenhum estudo ainda"
            texto="Um estudo guarda as contas de um ano. Crie o primeiro e siga os cinco passos."
            textoClassName="max-w-[420px]"
            acao={
              <Button variant="action" onClick={() => setCriando(true)}>
                <Plus />
                Novo estudo
              </Button>
            }
          />
          <ol className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-3 sm:block">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="sm:mt-2">
                  <p className="font-heading text-sm font-semibold">{titulo}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((e) => (
              <Link key={e.id} href={`/finance/precificacao/${e.id}`} className="block">
                <CartaoDaLista
                  titulo={`${e.anoAlvo} · ${e.nome}`}
                  subtitulo={`Criado em ${formatarData(e.criadoEm)}${e.aprovadoEm ? ` · aprovado em ${formatarData(e.aprovadoEm)}` : ""}`}
                  etiquetas={<EtiquetaDoEstudo status={e.status} />}
                  detalhes={
                    <>
                      <span className="flex justify-between gap-2">
                        <span>Alvo médio</span>
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {formatarMoeda(e.mensalidadeAlvoMedia)}
                        </span>
                      </span>
                      <span className="flex justify-between gap-2">
                        <span>Reajuste sugerido</span>
                        <span className="font-mono tabular-nums">{formatarReajuste(e.reajusteSugeridoGeral)}</span>
                      </span>
                    </>
                  }
                />
              </Link>
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano alvo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Alvo médio</TableHead>
                  <TableHead className="text-right">Reajuste sugerido</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Aprovado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm font-semibold tabular-nums">{e.anoAlvo}</TableCell>
                    <TableCell>
                      <Link href={`/finance/precificacao/${e.id}`} className="font-medium text-primary hover:underline">
                        {e.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <EtiquetaDoEstudo status={e.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatarMoeda(e.mensalidadeAlvoMedia)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatarReajuste(e.reajusteSugeridoGeral)}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarData(e.criadoEm)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {e.aprovadoEm ? formatarData(e.aprovadoEm) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {criando && <DialogNovoEstudo onFechar={() => setCriando(false)} />}
    </div>
  );
}
