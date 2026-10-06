"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, UsersRound } from "lucide-react";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { DialogFuncionario } from "@/components/rh/dialog-funcionario";
import { CartaoDaLista } from "@/components/rh/lista-movel";
import { RhNav } from "@/components/rh/rh-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData } from "@/lib/format/date";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import { ROTULO_DO_CONTRATO, useFuncionarios, type FuncionarioResumo } from "@/lib/rh/use-rh";
import { cn } from "@/lib/utils";

type Situacao = "ativos" | "desligados";

const SITUACOES: { id: Situacao; rotulo: string }[] = [
  { id: "ativos", rotulo: "Ativos" },
  { id: "desligados", rotulo: "Desligados" },
];

/** Sem acento e em minúsculas, para a busca achar "Jose" em "José". */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function bate(f: FuncionarioResumo, termo: string): boolean {
  if (!termo) return true;
  return normalizar([f.nomeCompleto, f.cargo, f.departamento, f.email].filter(Boolean).join(" ")).includes(termo);
}

export default function FuncionariosPage() {
  const router = useRouter();
  const podeEscrever = usePodeEscreverNoRh();
  const [situacao, setSituacao] = useState<Situacao>("ativos");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);

  const { data, isLoading, isError, refetch } = useFuncionarios({ ativos: situacao === "ativos" });

  // A busca é feita sobre a lista já carregada: a escola tem dezenas de funcionários, e filtrar na
  // tela responde a cada letra sem uma ida ao servidor.
  const termo = normalizar(busca.trim());
  const lista = useMemo(() => (data ?? []).filter((f) => bate(f, termo)), [data, termo]);

  const situacaoDe = (f: FuncionarioResumo) =>
    f.ativo ? (
      <Badge variant="success">Ativo</Badge>
    ) : (
      <Badge variant="waiting">
        Desligado{f.dataDeDesligamento ? ` em ${formatarSoData(f.dataDeDesligamento)}` : ""}
      </Badge>
    );

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Funcionários"
        apoio="A equipe da escola. Abra uma ficha para ver dados, ponto, atestados, afastamentos e documentos."
        acoes={
          podeEscrever && (
            <Button variant="action" onClick={() => setNovo(true)} className="w-full md:w-auto">
              <Plus />
              Novo funcionário
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cargo ou e-mail"
            aria-label="Buscar funcionário"
            className="pl-8"
          />
        </div>

        <div role="group" aria-label="Situação" className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1">
          {SITUACOES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={situacao === s.id}
              onClick={() => setSituacao(s.id)}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors md:min-h-8",
                situacao === s.id
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {s.rotulo}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os funcionários." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<UsersRound />}
          titulo={
            termo
              ? "Ninguém encontrado"
              : situacao === "ativos"
                ? "Nenhum funcionário cadastrado"
                : "Nenhum funcionário desligado"
          }
          texto={
            termo
              ? "Tente outro nome, cargo ou e-mail."
              : situacao === "ativos"
                ? "Cadastre a equipe, ou crie as fichas a partir dos usuários na Visão geral."
                : "Quem for desligado aparece aqui, com os registros preservados."
          }
          acao={
            !termo &&
            situacao === "ativos" &&
            podeEscrever && (
              <Button variant="outline" onClick={() => setNovo(true)}>
                <Plus />
                Novo funcionário
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((f) => (
              <Link key={f.id} href={`/rh/funcionarios/${f.id}`} className="block">
                <CartaoDaLista
                  titulo={f.nomeCompleto}
                  subtitulo={[f.cargo, f.departamento].filter(Boolean).join(" · ") || "Sem cargo"}
                  etiquetas={situacaoDe(f)}
                  detalhes={
                    <>
                      <span>
                        {ROTULO_DO_CONTRATO[f.tipoDeContrato]}
                        {f.dataDeAdmissao && ` · admitido em ${formatarSoData(f.dataDeAdmissao)}`}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/rh/funcionarios/${f.id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/rh/funcionarios/${f.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {f.nomeCompleto}
                      </Link>
                      {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                    </TableCell>
                    <TableCell>
                      {f.cargo ?? "—"}
                      {f.departamento && <p className="text-xs text-muted-foreground">{f.departamento}</p>}
                    </TableCell>
                    <TableCell>{ROTULO_DO_CONTRATO[f.tipoDeContrato]}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {formatarSoData(f.dataDeAdmissao)}
                    </TableCell>
                    <TableCell>{situacaoDe(f)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {novo && (
        <DialogFuncionario
          funcionario={null}
          onSalvo={(salvo) => router.push(`/rh/funcionarios/${salvo.id}`)}
          onFechar={() => setNovo(false)}
        />
      )}
    </div>
  );
}
