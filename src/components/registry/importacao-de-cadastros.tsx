"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  baixarLinhasComErro,
  baixarModeloDeCadastros,
  useConfirmarCadastros,
  usePreviaDeCadastros,
  type ConfirmacaoDaImportacaoDeCadastros,
  type LinhaDaPreviaDeCadastro,
  type OpcoesDaImportacao,
  type PreviaDaImportacaoDeCadastros,
  type ProblemaDaImportacao,
  type SituacaoDoCadastro,
  type TipoDeCadastro,
} from "@/lib/registry/use-importacao-de-cadastros";
import { formatarSoData } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/**
 * Importar alunos (com os responsáveis na mesma linha) ou turmas por planilha Excel, em quatro
 * passos: baixar o modelo, enviar a planilha, conferir (nada é gravado) e confirmar.
 *
 * A prévia e a confirmação recebem o mesmo arquivo e as mesmas opções; o servidor lê tudo de novo
 * a cada chamada. Mudar uma opção depois de conferir refaz a prévia, para o que se vê ser sempre
 * o que será gravado.
 */

const LIMITE_DE_BYTES = 10 * 1024 * 1024;
const LIMITE_DE_LINHAS = 2000;
const PROBLEMAS_POR_VEZ = 100;

const TIPOS: { valor: TipoDeCadastro; rotulo: string; plural: string; modelo: string }[] = [
  { valor: "alunos", rotulo: "Alunos e responsáveis", plural: "alunos", modelo: "Modelo de Alunos e responsáveis" },
  { valor: "turmas", rotulo: "Turmas", plural: "turmas", modelo: "Modelo de Turmas" },
];

function inteiro(v: number) {
  return v.toLocaleString("pt-BR");
}

function megabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function ouNada(n: number, singular: string, plural: string) {
  return `${inteiro(n)} ${n === 1 ? singular : plural}`;
}

/** A frase do que há de errado com o arquivo (formato, tamanho), ou nulo se está tudo bem. */
function problemaDoArquivo(a: File): string | null {
  if (!a.name.toLowerCase().endsWith(".xlsx")) {
    return "Este arquivo não serve. Envie a planilha em Excel (.xlsx): abra o modelo, preencha e salve no mesmo formato.";
  }
  if (a.size === 0) return "O arquivo está vazio.";
  if (a.size > LIMITE_DE_BYTES) {
    return `O arquivo tem ${megabytes(a.size)} e o limite é ${megabytes(LIMITE_DE_BYTES)}. Divida a planilha em partes menores.`;
  }
  return null;
}

const ROTULO_DA_SITUACAO: Record<SituacaoDoCadastro, string> = {
  Nova: "Nova",
  Atualiza: "Atualiza",
  Ignorada: "Ignorada",
  Erro: "Erro",
};

const VARIANTE_DA_SITUACAO: Record<SituacaoDoCadastro, "success" | "waiting" | "secondary" | "overdue"> = {
  Nova: "success",
  Atualiza: "waiting",
  Ignorada: "secondary",
  Erro: "overdue",
};

function EtiquetaDaSituacao({ situacao }: { situacao: SituacaoDoCadastro }) {
  return <Badge variant={VARIANTE_DA_SITUACAO[situacao]}>{ROTULO_DA_SITUACAO[situacao]}</Badge>;
}

// ------------------------------------------------------------------ peças

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 font-heading text-[14.5px] font-semibold">
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11.5px] font-bold text-accent-foreground"
        >
          {numero}
        </span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Opcao({
  marcada,
  onMarcar,
  titulo,
  texto,
  desabilitada,
}: {
  marcada: boolean;
  onMarcar: (v: boolean) => void;
  titulo: string;
  texto: string;
  desabilitada?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
        desabilitada && "cursor-not-allowed opacity-60"
      )}
    >
      <Checkbox className="mt-0.5" checked={marcada} disabled={desabilitada} onCheckedChange={(v) => onMarcar(v === true)} />
      <span className="grid gap-0.5">
        <span className="font-medium">{titulo}</span>
        <span className="text-xs leading-[1.5] text-muted-foreground">{texto}</span>
      </span>
    </label>
  );
}

function Contagem({
  rotulo,
  valor,
  variante,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  variante: "success" | "waiting" | "secondary" | "overdue";
  detalhe?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <Badge variant={variante}>{rotulo}</Badge>
      <p className="mt-1.5 font-numeric text-2xl font-semibold leading-none tabular-nums">{inteiro(valor)}</p>
      {detalhe && <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

type FiltroDeProblemas = "Erro" | "Aviso" | "todos";

function TabelaDeProblemas({ problemas, omitidos }: { problemas: ProblemaDaImportacao[]; omitidos: number }) {
  const erros = problemas.filter((p) => p.gravidade === "Erro").length;
  const avisos = problemas.length - erros;
  const [filtro, setFiltro] = useState<FiltroDeProblemas>(erros > 0 ? "Erro" : "todos");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(PROBLEMAS_POR_VEZ);

  const termo = busca.trim().toLowerCase();
  const visiveis = problemas.filter(
    (p) =>
      (filtro === "todos" || p.gravidade === filtro) &&
      (!termo ||
        `${p.linha} ${p.coluna ?? ""} ${p.motivo}`.toLowerCase().includes(termo))
  );

  const opcoes: { valor: FiltroDeProblemas; rotulo: string }[] = [
    { valor: "Erro", rotulo: `Erros (${inteiro(erros)})` },
    { valor: "Aviso", rotulo: `Avisos (${inteiro(avisos)})` },
    { valor: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filtrar problemas" className="flex flex-wrap gap-1">
          {opcoes.map((o) => (
            <Button
              key={o.valor}
              size="sm"
              variant={filtro === o.valor ? "default" : "outline"}
              onClick={() => {
                setFiltro(o.valor);
                setLimite(PROBLEMAS_POR_VEZ);
              }}
            >
              {o.rotulo}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar nos problemas"
            placeholder="Buscar por linha, coluna ou texto"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setLimite(PROBLEMAS_POR_VEZ);
            }}
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          Nenhum problema neste filtro.
        </p>
      ) : (
        <>
          {/* Celular: cartões. A partir do md, tabela. */}
          <ul className="grid gap-1.5 md:hidden">
            {visiveis.slice(0, limite).map((p, i) => (
              <li key={`${p.linha}-${i}`} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={p.gravidade === "Erro" ? "overdue" : "pending"}>{p.gravidade}</Badge>
                  <span className="font-numeric font-semibold tabular-nums">Linha {p.linha}</span>
                  {p.coluna && <span className="text-muted-foreground">{p.coluna}</span>}
                </div>
                <p className="mt-1 leading-snug">{p.motivo}</p>
              </li>
            ))}
          </ul>

          <div className="hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Linha</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead className="w-56">Coluna</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.slice(0, limite).map((p, i) => (
                  <TableRow key={`${p.linha}-${i}`}>
                    <TableCell className="font-numeric tabular-nums">{p.linha}</TableCell>
                    <TableCell>
                      <Badge variant={p.gravidade === "Erro" ? "overdue" : "pending"}>{p.gravidade}</Badge>
                    </TableCell>
                    <TableCell className="text-[13px]">{p.coluna ?? "—"}</TableCell>
                    <TableCell className="whitespace-normal text-[13px]">{p.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Mostrando {inteiro(Math.min(limite, visiveis.length))} de {inteiro(visiveis.length)}.
            </span>
            {visiveis.length > limite && (
              <Button size="sm" variant="outline" onClick={() => setLimite((l) => l + PROBLEMAS_POR_VEZ)}>
                Mostrar mais
              </Button>
            )}
            {omitidos > 0 && (
              <span>
                Mais {inteiro(omitidos)} ficaram de fora da lista: baixe as linhas com erro para ver todas.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PrimeirasLinhas({ linhas, tipo }: { linhas: LinhaDaPreviaDeCadastro[]; tipo: TipoDeCadastro }) {
  const [aberta, setAberta] = useState(false);
  if (linhas.length === 0) return null;
  const rotuloDoNome = tipo === "alunos" ? "Aluno" : "Turma";

  return (
    <div className="grid gap-2">
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => setAberta((a) => !a)} aria-expanded={aberta}>
        {aberta ? "Esconder" : "Ver"} as primeiras {inteiro(linhas.length)} linhas
      </Button>
      {aberta && (
        <>
          <ul className="grid gap-1.5 md:hidden">
            {linhas.map((l) => (
              <li key={l.numero} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <EtiquetaDaSituacao situacao={l.situacao} />
                  <span className="font-numeric tabular-nums text-muted-foreground">Linha {l.numero}</span>
                </div>
                <p className="mt-1 font-medium">{l.nome ?? "—"}</p>
                {tipo === "alunos" && (
                  <p className="text-muted-foreground">
                    {[l.nascimento ? formatarSoData(l.nascimento) : null, l.turma].filter(Boolean).join(" · ")}
                  </p>
                )}
                {l.responsaveis.length > 0 && <p className="text-muted-foreground">{l.responsaveis.join(" · ")}</p>}
                {l.observacao && <p className="mt-0.5 text-xs text-muted-foreground">{l.observacao}</p>}
              </li>
            ))}
          </ul>
          <div className="hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Linha</TableHead>
                  <TableHead className="w-24">Situação</TableHead>
                  <TableHead>{rotuloDoNome}</TableHead>
                  {tipo === "alunos" && <TableHead className="w-28">Nascimento</TableHead>}
                  {tipo === "alunos" && <TableHead className="w-36">Turma</TableHead>}
                  {tipo === "alunos" && <TableHead>Responsáveis</TableHead>}
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.numero}>
                    <TableCell className="font-numeric tabular-nums">{l.numero}</TableCell>
                    <TableCell>
                      <EtiquetaDaSituacao situacao={l.situacao} />
                    </TableCell>
                    <TableCell className="text-[13px] font-medium">{l.nome ?? "—"}</TableCell>
                    {tipo === "alunos" && (
                      <TableCell className="font-numeric text-[13px] tabular-nums">
                        {l.nascimento ? formatarSoData(l.nascimento) : "—"}
                      </TableCell>
                    )}
                    {tipo === "alunos" && <TableCell className="text-[13px]">{l.turma ?? "—"}</TableCell>}
                    {tipo === "alunos" && (
                      <TableCell className="whitespace-normal text-[13px]">{l.responsaveis.join(", ") || "—"}</TableCell>
                    )}
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">{l.observacao ?? ""}</TableCell>
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

function Resultado({
  resultado,
  tipo,
  onOutra,
}: {
  resultado: ConfirmacaoDaImportacaoDeCadastros;
  tipo: TipoDeCadastro;
  onOutra: () => void;
}) {
  const t = resultado.totais;
  const linhas: string[] = [];
  if (tipo === "alunos") {
    if (t.novos) linhas.push(`${ouNada(t.novos, "aluno novo", "alunos novos")}`);
    if (t.atualizados) linhas.push(`${ouNada(t.atualizados, "aluno atualizado", "alunos atualizados")}`);
    if (t.responsaveisNovos) linhas.push(`${ouNada(t.responsaveisNovos, "responsável novo", "responsáveis novos")}`);
    if (t.responsaveisAtualizados) linhas.push(`${ouNada(t.responsaveisAtualizados, "responsável completado", "responsáveis completados")}`);
    if (t.vinculosNovos) linhas.push(`${ouNada(t.vinculosNovos, "vínculo aluno-responsável", "vínculos aluno-responsável")}`);
    if (t.turmasNovas) linhas.push(`${ouNada(t.turmasNovas, "turma criada", "turmas criadas")}`);
  } else {
    if (t.novos) linhas.push(`${ouNada(t.novos, "turma nova", "turmas novas")}`);
    if (t.atualizados) linhas.push(`${ouNada(t.atualizados, "turma renomeada", "turmas renomeadas")}`);
  }
  if (t.ignorados) linhas.push(`${ouNada(t.ignorados, "linha ignorada", "linhas ignoradas")}`);
  if (t.comErro) linhas.push(`${ouNada(t.comErro, "linha com erro (não entrou)", "linhas com erro (não entraram)")}`);

  return (
    <div className="grid gap-3 rounded-lg border border-success-border bg-success-soft px-4 py-3 text-success-soft-foreground">
      <p className="flex items-center gap-2 font-heading text-[15px] font-semibold">
        <CheckCircle2 className="size-4 shrink-0" />
        {resultado.gravou ? "Importação concluída." : "Nada para importar."}
      </p>
      {linhas.length > 0 && (
        <ul className="grid gap-0.5 text-sm">
          {linhas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {tipo === "alunos" ? (
          <>
            <Link href="/admin/alunos" className={buttonVariants({ variant: "outline" })}>
              Ver alunos
            </Link>
            <Link href="/admin/responsaveis" className={buttonVariants({ variant: "outline" })}>
              Ver responsáveis
            </Link>
          </>
        ) : (
          <Link href="/admin/turmas" className={buttonVariants({ variant: "outline" })}>
            Ver turmas
          </Link>
        )}
        <Button variant="ghost" onClick={onOutra}>
          <RotateCcw />
          Importar outra planilha
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ o cartão

export function ImportacaoDeCadastros() {
  const [tipo, setTipo] = useState<TipoDeCadastro>("alunos");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesDaImportacao>({ atualizarExistentes: false, criarTurmas: false, todasOuNenhuma: false });
  const [previa, setPrevia] = useState<PreviaDaImportacaoDeCadastros | null>(null);
  const [resultado, setResultado] = useState<ConfirmacaoDaImportacaoDeCadastros | null>(null);
  const [erroDoArquivo, setErroDoArquivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  // Muda a cada prévia nova: a tabela de problemas recomeça do filtro certo.
  const [versao, setVersao] = useState(0);
  const [baixando, setBaixando] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const lerPrevia = usePreviaDeCadastros();
  const confirmar = useConfirmarCadastros();
  const ocupado = lerPrevia.isPending || confirmar.isPending;
  const info = TIPOS.find((t) => t.valor === tipo)!;

  async function conferir(a: File, t: TipoDeCadastro, o: OpcoesDaImportacao) {
    setResultado(null);
    try {
      setPrevia(await lerPrevia.mutateAsync({ arquivo: a, tipo: t, opcoes: o }));
      setVersao((v) => v + 1);
      setErroDoArquivo(null);
    } catch (err) {
      setPrevia(null);
      setErroDoArquivo(err instanceof Error ? err.message : "Não foi possível ler a planilha.");
    }
  }

  async function escolher(a: File | undefined) {
    if (!a) return;
    const problema = problemaDoArquivo(a);
    setErroDoArquivo(problema);
    setPrevia(null);
    setResultado(null);
    if (problema) {
      setArquivo(null);
      return;
    }
    setArquivo(a);
    await conferir(a, tipo, opcoes);
  }

  function mudarTipo(novo: TipoDeCadastro) {
    if (novo === tipo || ocupado) return;
    setTipo(novo);
    setPrevia(null);
    setResultado(null);
    setErroDoArquivo(null);
    // A planilha de um tipo não vale para o outro: escolhe de novo.
    setArquivo(null);
  }

  function mudarOpcao(parcial: Partial<OpcoesDaImportacao>) {
    const novas = { ...opcoes, ...parcial };
    setOpcoes(novas);
    // As opções mudam o que acontece com cada linha: refaz a prévia para não mostrar um número que não vale mais.
    const soPararNoErro = Object.keys(parcial).length === 1 && "todasOuNenhuma" in parcial;
    if (arquivo && previa && !soPararNoErro) void conferir(arquivo, tipo, novas);
  }

  async function baixarModelo(t: TipoDeCadastro) {
    setBaixando(t);
    try {
      await baixarModeloDeCadastros(t);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o modelo.");
    } finally {
      setBaixando(null);
    }
  }

  async function baixarErros() {
    if (!arquivo) return;
    setBaixando("erros");
    try {
      await baixarLinhasComErro(arquivo, tipo, opcoes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setBaixando(null);
    }
  }

  async function importar() {
    if (!arquivo || !previa) return;
    try {
      const r = await confirmar.mutateAsync({ arquivo, tipo, opcoes });
      setResultado(r);
      setPrevia(null);
      setArquivo(null);
      if (entrada.current) entrada.current.value = "";
      toast.success(r.gravou ? "Importação concluída." : "Nada foi importado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível importar.");
    }
  }

  function recomecar() {
    setResultado(null);
    setPrevia(null);
    setArquivo(null);
    setErroDoArquivo(null);
  }

  const t = previa?.totais;
  const alunosParaImportar = t ? t.novos + t.atualizados : 0;
  const responsaveisParaImportar = t ? t.responsaveisNovos + t.responsaveisAtualizados : 0;
  const rotuloDoBotao = !t
    ? "Importar"
    : tipo === "alunos"
      ? `Importar ${ouNada(alunosParaImportar, "aluno", "alunos")} e ${ouNada(responsaveisParaImportar, "responsável", "responsáveis")}`
      : `Importar ${ouNada(alunosParaImportar, "turma", "turmas")}`;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">Importar alunos, responsáveis e turmas por planilha</h2>
        <p className="mt-1 text-[13.5px] leading-[1.55] text-pretty text-muted-foreground">
          Baixe o modelo, preencha no Excel e envie. Antes de gravar, você confere o que vai acontecer com cada linha.
          Reenviar a mesma planilha não duplica nada, e célula vazia nunca apaga o que já está cadastrado.
        </p>
      </div>

      {/* ------------------------------------------------ passo 1 */}
      <Passo numero={1} titulo="Baixar o modelo">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {TIPOS.map((tp) => (
            <Button
              key={tp.valor}
              variant="outline"
              disabled={baixando !== null}
              onClick={() => baixarModelo(tp.valor)}
              className="w-full sm:w-auto"
            >
              {baixando === tp.valor ? <Loader2 className="animate-spin" /> : <Download />}
              {tp.modelo}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          O modelo é uma planilha Excel com as instruções, listas para escolher (Sim/Não, parentesco, período, UF) e duas
          linhas de exemplo fictícias, que você pode apagar. Cada linha é um aluno, com o responsável 1 e o responsável 2
          ao lado. Irmãos: repita os dados do responsável em cada linha (o CPF identifica a mesma pessoa).
        </p>
      </Passo>

      {/* ------------------------------------------------ passo 2 */}
      <Passo numero={2} titulo="Enviar a planilha">
        <div className="grid gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">O que você vai importar</span>
          <div role="group" aria-label="O que importar" className="flex flex-wrap gap-1.5">
            {TIPOS.map((tp) => (
              <Button
                key={tp.valor}
                variant={tipo === tp.valor ? "default" : "outline"}
                aria-pressed={tipo === tp.valor}
                disabled={ocupado}
                onClick={() => mudarTipo(tp.valor)}
              >
                {tp.rotulo}
              </Button>
            ))}
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (!ocupado) void escolher(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "grid justify-items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            arrastando ? "border-primary bg-accent" : "border-input bg-card"
          )}
        >
          <input
            ref={entrada}
            type="file"
            accept=".xlsx"
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo da planilha"
            onChange={(e) => {
              const a = e.target.files?.[0];
              // Limpa para poder escolher o mesmo arquivo de novo depois de corrigi-lo.
              e.target.value = "";
              void escolher(a);
            }}
          />
          {lerPrevia.isPending ? (
            <>
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium">Lendo a planilha...</p>
              {arquivo && <p className="text-xs text-muted-foreground">{arquivo.name}</p>}
            </>
          ) : (
            <>
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <FileSpreadsheet className="size-5" />
              </span>
              <p className="text-sm font-medium">
                {arquivo ? arquivo.name : `Arraste a planilha de ${info.plural} para cá`}
              </p>
              <p className="text-xs text-muted-foreground">
                ou escolha no computador (.xlsx, até {megabytes(LIMITE_DE_BYTES)} e {inteiro(LIMITE_DE_LINHAS)} linhas)
              </p>
              <Button variant={arquivo ? "outline" : "action"} disabled={ocupado} onClick={() => entrada.current?.click()}>
                <Upload />
                {arquivo ? "Trocar arquivo" : "Escolher arquivo"}
              </Button>
            </>
          )}
        </div>

        {erroDoArquivo && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{erroDoArquivo}</span>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-2">
          <Opcao
            marcada={opcoes.atualizarExistentes}
            desabilitada={ocupado}
            onMarcar={(v) => mudarOpcao({ atualizarExistentes: v })}
            titulo="Atualizar os existentes"
            texto={
              tipo === "alunos"
                ? "Aluno que já existe (mesmo nome e nascimento) recebe os dados da planilha, e o dado preenchido do responsável é trocado. Desmarcado, o aluno é ignorado e o responsável só tem o que estava vazio completado."
                : "Turma que já existe com a grafia diferente (acento, maiúscula) é renomeada como está na planilha. Desmarcado, ela é ignorada."
            }
          />
          {tipo === "alunos" && (
            <Opcao
              marcada={opcoes.criarTurmas}
              desabilitada={ocupado}
              onMarcar={(v) => mudarOpcao({ criarTurmas: v })}
              titulo="Criar turmas que não existem"
              texto="Desmarcado, a linha com uma turma que não está cadastrada vira erro. A turma é reconhecida sem diferença de acento ou maiúscula."
            />
          )}
        </div>
      </Passo>

      {/* ------------------------------------------------ passo 3 */}
      {previa && t && (
        <Passo numero={3} titulo="Conferir">
          <p className="text-xs text-muted-foreground">
            {previa.arquivo} · {ouNada(t.linhasLidas, "linha lida", "linhas lidas")}. Nada foi gravado ainda.
          </p>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Contagem
              rotulo={tipo === "alunos" ? "Novos" : "Novas"}
              valor={t.novos}
              variante="success"
              detalhe={
                tipo === "alunos"
                  ? [
                      t.responsaveisNovos ? ouNada(t.responsaveisNovos, "responsável novo", "responsáveis novos") : null,
                      t.turmasNovas ? ouNada(t.turmasNovas, "turma a criar", "turmas a criar") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  : undefined
              }
            />
            <Contagem
              rotulo={tipo === "alunos" ? "Atualizados" : "Renomeadas"}
              valor={t.atualizados}
              variante="waiting"
              detalhe={
                tipo === "alunos" && t.responsaveisAtualizados
                  ? `${ouNada(t.responsaveisAtualizados, "responsável completado", "responsáveis completados")}`
                  : undefined
              }
            />
            <Contagem rotulo={tipo === "alunos" ? "Ignorados" : "Ignoradas"} valor={t.ignorados} variante="secondary" detalhe="Já estão cadastrados ou repetidos" />
            <Contagem rotulo="Com erro" valor={t.comErro} variante="overdue" detalhe={t.comErro ? "Não entram" : undefined} />
          </div>

          {previa.colunasIgnoradas.length > 0 && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Colunas que não reconheci e foram ignoradas: {previa.colunasIgnoradas.join(", ")}.
              </span>
            </p>
          )}

          {previa.problemas.length > 0 && <TabelaDeProblemas key={versao} problemas={previa.problemas} omitidos={previa.problemasOmitidos} />}

          {t.comErro > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={baixando !== null} onClick={baixarErros}>
                {baixando === "erros" ? <Loader2 className="animate-spin" /> : <Download />}
                Baixar linhas com erro
              </Button>
              <span className="text-xs text-muted-foreground">
                Corrija no Excel e envie de novo: quem já entrou não é duplicado.
              </span>
            </div>
          )}

          <PrimeirasLinhas linhas={previa.linhas} tipo={tipo} />
        </Passo>
      )}

      {/* ------------------------------------------------ passo 4 */}
      {previa && t && (
        <Passo numero={4} titulo="Confirmar">
          {tipo === "alunos" && (
            <p className="text-xs leading-[1.5] text-muted-foreground">
              A importação não envia convite, e-mail nem WhatsApp. O acesso do responsável ao portal continua sendo pelo
              convite normal, enviado pela escola.
            </p>
          )}
          {t.comErro > 0 && (
            <Opcao
              marcada={opcoes.todasOuNenhuma === true}
              desabilitada={ocupado}
              onMarcar={(v) => mudarOpcao({ todasOuNenhuma: v })}
              titulo="Parar se houver qualquer erro"
              texto={`Desmarcado, as ${ouNada(t.novos + t.atualizados, "linha válida", "linhas válidas")} entram e as ${ouNada(t.comErro, "com erro", "com erro")} ficam de fora. Marcado, nada é gravado enquanto houver erro.`}
            />
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="action"
              disabled={ocupado || !previa.podeConfirmar || (opcoes.todasOuNenhuma === true && t.comErro > 0)}
              onClick={importar}
              className="w-full sm:w-auto"
            >
              {confirmar.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {confirmar.isPending ? "Importando..." : rotuloDoBotao}
            </Button>
            {!previa.podeConfirmar && (
              <span className="text-xs text-muted-foreground">Nenhuma linha nova ou para atualizar: não há o que importar.</span>
            )}
            {opcoes.todasOuNenhuma === true && t.comErro > 0 && (
              <span className="text-xs text-muted-foreground">Corrija os erros e envie a planilha de novo para liberar.</span>
            )}
          </div>
        </Passo>
      )}

      {resultado && <Resultado resultado={resultado} tipo={tipo} onOutra={recomecar} />}
    </div>
  );
}
