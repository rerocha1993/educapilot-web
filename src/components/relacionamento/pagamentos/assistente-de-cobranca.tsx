"use client";

import { useMemo, useState } from "react";
import { CalendarSync, Check, Zap } from "lucide-react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { BarraDeProgresso } from "@/components/finance/projetos/comum";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
import { ItemDoResultado } from "@/components/relacionamento/pagamentos/aba-planos";
import { ResultadoDaMensalidade } from "@/components/relacionamento/pagamentos/cartao-da-mensalidade";
import { SeletorDeAlunos } from "@/components/relacionamento/pagamentos/seletor-de-alunos";
import { LinkParaContas, SeletorDeCarteira } from "@/components/relacionamento/pagamentos/seletor-de-carteira";
import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";
import { fimDoMes, inicioDoMes, maisDias, nomeDoMes, soNomeDoMes } from "@/lib/relacionamento/pagamentos-util";
import {
  useContasParaCobranca,
  useCriarPlano,
  useGerarCobrancasAvulsas,
  useGerarCobrancasDoPlano,
  useGerarMensalidades,
  useMensalidades,
  usePublicoPrevistoDaEscola,
  useSalvarAlunosDaMensalidade,
  type Plano,
  type ResultadoDaGeracao,
  type ResultadoDaGeracaoMensal,
  type ResponsavelPrevisto,
} from "@/lib/relacionamento/use-pagamentos";
import { formatarMoeda } from "@/lib/rh/formatar";
import { cn } from "@/lib/utils";

/** O mês tem 28 dias no mínimo: dia de vencimento acima disso falharia em fevereiro. */
const DIA_MAXIMO = 28;

type Frequencia = "uma-vez" | "todo-mes";
type TipoDePlano = "mensalidade" | "outro";
type Publico = "escola" | "turmas" | "alunos" | "responsaveis";

const PASSOS = ["Como cobrar", "O quê e quanto", "Para quem", "Onde o dinheiro cai", "Conferir"] as const;
const ULTIMO_PASSO = PASSOS.length - 1;

const PUBLICOS: readonly { id: Publico; rotulo: string; ajuda: string }[] = [
  { id: "escola", rotulo: "Escola toda", ajuda: "Todas as famílias" },
  { id: "turmas", rotulo: "Turmas", ajuda: "Escolha as turmas" },
  { id: "alunos", rotulo: "Alunos", ajuda: "Escolha os alunos" },
  { id: "responsaveis", rotulo: "Responsáveis", ajuda: "Escolha as pessoas" },
];

/** Tudo que a pessoa preenche no assistente. */
interface Dados {
  frequencia: Frequencia | null;
  tipoDePlano: TipoDePlano | null;
  /** Nome do plano (Outro plano). */
  nome: string;
  /** Descrição da cobrança única; no plano, a descrição opcional. */
  descricao: string;
  valor: number | null;
  /** Vencimento da cobrança única (yyyy-MM-dd). */
  vencimento: string;
  /** Dia do mês do vencimento, nas cobranças que se repetem. */
  dia: string;
  /** Mês em que começa (yyyy-MM). */
  inicioMes: string;
  /** Mês em que termina, opcional (yyyy-MM). */
  fimMes: string;
  publico: Publico;
  turmas: number[];
  alunosAvulsa: number[];
  escolhidos: string[];
  somenteFinanceiro: boolean;
  /** Alunos da mensalidade ou do plano. Nulo = o padrão (na mensalidade, todos que ainda não têm). */
  alunosRecorrente: number[] | null;
  carteira: string | null;
  /** Gerar link, Pix e boleto. Nulo = o padrão de cada caso. */
  gerarAsaas: boolean | null;
}

type Resultado =
  | { tipo: "avulsa"; resposta: ResultadoDaGeracao; jaExistiam: number }
  | { tipo: "mensalidade"; quantidade: number; proximaCompetencia: string }
  | { tipo: "plano"; plano: Plano; quantidade: number };

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** "A, B e C". */
function emFrase(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function quantasFamilias(n: number): string {
  return `${n} ${n === 1 ? "família" : "famílias"}`;
}

function quantosAlunos(n: number): string {
  return `${n} ${n === 1 ? "aluno" : "alunos"}`;
}

/**
 * Nova cobrança, passo a passo: como cobrar, o quê e quanto, para quem, onde o dinheiro cai e a
 * conferência. Cobre as quatro coisas que a escola cobra: uma vez só (festa, uniforme, taxa), a
 * mensalidade, um outro plano mensal (integral, transporte). No fim mostra o que saiu e, nas que
 * se repetem, oferece gerar as parcelas do mês.
 */
export function AssistenteDeCobranca({
  onFechar,
  onVerNaLista,
}: {
  onFechar: () => void;
  /** Fecha o assistente e leva a pessoa para a lista onde a cobrança nova aparece. */
  onVerNaLista: (destino: "individual" | "recorrente") => void;
}) {
  const hoje = hojeIsoBrasilia();
  const mesAtual = hoje.slice(0, 7);

  const gerarAvulsas = useGerarCobrancasAvulsas();
  const salvarMensalidade = useSalvarAlunosDaMensalidade();
  const criarPlano = useCriarPlano();
  const contas = useContasParaCobranca();
  const mensalidade = useMensalidades();
  const { data: todosOsAlunos } = useAllStudents();
  const { data: turmasDaEscola } = useClasses();

  const [passo, setPasso] = useState(0);
  const [tentou, setTentou] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [busca, setBusca] = useState("");
  const [d, setD] = useState<Dados>(() => ({
    frequencia: null,
    tipoDePlano: null,
    nome: "",
    descricao: "",
    valor: null,
    vencimento: maisDias(hoje, 7),
    dia: "10",
    inicioMes: mesAtual,
    fimMes: "",
    publico: "escola",
    turmas: [],
    alunosAvulsa: [],
    escolhidos: [],
    somenteFinanceiro: true,
    alunosRecorrente: null,
    carteira: null,
    gerarAsaas: null,
  }));
  const mudar = (parte: Partial<Dados>) => setD((atual) => ({ ...atual, ...parte }));

  const avulsa = d.frequencia === "uma-vez";
  const ehMensalidade = d.frequencia === "todo-mes" && d.tipoDePlano === "mensalidade";
  const ehOutro = d.frequencia === "todo-mes" && d.tipoDePlano === "outro";
  const ocupado = gerarAvulsas.isPending || salvarMensalidade.isPending || criarPlano.isPending;

  // ---------------------------------------------------------------- quem recebe

  // Cobrança única: a prévia dos responsáveis vem do servidor, a partir do passo "Para quem".
  // "Turmas" sem turma e "Alunos" sem aluno não têm público (e a consulta esperaria; vazio vale a escola toda).
  const publicoDefinido =
    d.publico === "escola" ||
    d.publico === "responsaveis" ||
    (d.publico === "turmas" && d.turmas.length > 0) ||
    (d.publico === "alunos" && d.alunosAvulsa.length > 0);
  const consultaLiberada = avulsa && !resultado && passo >= 2 && publicoDefinido;
  const previa = usePublicoPrevistoDaEscola(
    d.publico === "turmas" ? d.turmas : [],
    d.publico === "alunos" ? d.alunosAvulsa : [],
    consultaLiberada
  );
  const previsto: ResponsavelPrevisto[] = consultaLiberada ? (previa.data ?? []) : [];
  const disponiveis = previsto.filter((r) => !r.jaCobrado);
  const jaCobrados = previsto.length - disponiveis.length;
  const escolhidosValidos = d.escolhidos.filter((g) => disponiveis.some((r) => r.guardianId === g));
  const familias = d.publico === "responsaveis" ? escolhidosValidos.length : disponiveis.length;

  // Mensalidade e planos: alunos. Na mensalidade, o padrão é todo aluno que ainda não paga.
  const idsNaMensalidade = useMemo(
    () => (mensalidade.data?.alunos ?? []).filter((a) => a.ativo).map((a) => a.studentId),
    [mensalidade.data]
  );
  const semMensalidade = useMemo(
    () => (todosOsAlunos ?? []).filter((a) => !idsNaMensalidade.includes(a.id)).map((a) => a.id),
    [todosOsAlunos, idsNaMensalidade]
  );
  const alunosDaRecorrencia = d.alunosRecorrente ?? (ehMensalidade ? semMensalidade : []);

  // ---------------------------------------------------------------- carteira

  const semContas = contas.isSuccess && contas.data.length === 0;
  const contaEscolhida = (contas.data ?? []).find((c) => c.contaId === d.carteira);
  // A mensalidade cai na conta padrão das mensalidades, que a escola define em Financeiro › Contas.
  const contaDaMensalidade = (contas.data ?? []).find((c) => c.contaId === mensalidade.data?.contaFinanceiraId);
  const nomeDaCarteira = ehMensalidade ? (mensalidade.data?.contaNome ?? null) : (contaEscolhida?.nome ?? null);
  const provedorDaCarteira = ehMensalidade ? contaDaMensalidade?.provedor : contaEscolhida?.provedor;
  const semCarteira = ehMensalidade ? !mensalidade.data?.contaNome : semContas;
  const carteiraManual = provedorDaCarteira === "manual";
  const podeGerarLink = !semCarteira && !carteiraManual;
  const gerarMarcado = d.gerarAsaas ?? (ehMensalidade ? (mensalidade.data?.gerarCobrancaAsaasPadrao ?? true) : true);
  const gerarNoAsaas = gerarMarcado && podeGerarLink;

  // ---------------------------------------------------------------- validação

  /** A frase que diz o que falta no passo, ou nulo se está pronto para seguir. */
  function validar(p: number): string | null {
    if (p === 0) {
      if (!d.frequencia) return "Escolha como vai cobrar: uma vez só ou todo mês.";
      if (d.frequencia === "todo-mes" && !d.tipoDePlano) return "Escolha entre a mensalidade e outro plano.";
      return null;
    }
    if (p === 1) {
      if (avulsa && !d.descricao.trim()) return "Diga o que está sendo cobrado.";
      if (ehOutro && !d.nome.trim()) return "Dê um nome ao plano.";
      if (d.valor === null || d.valor <= 0) return avulsa ? "Informe o valor da cobrança." : "Informe o valor mensal.";
      if (avulsa) return d.vencimento ? null : "Informe o vencimento.";
      const dia = Number(d.dia);
      if (!Number.isInteger(dia) || dia < 1 || dia > DIA_MAXIMO) return `O dia do vencimento vai de 1 a ${DIA_MAXIMO}.`;
      if (!d.inicioMes) return "Informe em que mês a cobrança começa.";
      if (d.fimMes && d.fimMes < d.inicioMes) return "O mês final não pode vir antes do mês inicial.";
      return null;
    }
    if (p === 2) {
      if (avulsa) {
        if (d.publico === "turmas" && d.turmas.length === 0) return "Marque ao menos uma turma, ou escolha \"Escola toda\".";
        if (d.publico === "alunos" && d.alunosAvulsa.length === 0) return "Marque os alunos que vão ser cobrados.";
        if (d.publico === "responsaveis" && d.escolhidos.length === 0) return "Marque quem vai ser cobrado.";
        if (previa.isLoading) return "Aguarde: ainda estou montando a lista de famílias.";
        if (previa.isError) return "Não foi possível montar a lista de famílias. Tente de novo.";
        if (familias === 0) return "Não há famílias a cobrar neste público.";
      }
      if (ehMensalidade && alunosDaRecorrencia.length === 0) return "Marque ao menos um aluno para a mensalidade.";
      return null;
    }
    if (p === 3) {
      if (ehMensalidade) return null;
      if (contas.isLoading) return "Aguarde: as contas ainda estão carregando.";
      if (contas.isError) return "Não foi possível carregar as contas. Tente de novo.";
      if (!semContas && !d.carteira) return "Escolha em qual conta o dinheiro cai.";
      return null;
    }
    return null;
  }

  const erroAtual = tentou ? validar(passo) : null;

  function continuar() {
    if (validar(passo)) {
      setTentou(true);
      return;
    }
    setTentou(false);
    setPasso(passo + 1);
  }

  function voltar() {
    setTentou(false);
    setPasso(passo - 1);
  }

  function pedirParaFechar() {
    if (ocupado) return;
    if (!resultado && d.frequencia !== null) setConfirmandoSaida(true);
    else onFechar();
  }

  // ---------------------------------------------------------------- criar

  async function criar() {
    for (let p = 0; p <= 3; p++) {
      if (validar(p)) {
        setPasso(p);
        setTentou(true);
        return;
      }
    }
    const valor = d.valor ?? 0;

    try {
      if (avulsa) {
        const resposta = await gerarAvulsas.mutateAsync({
          descricao: d.descricao.trim(),
          valor,
          vencimento: d.vencimento,
          classIds: d.publico === "turmas" ? d.turmas : undefined,
          studentIds: d.publico === "alunos" ? d.alunosAvulsa : undefined,
          guardianIds: d.publico === "responsaveis" ? escolhidosValidos : undefined,
          somenteResponsavelFinanceiro: d.somenteFinanceiro,
          gerarAsaas: gerarNoAsaas,
          contaFinanceiraId: d.carteira,
        });
        setResultado({ tipo: "avulsa", resposta, jaExistiam: jaCobrados });
      } else if (ehMensalidade) {
        const salva = await salvarMensalidade.mutateAsync(
          alunosDaRecorrencia.map((studentId) => ({
            studentId,
            valorMensal: valor,
            diaVencimento: Number(d.dia),
            dataInicio: inicioDoMes(d.inicioMes),
            dataFim: d.fimMes ? fimDoMes(d.fimMes) : null,
            gerarCobrancaAsaas: gerarNoAsaas,
          }))
        );
        setResultado({
          tipo: "mensalidade",
          quantidade: alunosDaRecorrencia.length,
          proximaCompetencia: salva.proximaCompetencia > d.inicioMes ? salva.proximaCompetencia : d.inicioMes,
        });
      } else {
        const plano = await criarPlano.mutateAsync({
          nome: d.nome.trim(),
          descricao: d.descricao.trim() || undefined,
          valor,
          diaVencimento: Number(d.dia),
          inicio: inicioDoMes(d.inicioMes),
          fim: d.fimMes ? fimDoMes(d.fimMes) : undefined,
          gerarCobrancaAsaas: gerarNoAsaas,
          contaFinanceiraId: d.carteira,
          studentIds: alunosDaRecorrencia,
        });
        setResultado({ tipo: "plano", plano, quantidade: alunosDaRecorrencia.length });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a cobrança.");
    }
  }

  // ---------------------------------------------------------------- tela do resultado

  if (resultado) {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <TelaDoResultado resultado={resultado} onFechar={onFechar} onVerNaLista={onVerNaLista} mesAtual={mesAtual} />
        </DialogContent>
      </Dialog>
    );
  }

  // ---------------------------------------------------------------- conferência (frases)

  const nomesDasTurmas = d.turmas.map(
    (id) => (turmasDaEscola ?? []).find((t) => t.id === id)?.className ?? `Turma ${id}`
  );
  const total = avulsa ? familias * (d.valor ?? 0) : null;

  function frasesDoResumo(): string[] {
    const valor = formatarMoeda(d.valor ?? 0);
    const carteira = nomeDaCarteira
      ? `na carteira ${nomeDaCarteira} (${carteiraManual ? "manual" : "Asaas"})`
      : "sem carteira";
    const vigencia = d.fimMes
      ? `de ${nomeDoMes(d.inicioMes)} até ${nomeDoMes(d.fimMes)}`
      : `a partir de ${nomeDoMes(d.inicioMes)}`;

    if (avulsa) {
      const quem =
        d.publico === "escola"
          ? `${quantasFamilias(familias)} da escola toda`
          : d.publico === "turmas"
            ? `${quantasFamilias(familias)} ${d.turmas.length === 1 ? "da turma" : "das turmas"} ${emFrase(nomesDasTurmas)}`
            : d.publico === "alunos"
              ? `${quantasFamilias(familias)} de ${quantosAlunos(d.alunosAvulsa.length)} escolhidos`
              : `${familias === 1 ? "1 responsável escolhido" : `${familias} responsáveis escolhidos`}`;
      return [
        `Cobrar ${valor} de ${quem}, vencendo em ${formatarSoData(d.vencimento)}, ${carteira}.`,
        `"${d.descricao.trim()}". Total a receber: ${formatarMoeda(total ?? 0)}.`,
      ];
    }
    if (ehMensalidade) {
      return [
        `Colocar ${quantosAlunos(alunosDaRecorrencia.length)} na mensalidade de ${valor}, vencendo todo dia ${d.dia}, ${vigencia}, ${carteira}.`,
        "Depois de salvar, você escolhe se quer gerar as parcelas de um mês agora.",
      ];
    }
    return [
      `Criar o plano "${d.nome.trim()}": ${valor} por mês para ${quantosAlunos(alunosDaRecorrencia.length)}, vencendo todo dia ${d.dia}, ${vigencia}, ${carteira}.`,
      alunosDaRecorrencia.length === 0
        ? "O plano fica sem alunos por enquanto; dá para escolher quem entra depois, no cartão do plano."
        : "Depois de criar, você escolhe se quer gerar as parcelas de um mês agora.",
    ];
  }

  const textoDoProvedor = gerarNoAsaas
    ? "Link, Pix e boleto serão gerados automaticamente."
    : semCarteira
      ? "Sem carteira: a família vai ver \"pague na secretaria\" e vocês marcam como paga."
      : carteiraManual
        ? "Recebimento manual: a família vai ver \"pague na secretaria\" e vocês marcam como paga."
        : "Sem link automático: a família vai ver \"pague na secretaria\" e vocês marcam como paga.";

  return (
    <>
      <Dialog open onOpenChange={(aberto) => !aberto && pedirParaFechar()}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova cobrança</DialogTitle>
            <DialogDescription>
              Passo {passo + 1} de {PASSOS.length}: {PASSOS[passo]}
            </DialogDescription>
          </DialogHeader>

          <BarraDeProgresso valor={passo + 1} total={PASSOS.length} rotulo="Passos da nova cobrança" inverso />

          <div className="grid gap-3.5" aria-live="polite">
            {passo === 0 && <PassoComoCobrar d={d} mudar={mudar} />}

            {passo === 1 && (
              <PassoOQueEQuanto
                d={d}
                mudar={mudar}
                avulsa={avulsa}
                ehOutro={ehOutro}
                ehMensalidade={ehMensalidade}
                valorMaisComum={mensalidade.data?.valorMaisComum ?? null}
                diaMaisComum={mensalidade.data?.diaVencimentoMaisComum ?? null}
                hoje={hoje}
              />
            )}

            {passo === 2 && avulsa && (
              <PassoParaQuemAvulsa
                d={d}
                mudar={mudar}
                busca={busca}
                setBusca={setBusca}
                carregando={consultaLiberada && previa.isLoading}
                erroDaPrevia={consultaLiberada && previa.isError}
                publicoDefinido={publicoDefinido}
                previsto={previsto}
                disponiveis={disponiveis}
                jaCobrados={jaCobrados}
                familias={familias}
              />
            )}

            {passo === 2 && !avulsa && (
              <PassoParaQuemRecorrente
                ehMensalidade={ehMensalidade}
                valor={alunosDaRecorrencia}
                onChange={(ids) => mudar({ alunosRecorrente: ids })}
                excluir={ehMensalidade ? idsNaMensalidade : undefined}
                carregando={ehMensalidade && (mensalidade.isLoading || !todosOsAlunos)}
                erro={ehMensalidade && mensalidade.isError}
                totalSemMensalidade={semMensalidade.length}
              />
            )}

            {passo === 3 && (
              <PassoOndeCai
                d={d}
                mudar={mudar}
                ehMensalidade={ehMensalidade}
                semContas={semContas}
                nomeDaMensalidade={mensalidade.data?.contaNome ?? null}
                carregandoMensalidade={mensalidade.isLoading}
                conta={contaEscolhida}
                carteiraManual={carteiraManual}
                podeGerarLink={podeGerarLink}
                gerarMarcado={gerarMarcado}
                desabilitado={ocupado}
              />
            )}

            {passo === ULTIMO_PASSO && (
              <div className="grid gap-3">
                <div className="grid gap-2 rounded-xl border border-border bg-muted/50 p-3.5">
                  {frasesDoResumo().map((f) => (
                    <p key={f} className="text-sm leading-relaxed break-words">
                      {f}
                    </p>
                  ))}
                  <p className="text-[13px] text-muted-foreground">{textoDoProvedor}</p>
                </div>
                {avulsa && jaCobrados > 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    {jaCobrados === 1 ? "1 família já foi cobrada" : `${jaCobrados} famílias já foram cobradas`} e não recebe outra.
                  </p>
                )}
                <p className="text-[13px] text-muted-foreground">
                  Tudo aparece também no portal dos pais. Dá para cancelar cobranças depois, uma a uma.
                </p>
              </div>
            )}

            {erroAtual && (
              <p role="alert" className="text-sm text-destructive">
                {erroAtual}
              </p>
            )}
          </div>

          <DialogFooter>
            {passo > 0 ? (
              <Button type="button" variant="outline" disabled={ocupado} onClick={voltar}>
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={ocupado} onClick={pedirParaFechar}>
                Cancelar
              </Button>
            )}
            {passo < ULTIMO_PASSO ? (
              <Button type="button" variant="action" onClick={continuar}>
                Continuar
              </Button>
            ) : (
              <Button type="button" variant="action" disabled={ocupado} onClick={criar}>
                {ocupado
                  ? "Criando..."
                  : avulsa
                    ? "Criar cobranças"
                    : ehMensalidade
                      ? "Salvar mensalidade"
                      : "Criar plano"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmandoSaida && (
        <Confirmacao
          titulo="Sair sem criar a cobrança?"
          descricao="O que você preencheu até aqui se perde."
          rotuloConfirmar="Sair sem criar"
          perigosa
          pendente={false}
          onConfirmar={onFechar}
          onFechar={() => setConfirmandoSaida(false)}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------ passo 1: como cobrar

function CartaoDeEscolha({
  titulo,
  texto,
  selecionado,
  onClick,
  pequeno = false,
}: {
  titulo: string;
  texto: string;
  selecionado: boolean;
  onClick: () => void;
  pequeno?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pequeno ? "min-h-16" : "min-h-24",
        selecionado ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
          selecionado ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        {selecionado && <Check className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block font-heading font-semibold", pequeno ? "text-sm" : "text-base")}>{titulo}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{texto}</span>
      </span>
    </button>
  );
}

function PassoComoCobrar({ d, mudar }: { d: Dados; mudar: (p: Partial<Dados>) => void }) {
  return (
    <div className="grid gap-3">
      <h3 className="font-heading text-[15px] font-semibold">Como você quer cobrar?</h3>
      <div className="grid gap-2.5">
        <CartaoDeEscolha
          titulo="Uma vez só"
          texto="Festa, uniforme, taxa, passeio."
          selecionado={d.frequencia === "uma-vez"}
          onClick={() => mudar({ frequencia: "uma-vez" })}
        />
        <CartaoDeEscolha
          titulo="Todo mês"
          texto="Mensalidade, material, transporte."
          selecionado={d.frequencia === "todo-mes"}
          onClick={() => mudar({ frequencia: "todo-mes" })}
        />
      </div>

      {d.frequencia === "todo-mes" && (
        <div className="grid gap-2.5 rounded-xl border border-border p-3">
          <h4 className="text-sm font-medium">O que se cobra todo mês?</h4>
          <CartaoDeEscolha
            pequeno
            titulo="Mensalidade"
            texto="O valor da escola, com um valor e um dia para cada aluno."
            selecionado={d.tipoDePlano === "mensalidade"}
            onClick={() => mudar({ tipoDePlano: "mensalidade" })}
          />
          <CartaoDeEscolha
            pequeno
            titulo="Outro plano"
            texto="Período integral, transporte, aula extra: um nome e os alunos que pagam."
            selecionado={d.tipoDePlano === "outro"}
            onClick={() => mudar({ tipoDePlano: "outro" })}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ passo 2: o quê e quanto

function PassoOQueEQuanto({
  d,
  mudar,
  avulsa,
  ehOutro,
  ehMensalidade,
  valorMaisComum,
  diaMaisComum,
  hoje,
}: {
  d: Dados;
  mudar: (p: Partial<Dados>) => void;
  avulsa: boolean;
  ehOutro: boolean;
  ehMensalidade: boolean;
  valorMaisComum: number | null;
  diaMaisComum: number | null;
  hoje: string;
}) {
  return (
    <div className="grid gap-3.5">
      <h3 className="font-heading text-[15px] font-semibold">O quê e quanto?</h3>

      {avulsa && (
        <Campo id="ass-descricao" rotulo="O que está sendo cobrado">
          <Input
            id="ass-descricao"
            value={d.descricao}
            maxLength={120}
            placeholder="Ex.: Passeio ao zoológico"
            onChange={(e) => mudar({ descricao: e.target.value })}
          />
        </Campo>
      )}

      {ehOutro && (
        <>
          <Campo id="ass-nome" rotulo="Nome do plano">
            <Input
              id="ass-nome"
              value={d.nome}
              maxLength={80}
              placeholder="Ex.: Período integral"
              onChange={(e) => mudar({ nome: e.target.value })}
            />
          </Campo>
          <Campo id="ass-descricao-plano" rotulo="Descrição (opcional)" dica="Aparece na cobrança que a família recebe.">
            <Input
              id="ass-descricao-plano"
              value={d.descricao}
              maxLength={300}
              onChange={(e) => mudar({ descricao: e.target.value })}
            />
          </Campo>
        </>
      )}

      <Campo
        id="ass-valor"
        rotulo={avulsa ? "Valor por família" : ehMensalidade ? "Valor mensal padrão" : "Valor mensal por aluno"}
        dica={
          avulsa
            ? undefined
            : ehMensalidade
              ? `Dá para ajustar aluno por aluno depois, em "Alunos e valores".${valorMaisComum ? ` Hoje o valor mais comum é ${formatarMoeda(valorMaisComum)}.` : ""}`
              : "Dá para ajustar o plano depois."
        }
      >
        <CampoDeDinheiro
          id="ass-valor"
          valorEmCentavos={emCentavos(d.valor)}
          onChange={(c) => mudar({ valor: c === null ? null : emReais(c) })}
        />
      </Campo>

      {avulsa ? (
        <Campo id="ass-vencimento" rotulo="Vencimento">
          <Input
            id="ass-vencimento"
            type="date"
            value={d.vencimento}
            min={hoje}
            onChange={(e) => mudar({ vencimento: e.target.value })}
          />
        </Campo>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Campo
            id="ass-dia"
            rotulo="Dia do vencimento"
            dica={`De 1 a ${DIA_MAXIMO}, todo mês.${ehMensalidade && diaMaisComum ? ` Hoje o mais comum é o dia ${diaMaisComum}.` : ""}`}
          >
            <Input
              id="ass-dia"
              type="number"
              inputMode="numeric"
              min={1}
              max={DIA_MAXIMO}
              value={d.dia}
              onChange={(e) => mudar({ dia: e.target.value })}
            />
          </Campo>
          <Campo id="ass-inicio" rotulo="Começa em">
            <Input id="ass-inicio" type="month" value={d.inicioMes} onChange={(e) => mudar({ inicioMes: e.target.value })} />
          </Campo>
          <Campo id="ass-fim" rotulo="Termina em (opcional)" dica="Deixe vazio se não tem data para acabar.">
            <Input
              id="ass-fim"
              type="month"
              value={d.fimMes}
              min={d.inicioMes || undefined}
              onChange={(e) => mudar({ fimMes: e.target.value })}
            />
          </Campo>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ passo 3: para quem

function PassoParaQuemAvulsa({
  d,
  mudar,
  busca,
  setBusca,
  carregando,
  erroDaPrevia,
  publicoDefinido,
  previsto,
  disponiveis,
  jaCobrados,
  familias,
}: {
  d: Dados;
  mudar: (p: Partial<Dados>) => void;
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
  erroDaPrevia: boolean;
  publicoDefinido: boolean;
  previsto: ResponsavelPrevisto[];
  disponiveis: ResponsavelPrevisto[];
  jaCobrados: number;
  familias: number;
}) {
  const visiveis = previsto.filter((r) => !busca.trim() || normalizar(r.nome).includes(normalizar(busca)));

  function alternar(r: ResponsavelPrevisto, marcado: boolean) {
    mudar({
      escolhidos: marcado ? [...d.escolhidos.filter((g) => g !== r.guardianId), r.guardianId] : d.escolhidos.filter((g) => g !== r.guardianId),
    });
  }

  return (
    <div className="grid gap-3.5">
      <h3 className="font-heading text-[15px] font-semibold">Quem vai receber a cobrança?</h3>

      <div role="group" aria-label="Quem recebe" className="grid grid-cols-2 gap-2">
        {PUBLICOS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={d.publico === p.id}
            onClick={() => mudar({ publico: p.id })}
            className={cn(
              "min-h-14 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              d.publico === p.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
            )}
          >
            <span className="block text-sm font-semibold">{p.rotulo}</span>
            <span className="block text-xs text-muted-foreground">{p.ajuda}</span>
          </button>
        ))}
      </div>

      {d.publico === "turmas" && (
        <SeletorDeTurmas
          valor={d.turmas}
          onChange={(turmas) => mudar({ turmas })}
          textoVazio="Marque as turmas que vão ser cobradas."
        />
      )}
      {d.publico === "alunos" && <SeletorDeAlunos valor={d.alunosAvulsa} onChange={(alunosAvulsa) => mudar({ alunosAvulsa })} />}

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <Checkbox
          checked={d.somenteFinanceiro}
          onCheckedChange={(v) => mudar({ somenteFinanceiro: v === true })}
          className="mt-0.5"
        />
        <span>
          Só o responsável financeiro
          <span className="block text-[13px] text-muted-foreground">
            Uma cobrança por aluno, para quem paga as mensalidades. Desmarcado, todos os responsáveis recebem.
          </span>
        </span>
      </label>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm leading-none font-medium">Prévia</span>
          {publicoDefinido && !carregando && !erroDaPrevia && (
            <span className="text-xs text-muted-foreground">
              {familias === 0 && d.publico === "responsaveis"
                ? "Ninguém marcado ainda"
                : `Vai cobrar ${quantasFamilias(familias)}`}
              {jaCobrados > 0 ? ` · ${jaCobrados} já cobrada${jaCobrados === 1 ? "" : "s"}` : ""}
            </span>
          )}
        </div>

        {d.publico === "responsaveis" && previsto.length > 6 && (
          <Input
            aria-label="Buscar responsável"
            placeholder="Buscar responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        )}

        {!publicoDefinido ? (
          <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
            {d.publico === "turmas" ? "Marque as turmas para ver quem recebe." : "Marque os alunos para ver quem recebe."}
          </p>
        ) : carregando ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : erroDaPrevia ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível montar a lista de famílias. Volte um passo e tente de novo.
          </p>
        ) : previsto.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
            Nenhuma família encontrada para este público.
          </p>
        ) : (
          <>
            {d.publico === "responsaveis" && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => mudar({ escolhidos: disponiveis.map((r) => r.guardianId) })}
                >
                  Marcar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => mudar({ escolhidos: [] })}>
                  Limpar
                </Button>
              </div>
            )}
            <ul aria-label="Famílias do público" className="grid max-h-56 gap-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
              {visiveis.map((r) => (
                <li key={r.guardianId}>
                  <label
                    className={cn(
                      "flex min-h-9 items-start gap-2.5 rounded-md px-1.5 py-1.5 text-sm",
                      r.jaCobrado ? "cursor-not-allowed opacity-55" : d.publico === "responsaveis" && "cursor-pointer hover:bg-muted"
                    )}
                  >
                    {d.publico === "responsaveis" && (
                      <Checkbox
                        checked={!r.jaCobrado && d.escolhidos.includes(r.guardianId)}
                        disabled={r.jaCobrado}
                        onCheckedChange={(v) => alternar(r, v === true)}
                        className="mt-0.5"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block break-words">{r.nome}</span>
                      {r.alunos.length > 0 && <span className="block text-xs text-muted-foreground">{r.alunos.join(", ")}</span>}
                    </span>
                    {r.jaCobrado && <span className="shrink-0 text-xs text-muted-foreground">já cobrado</span>}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function PassoParaQuemRecorrente({
  ehMensalidade,
  valor,
  onChange,
  excluir,
  carregando,
  erro,
  totalSemMensalidade,
}: {
  ehMensalidade: boolean;
  valor: number[];
  onChange: (ids: number[]) => void;
  excluir: number[] | undefined;
  carregando: boolean;
  erro: boolean;
  totalSemMensalidade: number;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="font-heading text-[15px] font-semibold">
        {ehMensalidade ? "Quais alunos entram na mensalidade?" : "Quais alunos pagam este plano?"}
      </h3>
      {ehMensalidade ? (
        <p className="text-[13px] text-muted-foreground">
          {carregando
            ? "Conferindo quem já está na mensalidade..."
            : `Já marcamos os ${quantosAlunos(totalSemMensalidade)} matriculados que ainda não têm mensalidade. Desmarque quem não deve entrar.`}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Marque os alunos que pagam este plano. Se ainda não sabe, pode criar o plano sem alunos e escolher depois.
        </p>
      )}
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível conferir quem já está na mensalidade. Feche e abra o assistente de novo.
        </p>
      ) : carregando ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <SeletorDeAlunos
          valor={valor}
          onChange={onChange}
          excluir={excluir}
          rotulo={ehMensalidade ? "Alunos da mensalidade" : "Alunos do plano"}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ passo 4: onde o dinheiro cai

function PassoOndeCai({
  d,
  mudar,
  ehMensalidade,
  semContas,
  nomeDaMensalidade,
  carregandoMensalidade,
  conta,
  carteiraManual,
  podeGerarLink,
  gerarMarcado,
  desabilitado,
}: {
  d: Dados;
  mudar: (p: Partial<Dados>) => void;
  ehMensalidade: boolean;
  semContas: boolean;
  nomeDaMensalidade: string | null;
  carregandoMensalidade: boolean;
  conta: { asaasOk: boolean } | undefined;
  carteiraManual: boolean;
  podeGerarLink: boolean;
  gerarMarcado: boolean;
  desabilitado: boolean;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="font-heading text-[15px] font-semibold">Onde o dinheiro cai?</h3>

      {ehMensalidade ? (
        carregandoMensalidade ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : nomeDaMensalidade ? (
          <div className="grid gap-1.5 rounded-xl border border-border p-3 text-[13px] text-muted-foreground">
            <p>
              As mensalidades caem na carteira <strong className="font-medium text-foreground">{nomeDaMensalidade}</strong>, a conta
              padrão das mensalidades da escola.
            </p>
            <p>
              Para trocar, mude a conta padrão em <LinkParaContas />.
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5 rounded-xl border border-border p-3 text-[13px] text-muted-foreground">
            <p>A escola ainda não tem uma conta padrão para as mensalidades.</p>
            <p>
              Para gerar link, Pix e boleto, defina uma em <LinkParaContas />.
            </p>
            <p>
              Sem conta, a mensalidade sai <strong className="font-medium text-foreground">sem carteira</strong>: a família vê
              &quot;pague na secretaria&quot; e vocês marcam como paga. Pode continuar assim.
            </p>
          </div>
        )
      ) : (
        <div className="grid gap-2 rounded-xl border border-border p-3">
          <SeletorDeCarteira
            value={d.carteira}
            onChange={(carteira) => mudar({ carteira })}
            padrao="cobrancas"
            id="ass-carteira"
            disabled={desabilitado}
          />
          {semContas ? (
            <div className="grid gap-1.5 text-[13px] text-muted-foreground">
              <p>
                Para gerar link, Pix e boleto, a escola precisa de uma conta com recebimento configurado. <LinkParaContas />
              </p>
              <p>
                Sem conta, a cobrança sai <strong className="font-medium text-foreground">sem carteira</strong>: a família vê
                &quot;pague na secretaria&quot; e vocês marcam como paga. Pode continuar assim.
              </p>
            </div>
          ) : carteiraManual ? (
            <p className="text-[13px] text-muted-foreground">
              A família vai ver &quot;pague na secretaria&quot;; vocês marcam como paga.
            </p>
          ) : conta ? (
            <p className="text-[13px] text-muted-foreground">
              Link, Pix e boleto podem ser gerados automaticamente.
              {!conta.asaasOk && " A chave do Asaas desta conta ainda não foi testada; se falhar, a cobrança sai manual."}
            </p>
          ) : null}
        </div>
      )}

      {podeGerarLink && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox
            checked={gerarMarcado}
            onCheckedChange={(v) => mudar({ gerarAsaas: v === true })}
            className="mt-0.5"
            disabled={desabilitado}
          />
          <span>
            <span className="inline-flex items-center gap-1.5">
              <Zap aria-hidden className="size-3.5 text-muted-foreground" />
              Gerar link, Pix e boleto agora
            </span>
            <span className="block text-[13px] text-muted-foreground">
              Precisa do CPF do responsável. Sem ele a cobrança sai manual e a família paga na secretaria.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ resultado

function TelaDoResultado({
  resultado,
  onFechar,
  onVerNaLista,
  mesAtual,
}: {
  resultado: Resultado;
  onFechar: () => void;
  onVerNaLista: (destino: "individual" | "recorrente") => void;
  mesAtual: string;
}) {
  const gerarMensalidade = useGerarMensalidades();
  const gerarPlano = useGerarCobrancasDoPlano();

  if (resultado.tipo === "avulsa") {
    const { resposta, jaExistiam } = resultado;
    return (
      <>
        <DialogHeader>
          <DialogTitle>
            {resposta.criadas === 1 ? "1 cobrança criada" : `${resposta.criadas} cobranças criadas`}
          </DialogTitle>
          <DialogDescription>
            {resposta.criadas > 0
              ? "As famílias já veem a cobrança no portal dos pais."
              : "Nenhuma cobrança nova foi criada. Veja abaixo o que aconteceu."}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <ItemDoResultado rotulo="Criadas" valor={resposta.criadas} />
          <ItemDoResultado rotulo="Já existiam" valor={jaExistiam} />
          <ItemDoResultado rotulo="Não deu" valor={resposta.ignoradas.length} />
        </dl>

        {resposta.avisos.length > 0 && (
          <ul className="grid gap-1 rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-muted-foreground">
            {resposta.avisos.map((a, n) => (
              <li key={`${a}-${n}`}>{a}</li>
            ))}
          </ul>
        )}

        {resposta.ignoradas.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Não deu para cobrar</p>
            <ul className="grid max-h-60 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 text-sm">
              {resposta.ignoradas.map((i, n) => (
                <li key={`${i.nome}-${n}`} className="rounded-md px-1.5 py-1">
                  <span className="font-medium">{i.nome}</span>
                  <span className="block text-[13px] text-muted-foreground">{i.motivo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button variant="action" onClick={() => onVerNaLista("individual")}>
            Ver as cobranças
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (resultado.tipo === "mensalidade") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Mensalidade salva</DialogTitle>
          <DialogDescription>
            {quantosAlunos(resultado.quantidade)} {resultado.quantidade === 1 ? "entrou" : "entraram"} na mensalidade.
          </DialogDescription>
        </DialogHeader>
        <PerguntaDeGeracao
          competenciaInicial={resultado.proximaCompetencia > mesAtual ? resultado.proximaCompetencia : mesAtual}
          gerando={gerarMensalidade.isPending}
          gerar={(ano, mes) => gerarMensalidade.mutateAsync({ ano, mes })}
          onFechar={onFechar}
          onVerNaLista={() => onVerNaLista("recorrente")}
        />
      </>
    );
  }

  const { plano, quantidade } = resultado;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Plano criado</DialogTitle>
        <DialogDescription>
          {plano.nome || "O plano"} cobra {formatarMoeda(plano.valor)} por mês, todo dia {plano.diaVencimento}.
        </DialogDescription>
      </DialogHeader>
      {quantidade === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            O plano ainda não tem alunos. Use o botão &quot;Alunos&quot; no cartão do plano para escolher quem paga; depois, gere as
            parcelas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onFechar}>
              Fechar
            </Button>
            <Button variant="action" onClick={() => onVerNaLista("recorrente")}>
              Ver os planos
            </Button>
          </DialogFooter>
        </>
      ) : (
        <PerguntaDeGeracao
          competenciaInicial={plano.inicio.slice(0, 7) > mesAtual ? plano.inicio.slice(0, 7) : mesAtual}
          gerando={gerarPlano.isPending}
          gerar={async (ano, mes) => {
            const r = await gerarPlano.mutateAsync({ id: plano.id, ano, mes });
            return {
              criadas: r.criadas,
              existentes: r.existentes,
              ignoradas: r.ignoradas,
              totalDeIgnoradas: r.totalDeIgnoradas,
              avisos: [],
            };
          }}
          onFechar={onFechar}
          onVerNaLista={() => onVerNaLista("recorrente")}
        />
      )}
    </>
  );
}

/** "Gerar as parcelas de <mês> agora?": pede o mês, gera e mostra o que saiu. */
function PerguntaDeGeracao({
  competenciaInicial,
  gerando,
  gerar,
  onFechar,
  onVerNaLista,
}: {
  competenciaInicial: string;
  gerando: boolean;
  gerar: (ano: number, mes: number) => Promise<ResultadoDaGeracaoMensal>;
  onFechar: () => void;
  onVerNaLista: () => void;
}) {
  const [competencia, setCompetencia] = useState(competenciaInicial);
  const [resultado, setResultado] = useState<ResultadoDaGeracaoMensal | null>(null);

  async function confirmar() {
    const [ano, mes] = competencia.split("-").map(Number);
    if (!ano || !mes) return void toast.error("Escolha o mês.");
    try {
      setResultado(await gerar(ano, mes));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar as parcelas.");
    }
  }

  if (resultado) {
    return (
      <>
        <p className="text-sm font-medium">Parcelas de {nomeDoMes(competencia)}</p>
        <ResultadoDaMensalidade resultado={resultado} />
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button variant="action" onClick={onVerNaLista}>
            Ver as parcelas
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-2 rounded-xl border border-border p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarSync aria-hidden className="size-4 text-muted-foreground" />
          Gerar as parcelas de {competencia ? soNomeDoMes(competencia) : "um mês"} agora?
        </p>
        <p className="text-[13px] text-muted-foreground">
          Se preferir, gere depois pelo cartão do plano. Quem já tem a parcela do mês não recebe outra.
        </p>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Mês
          <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="sm:max-w-48" />
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={gerando} onClick={onVerNaLista}>
          Agora não
        </Button>
        <Button variant="action" disabled={gerando || !competencia} onClick={confirmar}>
          {gerando ? "Gerando..." : "Gerar parcelas"}
        </Button>
      </DialogFooter>
    </>
  );
}
