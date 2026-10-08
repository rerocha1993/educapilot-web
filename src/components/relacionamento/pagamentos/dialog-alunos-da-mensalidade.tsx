"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Plus, Search, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeAlunos } from "@/components/relacionamento/pagamentos/seletor-de-alunos";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useContractSettings } from "@/lib/flow/use-contract-settings";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";
import { normalizar } from "@/lib/relacionamento/pagamentos-util";
import {
  useMensalidades,
  useRemoverAlunoDaMensalidade,
  useSalvarAlunosDaMensalidade,
  type Mensalidades,
  type SalvarAlunoDaMensalidade,
} from "@/lib/relacionamento/use-pagamentos";
import { cn } from "@/lib/utils";

/** O mês tem 28 dias no mínimo: dia de vencimento acima disso falharia em fevereiro. */
const DIA_MAXIMO = 28;

/** Uma linha da tabela, como a pessoa a vê e edita (texto nos campos, reais no valor). */
interface Linha {
  studentId: number;
  alunoNome: string;
  turma: string | null;
  nomeDoResponsavel: string | null;
  guardianId: string | null;
  valor: number | null;
  dia: string;
  inicio: string;
  fim: string;
  reajuste: string;
  asaas: boolean;
  /** Fora da mensalidade (o plano foi desativado). */
  ativo: boolean;
  /** Entrou agora e ainda não foi salva. */
  nova: boolean;
}

function linhasDe(m: Mensalidades): Linha[] {
  return m.alunos.map((a) => ({
    studentId: a.studentId,
    alunoNome: a.alunoNome,
    turma: a.turma,
    nomeDoResponsavel: a.nomeDoResponsavel,
    guardianId: a.guardianId,
    valor: a.valorMensal,
    dia: String(a.diaVencimento),
    inicio: a.dataInicio,
    fim: a.dataFim ?? "",
    reajuste: a.percentualReajuste === null ? "" : String(a.percentualReajuste),
    asaas: a.gerarCobrancaAsaas,
    ativo: a.ativo,
    nova: false,
  }));
}

function mudou(a: Linha, b: Linha | undefined): boolean {
  if (!b || a.nova) return true;
  return (
    a.valor !== b.valor ||
    a.dia !== b.dia ||
    a.inicio !== b.inicio ||
    a.fim !== b.fim ||
    a.reajuste !== b.reajuste ||
    a.asaas !== b.asaas
  );
}

function numeroDoReajuste(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? null : Number(limpo);
}

/** A frase que explica o que está errado na linha, ou nulo se está certa. */
function erroDaLinha(l: Linha): string | null {
  const dia = Number(l.dia);
  const reajuste = numeroDoReajuste(l.reajuste);
  if (l.valor === null || l.valor <= 0) return "Informe o valor.";
  if (!Number.isInteger(dia) || dia < 1 || dia > DIA_MAXIMO) return `O dia vai de 1 a ${DIA_MAXIMO}.`;
  if (!l.inicio) return "Informe quando começa.";
  if (l.fim && l.fim < l.inicio) return "O fim vem antes do início.";
  if (reajuste !== null && Number.isNaN(reajuste)) return "O reajuste precisa ser um número.";
  return null;
}

function paraSalvar(l: Linha): SalvarAlunoDaMensalidade {
  return {
    studentId: l.studentId,
    guardianId: l.guardianId,
    valorMensal: l.valor ?? 0,
    diaVencimento: Number(l.dia),
    dataInicio: l.inicio,
    dataFim: l.fim || null,
    percentualReajuste: numeroDoReajuste(l.reajuste),
    gerarCobrancaAsaas: l.asaas,
    // So linhas ativas sao salvas; mandar true garante que quem saiu e voltou seja reativado.
    ativo: true,
  };
}

const COLUNAS = "lg:grid-cols-[minmax(0,2fr)_9rem_4.5rem_9.5rem_9.5rem_5.5rem_4.5rem_2.5rem]";

/**
 * Alunos e valores da mensalidade: uma linha por aluno com valor, dia, vigência, reajuste e se gera
 * link de pagamento. Edita-se tudo e salva em lote; "Aplicar a todos" muda valor e dia da lista de
 * uma vez; "Remover" tira o aluno da mensalidade (as parcelas já geradas ficam).
 */
export function DialogAlunosDaMensalidade({ onFechar }: { onFechar: () => void }) {
  const { data, isLoading, isError, refetch } = useMensalidades();

  if (isLoading || isError || !data) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alunos e valores da mensalidade</DialogTitle>
            <DialogDescription>Valor, dia de vencimento e vigência de cada aluno.</DialogDescription>
          </DialogHeader>
          {isError ? (
            <ErroDeCarga texto="Não foi possível carregar os alunos da mensalidade." onTentar={() => refetch()} />
          ) : (
            <div className="grid gap-2" aria-busy>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onFechar}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return <Editor mensalidades={data} onFechar={onFechar} />;
}

function Editor({ mensalidades, onFechar }: { mensalidades: Mensalidades; onFechar: () => void }) {
  const salvar = useSalvarAlunosDaMensalidade();
  const remover = useRemoverAlunoDaMensalidade();
  const { data: alunosDaEscola } = useAllStudents();
  const { data: turmas } = useClasses();
  const { data: ajustes } = useContractSettings();

  const [linhas, setLinhas] = useState<Linha[]>(() => linhasDe(mensalidades));
  // Como estava salvo: é com ele que se vê o que mudou. Tirar um aluno atualiza as duas listas.
  const [base, setBase] = useState<Linha[]>(() => linhasDe(mensalidades));
  const [busca, setBusca] = useState("");
  const [mostrarQuemSaiu, setMostrarQuemSaiu] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [paraAdicionar, setParaAdicionar] = useState<number[]>([]);
  const [valorParaTodos, setValorParaTodos] = useState<number | null>(null);
  const [diaParaTodos, setDiaParaTodos] = useState("");
  const [tentou, setTentou] = useState(false);
  const [removendo, setRemovendo] = useState<Linha | null>(null);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const percentualDaEscola = ajustes?.percentualReajuste ?? null;
  const baseDoAluno = useMemo(() => new Map(base.map((l) => [l.studentId, l])), [base]);
  const alteradas = linhas.filter((l) => l.ativo && mudou(l, baseDoAluno.get(l.studentId)));
  const quemSaiu = linhas.filter((l) => !l.ativo);
  const idsNaMensalidade = useMemo(() => linhas.filter((l) => l.ativo).map((l) => l.studentId), [linhas]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return linhas
      .filter((l) => (mostrarQuemSaiu || l.ativo) && (termo === "" || normalizar(l.alunoNome).includes(termo)))
      .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome, "pt-BR"));
  }, [linhas, busca, mostrarQuemSaiu]);
  const ativasVisiveis = visiveis.filter((l) => l.ativo);

  const mudarLinha = useCallback((studentId: number, mudanca: Partial<Linha>) => {
    setLinhas((atual) => atual.map((l) => (l.studentId === studentId ? { ...l, ...mudanca } : l)));
  }, []);
  const pedirRemocao = useCallback((l: Linha) => setRemovendo(l), []);

  function adicionar() {
    if (paraAdicionar.length === 0) return;
    const nomeDaTurma = new Map<number, string>();
    for (const t of turmas ?? []) if (typeof t.id === "number") nomeDaTurma.set(t.id, t.className ?? `Turma ${t.id}`);
    const doCadastro = new Map((alunosDaEscola ?? []).map((a) => [a.id, a]));

    const novas: Linha[] = paraAdicionar.map((id) => {
      const aluno = doCadastro.get(id);
      return {
        studentId: id,
        alunoNome: aluno?.fullName ?? `Aluno ${id}`,
        turma: aluno ? (nomeDaTurma.get(aluno.classId) ?? null) : null,
        nomeDoResponsavel: null,
        guardianId: null,
        valor: mensalidades.valorMaisComum,
        dia: String(mensalidades.diaVencimentoMaisComum ?? 10),
        inicio: hojeIsoBrasilia(),
        fim: "",
        reajuste: "",
        asaas: mensalidades.gerarCobrancaAsaasPadrao,
        ativo: true,
        nova: true,
      };
    });
    // Quem tinha saído e volta substitui a linha antiga.
    setLinhas((atual) => [...atual.filter((l) => !paraAdicionar.includes(l.studentId)), ...novas]);
    toast.success(
      `${novas.length} ${novas.length === 1 ? "aluno entrou" : "alunos entraram"} na lista. Confira o valor de cada um e salve.`
    );
    setParaAdicionar([]);
    setAdicionando(false);
  }

  function aplicarATodos() {
    const dia = diaParaTodos.trim();
    if (valorParaTodos === null && dia === "") {
      toast.error("Preencha o valor, o dia, ou os dois, para aplicar.");
      return;
    }
    if (dia !== "" && (!Number.isInteger(Number(dia)) || Number(dia) < 1 || Number(dia) > DIA_MAXIMO)) {
      toast.error(`O dia do vencimento vai de 1 a ${DIA_MAXIMO}.`);
      return;
    }
    if (valorParaTodos !== null && valorParaTodos <= 0) {
      toast.error("O valor precisa ser maior que zero.");
      return;
    }
    const ids = new Set(ativasVisiveis.map((l) => l.studentId));
    setLinhas((atual) =>
      atual.map((l) =>
        ids.has(l.studentId)
          ? { ...l, ...(valorParaTodos !== null ? { valor: valorParaTodos } : {}), ...(dia !== "" ? { dia } : {}) }
          : l
      )
    );
    toast.success(`Aplicado a ${ids.size} ${ids.size === 1 ? "aluno" : "alunos"}. Falta salvar.`);
  }

  async function gravar() {
    setTentou(true);
    if (alteradas.some((l) => erroDaLinha(l))) {
      toast.error("Há alunos com dados a corrigir. Eles estão marcados em vermelho.");
      return;
    }
    try {
      await salvar.mutateAsync(alteradas.map(paraSalvar));
      toast.success(alteradas.length === 1 ? "Mensalidade salva." : `${alteradas.length} mensalidades salvas.`);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar as mensalidades.");
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return;
    try {
      await remover.mutateAsync(removendo.studentId);
      toast.success(`${removendo.alunoNome} saiu da mensalidade.`);
      // O aluno salvo passa a "fora da mensalidade", na lista e na referência do que está salvo.
      const sair = (l: Linha) => (l.studentId === removendo.studentId ? { ...l, ativo: false } : l);
      setLinhas((atual) => atual.map(sair));
      setBase((atual) => atual.map(sair));
      setRemovendo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível tirar o aluno da mensalidade.");
    }
  }

  function pedirParaFechar() {
    if (salvar.isPending) return;
    if (alteradas.length > 0) setConfirmandoSaida(true);
    else onFechar();
  }

  const nenhumAluno = linhas.filter((l) => l.ativo).length === 0;

  return (
    <>
      <Dialog open onOpenChange={(aberto) => !aberto && pedirParaFechar()}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Alunos e valores da mensalidade</DialogTitle>
            <DialogDescription>
              Cada aluno tem o seu valor e o seu dia de vencimento. Mude o que precisar e toque em &quot;Salvar&quot; no fim.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Buscar aluno pelo nome"
                  placeholder="Buscar aluno pelo nome"
                  className="pl-8"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <Button type="button" variant={adicionando ? "default" : "outline"} aria-expanded={adicionando} onClick={() => setAdicionando((v) => !v)}>
                <Plus />
                Adicionar alunos
              </Button>
            </div>

            {adicionando && (
              <div className="grid gap-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">Quem entra na mensalidade</p>
                <p className="text-xs text-muted-foreground">
                  Aparecem só os alunos que ainda não estão. Cada um entra com o valor e o dia mais comuns da escola, e você ajusta depois.
                </p>
                <SeletorDeAlunos
                  valor={paraAdicionar}
                  onChange={setParaAdicionar}
                  excluir={idsNaMensalidade}
                  rotulo="Alunos para a mensalidade"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAdicionando(false)}>
                    Fechar
                  </Button>
                  <Button type="button" variant="action" disabled={paraAdicionar.length === 0} onClick={adicionar}>
                    {paraAdicionar.length === 0
                      ? "Marque os alunos"
                      : `Adicionar ${paraAdicionar.length} ${paraAdicionar.length === 1 ? "aluno" : "alunos"}`}
                  </Button>
                </div>
              </div>
            )}

            {!nenhumAluno && (
              <div className="grid gap-2 rounded-xl bg-muted p-3">
                <p className="text-sm font-medium">Aplicar a todos</p>
                <p className="text-xs text-muted-foreground">
                  Muda o valor, o dia, ou os dois, de todos os alunos que estão na lista abaixo ({ativasVisiveis.length}). Use a busca para
                  aplicar só a alguns.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid w-40 gap-1 text-xs text-muted-foreground">
                    Valor mensal
                    <CampoDeDinheiro
                      valorEmCentavos={emCentavos(valorParaTodos)}
                      onChange={(c) => setValorParaTodos(c === null ? null : emReais(c))}
                      ariaLabel="Valor para todos os alunos da lista"
                    />
                  </label>
                  <label className="grid w-28 gap-1 text-xs text-muted-foreground">
                    Dia do vencimento
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={DIA_MAXIMO}
                      value={diaParaTodos}
                      placeholder="Ex.: 10"
                      onChange={(e) => setDiaParaTodos(e.target.value)}
                    />
                  </label>
                  <Button type="button" variant="outline" disabled={ativasVisiveis.length === 0} onClick={aplicarATodos}>
                    Aplicar a {ativasVisiveis.length} {ativasVisiveis.length === 1 ? "aluno" : "alunos"}
                  </Button>
                </div>
              </div>
            )}

            {quemSaiu.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Switch size="sm" checked={mostrarQuemSaiu} onCheckedChange={setMostrarQuemSaiu} />
                Mostrar quem já saiu da mensalidade ({quemSaiu.length})
              </label>
            )}

            {nenhumAluno && !adicionando && quemSaiu.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-dashed px-4 py-8 text-center">
                <p className="font-heading text-[15px] font-semibold">Ninguém na mensalidade ainda</p>
                <p className="mx-auto mt-1.5 max-w-[360px] text-[13px] text-muted-foreground">
                  Adicione os alunos que pagam mensalidade e defina o valor de cada um.
                </p>
                <Button type="button" variant="action" className="mt-3.5" onClick={() => setAdicionando(true)}>
                  <Plus />
                  Adicionar alunos
                </Button>
              </div>
            ) : visiveis.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-dashed px-4 py-6 text-center text-[13px] text-muted-foreground">
                {busca.trim() ? "Nenhum aluno com esse nome." : "Nenhum aluno para mostrar."}
              </p>
            ) : (
              <div>
                <div
                  aria-hidden
                  className={cn(
                    "hidden gap-2 border-b border-border px-2 pb-2 text-xs font-medium text-muted-foreground lg:grid",
                    COLUNAS
                  )}
                >
                  <span>Aluno</span>
                  <span>Valor mensal</span>
                  <span>Dia</span>
                  <span>Começa em</span>
                  <span>Termina em</span>
                  <span>Reajuste</span>
                  <span>Link</span>
                  <span />
                </div>
                <ul aria-label="Alunos da mensalidade" className="grid max-h-[50dvh] gap-2 overflow-y-auto lg:gap-0">
                  {visiveis.map((l) => (
                    <LinhaDoAluno
                      key={l.studentId}
                      linha={l}
                      alterada={l.ativo && mudou(l, baseDoAluno.get(l.studentId))}
                      erro={tentou ? erroDaLinha(l) : null}
                      percentualDaEscola={percentualDaEscola}
                      onMudar={mudarLinha}
                      onRemover={pedirRemocao}
                    />
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Reajuste: deixe vazio para valer o percentual da escola
              {percentualDaEscola !== null ? ` (${percentualDaEscola}%)` : ""}. &quot;Link&quot; liga a geração de link, Pix e boleto para
              aquele aluno; precisa do CPF do responsável.
            </p>
          </div>

          <DialogFooter className="items-center">
            <span aria-live="polite" className="mr-auto text-xs text-muted-foreground">
              {alteradas.length === 0
                ? "Nada para salvar."
                : `${alteradas.length} ${alteradas.length === 1 ? "aluno alterado" : "alunos alterados"}.`}
            </span>
            <Button variant="outline" disabled={salvar.isPending} onClick={pedirParaFechar}>
              {alteradas.length === 0 ? "Fechar" : "Cancelar"}
            </Button>
            <Button variant="action" disabled={salvar.isPending || alteradas.length === 0} onClick={gravar}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {removendo && (
        <Confirmacao
          titulo={`Tirar ${removendo.alunoNome} da mensalidade?`}
          descricao={
            removendo.nova
              ? "O aluno ainda não foi salvo; ele só sai da lista."
              : "As parcelas que já foram geradas continuam valendo e precisam ser pagas ou canceladas à parte. A partir de agora, este aluno deixa de receber as próximas parcelas."
          }
          rotuloConfirmar="Tirar da mensalidade"
          perigosa
          pendente={remover.isPending}
          onConfirmar={() => {
            if (removendo.nova) {
              setLinhas((atual) => atual.filter((l) => l.studentId !== removendo.studentId));
              setRemovendo(null);
            } else {
              void confirmarRemocao();
            }
          }}
          onFechar={() => setRemovendo(null)}
        />
      )}

      {confirmandoSaida && (
        <Confirmacao
          titulo="Sair sem salvar?"
          descricao="Você mudou dados de alunos e ainda não salvou. Se sair agora, essas mudanças se perdem."
          rotuloConfirmar="Sair sem salvar"
          perigosa
          pendente={false}
          onConfirmar={onFechar}
          onFechar={() => setConfirmandoSaida(false)}
        />
      )}
    </>
  );
}

const LinhaDoAluno = memo(function LinhaDoAluno({
  linha: l,
  alterada,
  erro,
  percentualDaEscola,
  onMudar,
  onRemover,
}: {
  linha: Linha;
  alterada: boolean;
  erro: string | null;
  percentualDaEscola: number | null;
  onMudar: (studentId: number, mudanca: Partial<Linha>) => void;
  onRemover: (l: Linha) => void;
}) {
  const prefixo = `m-${l.studentId}`;
  const travada = !l.ativo;

  return (
    <li
      className={cn(
        "grid gap-2 rounded-lg border border-border p-3 lg:items-center lg:rounded-none lg:border-0 lg:border-b lg:px-2 lg:py-2",
        COLUNAS,
        erro && "border-destructive bg-destructive-soft/40",
        travada && "opacity-60"
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium break-words">
          {l.alunoNome}
          {l.nova && <Badge variant="pending">Novo</Badge>}
          {travada && <Badge variant="secondary">Fora da mensalidade</Badge>}
          {alterada && !l.nova && <Badge variant="waiting">Alterado</Badge>}
        </p>
        <p className="text-xs break-words text-muted-foreground">
          {[l.turma, l.nova ? "Responsável financeiro do cadastro" : l.nomeDoResponsavel].filter(Boolean).join(" · ") ||
            "Sem responsável financeiro"}
        </p>
        {erro && (
          <p role="alert" className="mt-0.5 text-xs text-destructive">
            {erro}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:contents">
        <label className="grid gap-1 text-xs text-muted-foreground lg:gap-0">
          <span className="lg:sr-only">Valor mensal</span>
          <CampoDeDinheiro
            id={`${prefixo}-valor`}
            ariaLabel={`Valor mensal de ${l.alunoNome}`}
            valorEmCentavos={emCentavos(l.valor)}
            disabled={travada}
            onChange={(c) => onMudar(l.studentId, { valor: c === null ? null : emReais(c) })}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground lg:gap-0">
          <span className="lg:sr-only">Dia do vencimento</span>
          <Input
            id={`${prefixo}-dia`}
            type="number"
            inputMode="numeric"
            min={1}
            max={DIA_MAXIMO}
            aria-label={`Dia do vencimento de ${l.alunoNome}`}
            value={l.dia}
            disabled={travada}
            onChange={(e) => onMudar(l.studentId, { dia: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground lg:gap-0">
          <span className="lg:sr-only">Começa em</span>
          <Input
            id={`${prefixo}-inicio`}
            type="date"
            aria-label={`Começa em, ${l.alunoNome}`}
            value={l.inicio}
            disabled={travada}
            onChange={(e) => onMudar(l.studentId, { inicio: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground lg:gap-0">
          <span className="lg:sr-only">Termina em (opcional)</span>
          <Input
            id={`${prefixo}-fim`}
            type="date"
            aria-label={`Termina em, ${l.alunoNome}`}
            value={l.fim}
            min={l.inicio || undefined}
            disabled={travada}
            onChange={(e) => onMudar(l.studentId, { fim: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground lg:gap-0">
          <span className="lg:sr-only">Reajuste (%)</span>
          <Input
            id={`${prefixo}-reajuste`}
            type="number"
            step="0.01"
            inputMode="decimal"
            aria-label={`Reajuste em porcentagem, ${l.alunoNome}`}
            placeholder={percentualDaEscola === null ? "%" : `${percentualDaEscola}%`}
            className="text-right font-mono tabular-nums"
            value={l.reajuste}
            disabled={travada}
            onChange={(e) => onMudar(l.studentId, { reajuste: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground max-lg:min-h-10">
          <Switch
            size="sm"
            checked={l.asaas}
            disabled={travada}
            aria-label={`Gerar link, Pix e boleto para ${l.alunoNome}`}
            onCheckedChange={(v) => onMudar(l.studentId, { asaas: v })}
          />
          <span className="lg:sr-only">Gerar link, Pix e boleto</span>
        </label>
      </div>

      <div className="flex justify-end">
        {l.ativo && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Tirar ${l.alunoNome} da mensalidade`}
            title="Tirar da mensalidade"
            onClick={() => onRemover(l)}
          >
            <UserMinus className="text-destructive" />
          </Button>
        )}
      </div>
    </li>
  );
});
