"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import {
  JANELAS,
  ROTULO_DA_JANELA,
  formatarNota,
  useCiclos,
  useConfiguracaoDeDesempenho,
  useCriarCiclo,
  useDesempenhoDoFuncionario,
  useEncerrarCiclo,
  useFormulario,
  useFormularios,
  usePreviaDaNota,
  useSalvarConfiguracaoDeDesempenho,
  useSalvarFormulario,
  type Ciclo,
  type ConfiguracaoDeDesempenho,
  type Faixa,
  type Pergunta,
} from "@/lib/rh/use-desempenho";
import { cn } from "@/lib/utils";

import { Campo, ErroDeCarga } from "../campo";
import { Confirmacao } from "../confirmacao";
import { BotaoDeIcone } from "../lista-movel";
import { SeletorDeFuncionario } from "../seletor-de-funcionario";
import { AvisoDeApoio, FaixaBadge } from "./pecas";

const numero = (texto: string) => (texto.trim() === "" ? NaN : Number(texto.replace(",", ".")));

// ------------------------------------------------------------------ aba Nota

function EditorDaNota({ config }: { config: ConfiguracaoDeDesempenho }) {
  const salvar = useSalvarConfiguracaoDeDesempenho();
  const previa = usePreviaDaNota();

  const [pesos, setPesos] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(config.pesos).map(([k, v]) => [k, String(v)]))
  );
  const [faixas, setFaixas] = useState<{ nome: string; minimo: string }[]>(() =>
    [...config.faixas].sort((a, b) => b.minimo - a.minimo).map((f) => ({ nome: f.nome, minimo: String(f.minimo) }))
  );
  const [janela, setJanela] = useState(config.janela);
  const [tolerancia, setTolerancia] = useState(String(config.toleranciaDeAtrasoMinutosPorMes));
  const [pontosPorHora, setPontosPorHora] = useState(String(config.pontosPorHoraDeAtraso));
  const [meiaVida, setMeiaVida] = useState(String(config.meiaVidaDaAdvertenciaDias));
  const [bonus, setBonus] = useState(String(config.bonusMaximoDeReconhecimentos));
  const [diasMinimos, setDiasMinimos] = useState(String(config.diasMinimosDeVinculo));
  const [funcionarioDaPrevia, setFuncionarioDaPrevia] = useState("");

  const soma = Object.values(pesos).reduce((s, v) => s + (Number.isNaN(numero(v)) ? 0 : numero(v)), 0);
  const somaOk = Math.abs(soma - 100) < 0.05;
  const faixasOk =
    faixas.length >= 2 &&
    faixas.every((f) => f.nome.trim() && !Number.isNaN(numero(f.minimo))) &&
    faixas.some((f) => numero(f.minimo) === 0);

  const montar = (): Omit<ConfiguracaoDeDesempenho, "componentes"> => ({
    pesos: Object.fromEntries(Object.entries(pesos).map(([k, v]) => [k, numero(v) || 0])),
    faixas: faixas.map((f): Faixa => ({ nome: f.nome.trim(), minimo: numero(f.minimo) })),
    janela,
    toleranciaDeAtrasoMinutosPorMes: Math.round(numero(tolerancia) || 0),
    pontosPorHoraDeAtraso: numero(pontosPorHora) || 0,
    meiaVidaDaAdvertenciaDias: Math.round(numero(meiaVida) || 0),
    bonusMaximoDeReconhecimentos: numero(bonus) || 0,
    diasMinimosDeVinculo: Math.round(numero(diasMinimos) || 0),
  });

  async function gravar() {
    try {
      await salvar.mutateAsync(montar());
      toast.success("Configuração salva. O histórico já fechado não muda.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function calcularPrevia() {
    try {
      await previa.mutateAsync({ funcionarioId: funcionarioDaPrevia, dados: montar() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível calcular a prévia.");
    }
  }

  const atual = useDesempenhoDoFuncionario(funcionarioDaPrevia);
  const pesoAtual = (chave: string) => atual.data?.nota.componentes.find((c) => c.chave === chave);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-base font-semibold">Pesos dos componentes</h3>
          <span className={cn("font-mono text-sm font-semibold tabular-nums", somaOk ? "text-success" : "text-destructive")}>
            Soma {soma.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} / 100
          </span>
        </div>
        <ul className="mt-2 divide-y divide-border">
          {config.componentes
            .filter((c) => c.chave !== "Reconhecimentos")
            .map((c) => (
              <li key={c.chave} className="grid grid-cols-[1fr_5rem] items-center gap-x-3 py-1.5">
                <div className="min-w-0">
                  <label htmlFor={`peso-${c.chave}`} className="text-sm font-medium">
                    {c.nome}
                  </label>
                  <p className="text-[11.5px] leading-snug text-muted-foreground">{c.descricao}</p>
                  {c.chave === "Ocorrencias" && (
                    <p className="text-[11.5px] leading-snug font-medium text-action-soft-foreground">
                      Peso baixo de propósito: ocorrência na sala não é culpa individual, é indicador de contexto.
                    </p>
                  )}
                </div>
                <Input
                  id={`peso-${c.chave}`}
                  inputMode="decimal"
                  value={pesos[c.chave] ?? ""}
                  onChange={(e) => setPesos((p) => ({ ...p, [c.chave]: e.target.value }))}
                  className="text-right font-mono"
                  aria-invalid={!somaOk}
                />
              </li>
            ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-muted-foreground">Componente sem dado sai da conta e os pesos dos outros se redistribuem.</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPesos(Object.fromEntries(config.componentes.filter((c) => c.chave !== "Reconhecimentos").map((c) => [c.chave, String(c.pesoPadrao)])))}
          >
            <RotateCcw /> Padrão
          </Button>
        </div>

        <h3 className="mt-4 font-heading text-base font-semibold">Faixas de classificação</h3>
        <ul className="mt-2 grid gap-1.5">
          {faixas.map((f, i) => (
            <li key={i} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
              <Input aria-label="Nome da faixa" maxLength={60} value={f.nome} onChange={(e) => setFaixas((fs) => fs.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
              <Input aria-label={`Nota mínima de ${f.nome}`} inputMode="decimal" value={f.minimo} onChange={(e) => setFaixas((fs) => fs.map((x, j) => (j === i ? { ...x, minimo: e.target.value } : x)))} className="text-right font-mono" />
              <BotaoDeIcone rotulo="Remover faixa" icone={<Trash2 />} perigo disabled={faixas.length <= 2} onClick={() => setFaixas((fs) => fs.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className={cn("text-[11.5px]", faixasOk ? "text-muted-foreground" : "text-destructive")}>
            Nota mínima de cada faixa. A mais baixa precisa começar em 0. Use nomes neutros.
          </p>
          <Button size="sm" variant="outline" disabled={faixas.length >= 8} onClick={() => setFaixas((fs) => [...fs, { nome: "", minimo: "" }])}>
            <Plus /> Faixa
          </Button>
        </div>
      </section>

      <div className="grid content-start gap-3">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-heading text-base font-semibold">Janela e regras</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Campo id="cfg-janela" rotulo="Janela da nota" className="sm:col-span-2" dica="Período em que ponto, tarefas e ocorrências são medidos.">
              <Select value={janela} onValueChange={(v) => v && setJanela(v)}>
                <SelectTrigger id="cfg-janela" className="w-full">
                  <SelectValue>{() => ROTULO_DA_JANELA[janela] ?? janela}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {JANELAS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {ROTULO_DA_JANELA[j]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="cfg-tol" rotulo="Tolerância de atraso (min/mês)">
              <Input id="cfg-tol" inputMode="numeric" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} />
            </Campo>
            <Campo id="cfg-pph" rotulo="Pontos perdidos por hora de atraso">
              <Input id="cfg-pph" inputMode="decimal" value={pontosPorHora} onChange={(e) => setPontosPorHora(e.target.value)} />
            </Campo>
            <Campo id="cfg-meia" rotulo="Advertência pela metade em (dias)" dica="Quanto tempo até o peso cair para a metade.">
              <Input id="cfg-meia" inputMode="numeric" value={meiaVida} onChange={(e) => setMeiaVida(e.target.value)} />
            </Campo>
            <Campo id="cfg-bonus" rotulo="Bônus máximo de reconhecimentos (pontos)">
              <Input id="cfg-bonus" inputMode="decimal" value={bonus} onChange={(e) => setBonus(e.target.value)} />
            </Campo>
            <Campo id="cfg-dias" rotulo="Aviso de poucos dados abaixo de (dias)">
              <Input id="cfg-dias" inputMode="numeric" value={diasMinimos} onChange={(e) => setDiasMinimos(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="action" disabled={!somaOk || !faixasOk || salvar.isPending} onClick={gravar}>
              {salvar.isPending ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4" aria-label="Prévia do efeito">
          <h3 className="font-heading text-base font-semibold">Prévia do efeito</h3>
          <p className="text-[12.5px] text-muted-foreground">Veja como a nota de um funcionário ficaria com estes valores, sem gravar nada.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SeletorDeFuncionario valor={funcionarioDaPrevia} onChange={(id) => { setFuncionarioDaPrevia(id); previa.reset(); }} className="md:w-64" />
            <Button variant="outline" disabled={!funcionarioDaPrevia || !somaOk || !faixasOk || previa.isPending} onClick={calcularPrevia}>
              {previa.isPending ? "Calculando..." : "Calcular prévia"}
            </Button>
          </div>
          {previa.data && (
            <div className="mt-3 grid gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  Hoje: <b className="font-mono tabular-nums">{formatarNota(atual.data?.nota.nota)}</b> <FaixaBadge faixa={atual.data?.nota.faixa} />
                </span>
                <span>
                  Com estes valores: <b className="font-mono tabular-nums">{formatarNota(previa.data.nota)}</b> <FaixaBadge faixa={previa.data.faixa} />
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead className="text-right">Peso hoje</TableHead>
                    <TableHead className="text-right">Peso novo</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previa.data.componentes
                    .filter((c) => c.chave !== "Reconhecimentos")
                    .map((c) => (
                      <TableRow key={c.chave} className={cn(!c.incluido && "text-muted-foreground")}>
                        <TableCell>{c.nome}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{pesoAtual(c.chave)?.incluido ? `${formatarNota(pesoAtual(c.chave)?.pesoEfetivo)}%` : "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{c.incluido ? `${formatarNota(c.pesoEfetivo)}%` : "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{c.incluido ? formatarNota(c.nota) : "—"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <AvisoDeApoio />
      </div>
    </div>
  );
}

function AbaNota() {
  const { data, isLoading, isError, refetch } = useConfiguracaoDeDesempenho();
  if (isError) return <ErroDeCarga texto="Não foi possível carregar a configuração." onTentar={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-96 w-full rounded-xl" />;
  // Recria o editor quando a configuração gravada muda (o estado local parte do que veio do servidor).
  return <EditorDaNota key={JSON.stringify([data.pesos, data.faixas, data.janela, data.bonusMaximoDeReconhecimentos])} config={data} />;
}

// ------------------------------------------------------------------ aba Formulário

const FUNCOES = [
  { valor: "", rotulo: "Todos" },
  { valor: "Professor", rotulo: "Professor(a)" },
  { valor: "Apoio", rotulo: "Apoio/Administrativo" },
];

function PerguntaEditavel({
  p,
  i,
  total,
  onChange,
  onMover,
  onRemover,
}: {
  p: Pergunta;
  i: number;
  total: number;
  onChange: (mudanca: Partial<Pergunta>) => void;
  onMover: (delta: -1 | 1) => void;
  onRemover: () => void;
}) {
  const nota = p.tipo === "Nota";
  return (
    <li className="grid gap-1.5 rounded-lg border border-border p-2.5">
      <div className="grid gap-1.5 md:grid-cols-[12rem_1fr_6.5rem_4.5rem] md:items-center">
        <Input aria-label="Competência" placeholder="Competência" maxLength={120} value={p.grupo} onChange={(e) => onChange({ grupo: e.target.value })} />
        <Input aria-label="Pergunta" placeholder="Texto da pergunta" maxLength={500} value={p.texto} onChange={(e) => onChange({ texto: e.target.value })} />
        <Select value={p.tipo} onValueChange={(v) => v && onChange({ tipo: v, peso: v === "Nota" ? p.peso || 1 : 0 })}>
          <SelectTrigger aria-label="Tipo" className="w-full">
            <SelectValue>{() => (nota ? "Nota 1–5" : "Texto")}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="Nota">Nota 1–5</SelectItem>
            <SelectItem value="Texto">Texto</SelectItem>
          </SelectContent>
        </Select>
        <Input aria-label="Peso" title="Peso na média" inputMode="decimal" disabled={!nota} value={nota ? String(p.peso) : ""} placeholder="peso" onChange={(e) => onChange({ peso: numero(e.target.value) || 0 })} className="text-right font-mono" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <label className="inline-flex items-center gap-1.5 text-[13px]">
          <Checkbox checked={p.obrigatoria} onCheckedChange={(v) => onChange({ obrigatoria: v === true })} /> Obrigatória
        </label>
        <Select value={p.paraFuncao ?? ""} onValueChange={(v) => onChange({ paraFuncao: v || null })}>
          <SelectTrigger aria-label="Função" size="sm" className="w-44">
            <SelectValue>{() => `Para: ${FUNCOES.find((f) => f.valor === (p.paraFuncao ?? ""))?.rotulo ?? "Todos"}`}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {FUNCOES.map((f) => (
              <SelectItem key={f.valor || "todos"} value={f.valor}>
                {f.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex">
          <BotaoDeIcone rotulo="Subir" icone={<ArrowUp />} disabled={i === 0} onClick={() => onMover(-1)} />
          <BotaoDeIcone rotulo="Descer" icone={<ArrowDown />} disabled={i === total - 1} onClick={() => onMover(1)} />
          <BotaoDeIcone rotulo="Remover pergunta" icone={<Trash2 />} perigo onClick={onRemover} />
        </div>
      </div>
      {nota && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-muted-foreground">Âncoras (o que cada nota quer dizer)</summary>
          <div className="mt-1.5 grid gap-1">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="grid grid-cols-[1.25rem_1fr] items-center gap-2">
                <span className="text-center font-semibold">{n + 1}</span>
                <Input
                  aria-label={`Âncora da nota ${n + 1}`}
                  maxLength={200}
                  value={p.ancoras[n] ?? ""}
                  onChange={(e) => {
                    const novas = Array.from({ length: 5 }, (_, k) => (k === n ? e.target.value : (p.ancoras[k] ?? "")));
                    onChange({ ancoras: novas.every((a) => !a.trim()) ? [] : novas });
                  }}
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Preencha as cinco ou nenhuma.</p>
          </div>
        </details>
      )}
    </li>
  );
}

function EditorDoFormulario({
  id,
  nomeInicial,
  cargoInicial,
  ativoInicial,
  perguntasIniciais,
  emUso,
  versao,
  onSalvo,
}: {
  id?: string;
  nomeInicial: string;
  cargoInicial: string;
  ativoInicial: boolean;
  perguntasIniciais: Pergunta[];
  emUso: boolean;
  versao?: number;
  onSalvo: (id: string) => void;
}) {
  const salvar = useSalvarFormulario();
  const [nome, setNome] = useState(nomeInicial);
  const [cargo, setCargo] = useState(cargoInicial);
  const [ativo, setAtivo] = useState(ativoInicial);
  const [perguntas, setPerguntas] = useState<Pergunta[]>(perguntasIniciais);

  const alterar = (i: number, m: Partial<Pergunta>) => setPerguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...m } : p)));
  const mover = (i: number, d: -1 | 1) =>
    setPerguntas((ps) => {
      const novo = [...ps];
      [novo[i], novo[i + d]] = [novo[i + d], novo[i]];
      return novo;
    });
  const valido =
    nome.trim() !== "" &&
    perguntas.length > 0 &&
    perguntas.some((p) => p.tipo === "Nota") &&
    perguntas.every((p) => p.grupo.trim() && p.texto.trim());

  async function gravar() {
    try {
      const r = await salvar.mutateAsync({
        id,
        dados: {
          nome: nome.trim(),
          publicoAlvoCargo: cargo.trim() || null,
          ativo,
          perguntas: perguntas.map((p, i) => ({ ...p, id: null, ordem: i + 1, ancoras: p.tipo === "Nota" ? p.ancoras : [], peso: p.tipo === "Nota" ? p.peso : 0 })),
        },
      });
      toast.success(emUso ? `Versão ${r.versao} criada. Os feedbacks já feitos seguem com a versão anterior.` : "Formulário salvo.");
      onSalvo(r.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o formulário.");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end">
        <Campo id="form-nome" rotulo="Nome do formulário">
          <Input id="form-nome" maxLength={160} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo id="form-cargo" rotulo="Cargo de destino (opcional)">
          <Input id="form-cargo" maxLength={120} value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </Campo>
        <label className="inline-flex items-center gap-1.5 pb-2 text-sm">
          <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} /> Ativo
        </label>
      </div>

      {emUso && (
        <p className="rounded-lg bg-action-soft px-3 py-2 text-[12.5px] text-action-soft-foreground">
          Este formulário (v{versao}) já foi usado em ciclo ou feedback. Salvar grava uma <b>versão nova</b> e mantém a anterior
          como está, para os feedbacks antigos continuarem com as perguntas em que foram respondidos.
        </p>
      )}

      <ul className="grid gap-2">
        {perguntas.map((p, i) => (
          <PerguntaEditavel key={i} p={p} i={i} total={perguntas.length} onChange={(m) => alterar(i, m)} onMover={(d) => mover(i, d)} onRemover={() => setPerguntas((ps) => ps.filter((_, j) => j !== i))} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={perguntas.length >= 60}
          onClick={() => setPerguntas((ps) => [...ps, { grupo: ps[ps.length - 1]?.grupo ?? "", texto: "", tipo: "Nota", peso: 1, obrigatoria: true, ordem: ps.length + 1, ancoras: [], paraFuncao: null }])}
        >
          <Plus /> Pergunta
        </Button>
        <Button variant="action" disabled={!valido || salvar.isPending} onClick={gravar}>
          {salvar.isPending ? "Salvando..." : emUso ? "Salvar como nova versão" : "Salvar formulário"}
        </Button>
      </div>
    </div>
  );
}

function AbaFormulario() {
  const lista = useFormularios();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);

  const formularios = lista.data ?? [];
  // O formulário em foco: o escolhido, ou o ativo mais recente.
  const foco = novo ? null : (escolhido ?? formularios.find((f) => f.ativo)?.id ?? formularios[0]?.id ?? null);
  const { data: formulario, isFetchedAfterMount } = useFormulario(foco);

  if (lista.isError) return <ErroDeCarga texto="Não foi possível carregar os formulários." onTentar={() => lista.refetch()} />;
  if (lista.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={novo ? "__novo" : (foco ?? "")} onValueChange={(v) => { if (!v) return; setNovo(v === "__novo"); if (v !== "__novo") setEscolhido(v); }}>
          <SelectTrigger aria-label="Formulário" className="w-full md:w-80">
            <SelectValue>
              {() => {
                if (novo) return "Novo formulário";
                const f = formularios.find((x) => x.id === foco);
                return f ? `${f.nome} · v${f.versao}${f.ativo ? "" : " (inativo)"}` : "Escolha";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {formularios.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome} · v{f.versao}
                {!f.ativo && " (inativo)"}
                {f.padrao && " · padrão"}
              </SelectItem>
            ))}
            <SelectItem value="__novo">+ Novo formulário</SelectItem>
          </SelectContent>
        </Select>
        {formulario && !novo && <Badge variant={formulario.emUso ? "pending" : "outline"}>{formulario.emUso ? "Em uso" : "Sem uso"}</Badge>}
      </div>

      {novo ? (
        <EditorDoFormulario
          key="novo"
          nomeInicial=""
          cargoInicial=""
          ativoInicial
          perguntasIniciais={[{ grupo: "", texto: "", tipo: "Nota", peso: 1, obrigatoria: true, ordem: 1, ancoras: [], paraFuncao: null }]}
          emUso={false}
          onSalvo={(id) => { setNovo(false); setEscolhido(id); }}
        />
      ) : !formulario || !isFetchedAfterMount ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <EditorDoFormulario
          key={formulario.id}
          id={formulario.id}
          nomeInicial={formulario.nome}
          cargoInicial={formulario.publicoAlvoCargo ?? ""}
          ativoInicial={formulario.ativo}
          perguntasIniciais={formulario.perguntas}
          emUso={formulario.emUso}
          versao={formulario.versao}
          onSalvo={setEscolhido}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ aba Ciclos

function AbaCiclos() {
  const ciclos = useCiclos();
  const formularios = useFormularios();
  const criar = useCriarCiclo();
  const encerrar = useEncerrarCiclo();

  const [nome, setNome] = useState("");
  const [inicio, setInicio] = useState(() => `${hojeIsoBrasilia().slice(0, 4)}-01-01`);
  const [fim, setFim] = useState(() => `${hojeIsoBrasilia().slice(0, 4)}-12-31`);
  const [formularioId, setFormularioId] = useState("");
  const [encerrando, setEncerrando] = useState<Ciclo | null>(null);

  const lista = ciclos.data ?? [];
  const temAberto = lista.some((c) => c.status === "Aberto");
  const ativos = (formularios.data ?? []).filter((f) => f.ativo);
  const formularioEscolhido = ativos.find((f) => f.id === formularioId);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome do ciclo.");
    if (!inicio || !fim || fim < inicio) return toast.error("Informe um período em que o fim não seja antes do início.");
    try {
      await criar.mutateAsync({ nome: nome.trim(), inicio, fim, formularioId: formularioId || null });
      toast.success("Ciclo aberto.");
      setNome("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o ciclo.");
    }
  }

  async function confirmarEncerramento(c: Ciclo) {
    try {
      const r = await encerrar.mutateAsync(c.id);
      toast.success(`Ciclo encerrado: ${r.gravados} nota(s) gravada(s) no histórico.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível encerrar o ciclo.");
    } finally {
      setEncerrando(null);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-xl border border-border bg-card">
        {ciclos.isError ? (
          <div className="p-4">
            <ErroDeCarga texto="Não foi possível carregar os ciclos." onTentar={() => ciclos.refetch()} />
          </div>
        ) : ciclos.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : lista.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhum ciclo ainda. Abra o primeiro ao lado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciclo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Formulário</TableHead>
                <TableHead className="text-right">Concluídos</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="font-mono text-[12.5px] tabular-nums">
                    {formatarSoData(c.inicio)} a {formatarSoData(c.fim)}
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{c.formularioNome ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.avaliacoesConcluidas}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Aberto" ? "success" : "outline"}>{c.status === "Aberto" ? "Aberto" : "Encerrado"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === "Aberto" && (
                      <Button size="sm" variant="outline" onClick={() => setEncerrando(c)}>
                        Encerrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-heading text-base font-semibold">Abrir ciclo</h3>
        {temAberto ? (
          <p className="mt-2 text-sm text-muted-foreground">Já existe um ciclo aberto. Encerre-o para abrir outro: só um fica aberto por vez.</p>
        ) : (
          <form onSubmit={abrir} noValidate className="mt-2 grid gap-3">
            <Campo id="ciclo-nome" rotulo="Nome">
              <Input id="ciclo-nome" maxLength={120} placeholder="Ex.: 1º semestre de 2026" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="ciclo-inicio" rotulo="Início">
                <Input id="ciclo-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Campo>
              <Campo id="ciclo-fim" rotulo="Fim">
                <Input id="ciclo-fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
              </Campo>
            </div>
            <Campo id="ciclo-form" rotulo="Formulário">
              <Select value={formularioId} onValueChange={(v) => setFormularioId(v ?? "")}>
                <SelectTrigger id="ciclo-form" className="w-full">
                  <SelectValue>{() => (formularioEscolhido ? `${formularioEscolhido.nome} · v${formularioEscolhido.versao}` : "O ativo mais recente")}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="">O ativo mais recente</SelectItem>
                  {ativos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome} · v{f.versao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Button type="submit" variant="action" disabled={criar.isPending}>
              {criar.isPending ? "Abrindo..." : "Abrir ciclo"}
            </Button>
          </form>
        )}
      </section>

      {encerrando && (
        <Confirmacao
          titulo={`Encerrar o ciclo ${encerrando.nome}?`}
          descricao="Os feedbacks deixam de ser editados e a nota de cada funcionário é gravada no histórico, congelada com os pesos de hoje. Rascunhos não concluídos ficam de fora."
          rotuloConfirmar="Encerrar ciclo"
          pendente={encerrar.isPending}
          onConfirmar={() => confirmarEncerramento(encerrando)}
          onFechar={() => setEncerrando(null)}
        />
      )}
    </div>
  );
}

/** Configuração do desempenho: pesos e faixas, formulário de feedback e ciclos. */
export function PainelDeConfiguracao() {
  return (
    <div className="flex flex-col gap-3">
      <CabecalhoDaPagina
        eyebrow="← Desempenho"
        eyebrowHref="/rh/desempenho"
        titulo="Configuração do desempenho"
        apoio="Como a nota é calculada, o que o feedback pergunta e quando os ciclos abrem e fecham."
      />
      <Tabs defaultValue="nota">
        <TabsList className="w-full justify-start md:w-fit">
          <TabsTrigger value="nota" className="px-3">
            Nota
          </TabsTrigger>
          <TabsTrigger value="formulario" className="px-3">
            Formulário
          </TabsTrigger>
          <TabsTrigger value="ciclos" className="px-3">
            Ciclos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="nota" className="pt-3">
          <AbaNota />
        </TabsContent>
        <TabsContent value="formulario" className="pt-3">
          <AbaFormulario />
        </TabsContent>
        <TabsContent value="ciclos" className="pt-3">
          <AbaCiclos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
