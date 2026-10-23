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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData } from "@/lib/format/date";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import { iniciais } from "@/lib/matriculas/rotulos";
import { ROTULO_DO_CONTRATO, useFuncionarios, type FuncionarioResumo, type TipoDeContrato } from "@/lib/rh/use-rh";
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

const TODOS = "todos";

/** Avatar de iniciais: a lista ainda não traz foto, então o nome ocupa o lugar dela. */
function Avatar({ nome, inativo }: { nome: string; inativo?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
        inativo ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

function Filtro({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <Select value={valor} onValueChange={(v) => onChange(v ?? TODOS)}>
      <SelectTrigger className="h-10 w-full md:h-9 md:w-48" aria-label={rotulo}>
        <SelectValue>{() => (valor === TODOS ? rotulo : (opcoes.find((o) => o.valor === valor)?.rotulo ?? rotulo))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{rotulo}</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function FuncionariosPage() {
  const router = useRouter();
  const podeEscrever = usePodeEscreverNoRh();
  const [situacao, setSituacao] = useState<Situacao>("ativos");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [cargo, setCargo] = useState(TODOS);
  const [departamento, setDepartamento] = useState(TODOS);
  const [contrato, setContrato] = useState(TODOS);

  // Uma só carga com todos: as abas Ativos e Desligados mostram a contagem das duas sem ida dupla
  // ao servidor, e a separação é feita aqui.
  const { data, isLoading, isError, refetch } = useFuncionarios({ ativos: null });

  const todos = useMemo(() => data ?? [], [data]);
  const ativos = useMemo(() => todos.filter((f) => f.ativo), [todos]);
  const desligados = useMemo(() => todos.filter((f) => !f.ativo), [todos]);
  const daAba = situacao === "ativos" ? ativos : desligados;

  const cargos = useMemo(
    () => [...new Set(daAba.map((f) => f.cargo).filter((c): c is string => !!c))].sort((x, y) => x.localeCompare(y)),
    [daAba]
  );
  const departamentos = useMemo(
    () =>
      [...new Set(daAba.map((f) => f.departamento).filter((c): c is string => !!c))].sort((x, y) =>
        x.localeCompare(y)
      ),
    [daAba]
  );
  const contratos = useMemo(() => [...new Set(daAba.map((f) => f.tipoDeContrato))], [daAba]);

  // A busca é feita sobre a lista já carregada: a escola tem dezenas de funcionários, e filtrar na
  // tela responde a cada letra sem uma ida ao servidor.
  const termo = normalizar(busca.trim());
  const lista = useMemo(
    () =>
      daAba.filter(
        (f) =>
          bate(f, termo) &&
          (cargo === TODOS || f.cargo === cargo) &&
          (departamento === TODOS || f.departamento === departamento) &&
          (contrato === TODOS || f.tipoDeContrato === contrato)
      ),
    [daAba, termo, cargo, departamento, contrato]
  );
  const filtrando = !!termo || cargo !== TODOS || departamento !== TODOS || contrato !== TODOS;

  // Totais por tipo de contrato acompanham os filtros.
  const porContrato = useMemo(() => {
    const mapa = new Map<TipoDeContrato, number>();
    for (const f of lista) mapa.set(f.tipoDeContrato, (mapa.get(f.tipoDeContrato) ?? 0) + 1);
    return [...mapa.entries()].sort((x, y) => y[1] - x[1]);
  }, [lista]);

  function limparFiltros() {
    setBusca("");
    setCargo(TODOS);
    setDepartamento(TODOS);
    setContrato(TODOS);
  }

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

      {/* Números antes da lista: quem está na escola, quem saiu e como a equipe se divide por contrato
          (esta divisão acompanha a aba e os filtros). */}
      {!isLoading && !isError && todos.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-numeric font-medium text-foreground">{ativos.length}</span>{" "}
            {ativos.length === 1 ? "ativo" : "ativos"}
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-numeric font-medium text-foreground">{desligados.length}</span>{" "}
            {desligados.length === 1 ? "desligado" : "desligados"}
          </span>
          {porContrato.map(([tipo, n]) => (
            <span key={tipo} className="inline-flex items-center gap-x-2">
              <span aria-hidden>·</span>
              <span>
                {ROTULO_DO_CONTRATO[tipo]} <span className="font-numeric font-medium text-foreground">{n}</span>
              </span>
            </span>
          ))}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div role="group" aria-label="Situação" className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1">
            {SITUACOES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={situacao === s.id}
                onClick={() => {
                  setSituacao(s.id);
                  // Cargos e departamentos mudam de uma aba para a outra: filtro antigo deixaria a lista vazia.
                  setCargo(TODOS);
                  setDepartamento(TODOS);
                  setContrato(TODOS);
                }}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-[13.5px] whitespace-nowrap transition-colors md:min-h-8",
                  situacao === s.id
                    ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                    : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {s.rotulo}
                {!isLoading && (
                  <span className="font-numeric text-xs opacity-75">
                    {s.id === "ativos" ? ativos.length : desligados.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo ou e-mail"
              aria-label="Buscar funcionário"
              className="h-10 pl-8 md:h-9"
            />
          </div>
        </div>

        {(cargos.length > 1 || departamentos.length > 1 || contratos.length > 1) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:items-center">
            {cargos.length > 1 && (
              <Filtro
                rotulo="Todos os cargos"
                valor={cargo}
                onChange={setCargo}
                opcoes={cargos.map((c) => ({ valor: c, rotulo: c }))}
              />
            )}
            {departamentos.length > 1 && (
              <Filtro
                rotulo="Todos os departamentos"
                valor={departamento}
                onChange={setDepartamento}
                opcoes={departamentos.map((c) => ({ valor: c, rotulo: c }))}
              />
            )}
            {contratos.length > 1 && (
              <Filtro
                rotulo="Todos os contratos"
                valor={contrato}
                onChange={setContrato}
                opcoes={contratos.map((c) => ({ valor: c, rotulo: ROTULO_DO_CONTRATO[c] }))}
              />
            )}
            {filtrando && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="justify-self-start">
                Limpar filtros
              </Button>
            )}
          </div>
        )}
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
            filtrando
              ? "Ninguém encontrado"
              : situacao === "ativos"
                ? "Nenhum funcionário cadastrado"
                : "Nenhum funcionário desligado"
          }
          texto={
            filtrando
              ? "Tente outro nome, cargo ou e-mail, ou limpe os filtros."
              : situacao === "ativos"
                ? "Cadastre a equipe, ou crie as fichas a partir dos usuários na Visão geral."
                : "Quem for desligado aparece aqui, com os registros preservados."
          }
          acao={
            !filtrando &&
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
                  titulo={
                    <span className="flex items-center gap-2.5">
                      <Avatar nome={f.nomeCompleto} inativo={!f.ativo} />
                      <span className="min-w-0">{f.nomeCompleto}</span>
                    </span>
                  }
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
                    className="cursor-pointer [&>td]:py-1.5"
                    onClick={() => router.push(`/rh/funcionarios/${f.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={f.nomeCompleto} inativo={!f.ativo} />
                        <div className="min-w-0">
                          <Link
                            href={`/rh/funcionarios/${f.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium hover:underline"
                          >
                            {f.nomeCompleto}
                          </Link>
                          {f.email && <p className="truncate text-xs text-muted-foreground">{f.email}</p>}
                        </div>
                      </div>
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

          <p className="text-xs text-muted-foreground">
            <span className="font-numeric">{lista.length}</span>{" "}
            {lista.length === 1 ? "funcionário" : "funcionários"}
            {filtrando && (
              <>
                {" "}
                de <span className="font-numeric">{daAba.length}</span>
              </>
            )}
          </p>
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
