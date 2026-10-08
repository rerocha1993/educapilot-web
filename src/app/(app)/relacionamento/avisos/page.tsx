"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessagesSquare, Plus, Search } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import {
  destinoDaPublicacao,
  EtiquetaDoStatus,
  EtiquetaDoTipoDePublicacao,
} from "@/components/relacionamento/etiquetas";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Segmentado } from "@/components/relacionamento/segmentado";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClasses } from "@/lib/kernel/use-classes";
import { formatarSoData } from "@/lib/format/date";
import { useAtraso } from "@/lib/relacionamento/use-atraso";
import {
  ROTULO_DO_STATUS,
  STATUS_DA_PUBLICACAO,
  usePublicacoes,
  type PublicacaoResumo,
  type StatusDaPublicacao,
  type TipoDePublicacao,
} from "@/lib/relacionamento/use-relacionamento";

const TODOS = "todos";

const TIPOS = [
  { id: TODOS, rotulo: "Todos" },
  { id: "Aviso", rotulo: "Avisos" },
  { id: "Evento", rotulo: "Eventos" },
] as const;

/** "dd/MM/yyyy" e, quando há, " às HH:mm". */
function quando(p: PublicacaoResumo): string {
  if (!p.dataDoEvento) return "—";
  return p.horaDoEvento ? `${formatarSoData(p.dataDoEvento)} às ${p.horaDoEvento}` : formatarSoData(p.dataDoEvento);
}

function lidas(p: PublicacaoResumo): string {
  return p.status === "Publicada" ? `${p.lidas}/${p.destinatarios}` : "—";
}

function confirmados(p: PublicacaoResumo): string {
  if (p.status !== "Publicada" || p.confirmadasSim + p.confirmadasNao === 0) return "—";
  return `${p.confirmadasSim} sim · ${p.confirmadasNao} não`;
}

export default function AvisosPage() {
  const [tipo, setTipo] = useState<string>(TODOS);
  const [status, setStatus] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtraso(busca);

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const { data, isLoading, isError, refetch } = usePublicacoes({
    tipo: tipo === TODOS ? null : (tipo as TipoDePublicacao),
    status: status === TODOS ? null : (status as StatusDaPublicacao),
    classId: turma === TODOS ? null : Number(turma),
    ano: null,
    busca: buscaAtrasada,
  });

  const filtrando = tipo !== TODOS || status !== TODOS || turma !== TODOS || busca.trim() !== "";
  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Avisos e eventos"
        apoio="Comunicados e convites para as famílias, com confirmação de leitura e de presença."
        acoes={
          <Link href="/relacionamento/avisos/novo" className={buttonVariants({ variant: "action" })}>
            <Plus /> Nova publicação
          </Link>
        }
      />

      <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
        <Segmentado rotulo="Tipo" opcoes={TIPOS} valor={tipo} onChange={setTipo} className="max-md:w-full" cheio />

        <div className="flex gap-2 max-md:[&>*]:min-w-0 max-md:[&>*]:flex-1">
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger aria-label="Filtrar por situação" className="w-full md:w-40">
              <SelectValue>
                {() => (status === TODOS ? "Toda situação" : ROTULO_DO_STATUS[status as StatusDaPublicacao])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={TODOS}>Toda situação</SelectItem>
              {STATUS_DA_PUBLICACAO.map((s) => (
                <SelectItem key={s} value={s}>
                  {ROTULO_DO_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
            <SelectTrigger aria-label="Filtrar por turma" className="w-full md:w-44">
              <SelectValue>{() => turmaEscolhida?.nome ?? "Todas as turmas"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              <SelectItem value={TODOS}>Todas as turmas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative md:ml-auto md:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar publicação"
            placeholder="Buscar por título"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar as publicações." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <EstadoVazio
          icone={<MessagesSquare />}
          titulo={filtrando ? "Nada com esses filtros" : "Nenhuma publicação ainda"}
          texto={
            filtrando
              ? "Tire um filtro ou mude a busca."
              : "Crie o primeiro aviso ou evento. Ele só chega às famílias quando você publicar."
          }
          acao={
            !filtrando && (
              <Link href="/relacionamento/avisos/novo" className={buttonVariants({ variant: "action" })}>
                <Plus /> Nova publicação
              </Link>
            )
          }
        />
      )}

      {data && data.length > 0 && (
        <>
          {/* Computador: tabela. */}
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Data do evento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Lidas</TableHead>
                  <TableHead>Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-72 whitespace-normal">
                      <Link
                        href={`/relacionamento/avisos/${p.id}`}
                        className="font-medium break-words hover:underline"
                      >
                        {p.titulo}
                      </Link>
                      {p.anexos > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {p.anexos} {p.anexos === 1 ? "anexo" : "anexos"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EtiquetaDoTipoDePublicacao tipo={p.tipo} />
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal text-muted-foreground">
                      {destinoDaPublicacao(p)}
                    </TableCell>
                    <TableCell className="tabular-nums">{quando(p)}</TableCell>
                    <TableCell>
                      <EtiquetaDoStatus status={p.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{lidas(p)}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground tabular-nums">{confirmados(p)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: um cartão por publicação, todo ele um link. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {data.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/relacionamento/avisos/${p.id}`}
                  className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <CartaoDaLista
                    titulo={p.titulo}
                    subtitulo={destinoDaPublicacao(p)}
                    etiquetas={
                      <>
                        <EtiquetaDoTipoDePublicacao tipo={p.tipo} />
                        <EtiquetaDoStatus status={p.status} />
                      </>
                    }
                    detalhes={
                      <>
                        {p.dataDoEvento && <span>Evento em {quando(p)}</span>}
                        {p.status === "Publicada" && (
                          <span>
                            Lidas <span className="font-mono tabular-nums">{lidas(p)}</span>
                            {confirmados(p) !== "—" && <> · {confirmados(p)}</>}
                          </span>
                        )}
                      </>
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
