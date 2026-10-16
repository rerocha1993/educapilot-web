"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, CopyPlus, Plus, Printer, Send, SlidersHorizontal, Trash2, Undo2, Users } from "lucide-react";
import { toast } from "sonner";

import { GradeDoCardapio } from "@/components/relacionamento/cardapio/grade";
import { ImpressaoDoCardapio } from "@/components/relacionamento/cardapio/impressao";
import { EtiquetaDeStatusDoCardapio } from "@/components/relacionamento/cardapio/comum";
import {
  DialogDeDuplicacao,
  DialogDeOrigem,
  DialogDeRefeicoes,
  DialogDeTurmas,
  type TurmaDaEscola,
} from "@/components/relacionamento/cardapio/dialogs";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { usePainelInicio } from "@/lib/kernel/use-painel";
import {
  contarPratos,
  gradeDosPratos,
  gradesIguais,
  pratosDaGrade,
  type CelulaEditada,
  type GradeEditada,
} from "@/lib/relacionamento/cardapio-edicao";
import { DIAS_DO_CARDAPIO, REFEICOES_DO_CARDAPIO, posicaoDaRefeicao, posicaoDoDia, rotuloDaSemana, segundaDe } from "@/lib/relacionamento/cardapio-vocabulario";
import {
  useCardapio,
  useCardapiosDaSemana,
  useCopiarCardapio,
  useDespublicarCardapio,
  useExcluirCardapio,
  usePublicarCardapio,
  useSalvarCardapio,
  type CardapioDetalhe,
  type CardapioResumo,
  type ConfiguracaoDoCardapio,
} from "@/lib/relacionamento/use-cardapio";
import { somarDias } from "@/lib/tasks/calendario-datas";
import { cn } from "@/lib/utils";

/** A escolha de qual cardápio da semana está aberto: um id, "novo" (ainda sem gravar) ou nada (o primeiro). */
type Escolha = { semana: string; id: string | "novo" } | null;

/**
 * Cardápio semanal, pelo lado da escola: a grade da semana (dias nas colunas, refeições nas
 * linhas) editável célula a célula, para publicar às famílias.
 *
 * Em cima, a semana (anterior, seguinte e "Esta semana"). Cada cardápio da semana é uma aba
 * (escola toda ou uma turma, como o Berçário, com papinha e mamadeira). O professor só consulta.
 * No celular a grade vira uma lista por dia. "Imprimir" gera a folha A4 paisagem com o nome da
 * escola. O cardápio é vitrine: as etiquetas são do prato, e não há restrição alimentar de aluno.
 */
export default function CardapioPage() {
  const hoje = hojeIsoBrasilia();
  const sessao = useSessaoLocal();
  const somenteLeitura = !sessao || sessao.role === "Teacher";

  const [semana, setSemana] = useState(() => segundaDe(hoje));
  const [escolha, setEscolha] = useState<Escolha>(null);
  const [refeicoesAberto, setRefeicoesAberto] = useState(false);
  const [origensAberto, setOrigensAberto] = useState(false);

  const lista = useCardapiosDaSemana(semana);
  const anterior = useCardapiosDaSemana(lista.data?.semanaAnterior ?? "", !somenteLeitura && !!lista.data);
  const copiar = useCopiarCardapio();

  const { data: classes } = useClasses();
  const turmas = useMemo<TurmaDaEscola[]>(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })),
    [classes]
  );

  const cardapios = lista.data?.cardapios ?? [];
  const escolhaDaSemana = escolha?.semana === semana ? escolha.id : null;
  const idAberto =
    escolhaDaSemana === "novo" ? "novo" : (cardapios.find((c) => c.id === escolhaDaSemana)?.id ?? cardapios[0]?.id ?? null);

  const detalhe = useCardapio(idAberto && idAberto !== "novo" ? idAberto : null);
  const configuracao = lista.data?.configuracao;

  const ehEstaSemana = semana === segundaDe(hoje);
  const opcoesDaAnterior = anterior.data?.cardapios ?? [];

  function abrir(id: string, daSemana = semana) {
    setEscolha({ semana: daSemana, id });
  }

  function mudarSemana(nova: string) {
    setSemana(nova);
    setEscolha(null);
  }

  async function copiarDe(origem: CardapioResumo) {
    try {
      const copia = await copiar.mutateAsync({ id: origem.id, semana, turmaIds: null });
      toast.success("Semana anterior copiada como rascunho.");
      setOrigensAberto(false);
      abrir(copia.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível copiar a semana anterior.");
    }
  }

  function copiarSemanaAnterior() {
    if (opcoesDaAnterior.length === 0) {
      toast.info("A semana anterior não tem cardápio para copiar.");
    } else if (opcoesDaAnterior.length === 1) {
      void copiarDe(opcoesDaAnterior[0]);
    } else {
      setOrigensAberto(true);
    }
  }

  const carregando = lista.isLoading || (!!idAberto && idAberto !== "novo" && detalhe.isLoading);

  return (
    <div className="flex flex-col gap-3">
      <RelacionamentoNav />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 print:hidden">
        <div className="mr-auto min-w-0">
          <p className="text-[11.5px] font-bold tracking-[.16em] text-action uppercase">Relacionamento</p>
          <h1 className="font-heading text-[clamp(22px,5vw,28px)] leading-tight font-semibold tracking-[-.03em]">Cardápio</h1>
        </div>

        <div role="group" aria-label="Semana do cardápio" className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label="Semana anterior" onClick={() => mudarSemana(somarDias(semana, -7))}>
            <ChevronLeft />
          </Button>
          <span aria-live="polite" className="min-w-40 px-2 text-center text-sm font-semibold tabular-nums">
            {rotuloDaSemana(semana)}
          </span>
          <Button type="button" variant="outline" size="icon" aria-label="Semana seguinte" onClick={() => mudarSemana(somarDias(semana, 7))}>
            <ChevronRight />
          </Button>
          <Button type="button" variant={ehEstaSemana ? "secondary" : "outline"} disabled={ehEstaSemana} onClick={() => mudarSemana(segundaDe(hoje))}>
            Esta semana
          </Button>
        </div>

        {!somenteLeitura && (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" disabled={copiar.isPending || anterior.isLoading} onClick={copiarSemanaAnterior}>
              <Copy data-icon="inline-start" />
              Copiar semana anterior
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Refeições do cardápio" onClick={() => setRefeicoesAberto(true)}>
              <SlidersHorizontal />
            </Button>
          </div>
        )}
      </div>

      {lista.isError && <ErroDeCarga texto="Não foi possível carregar o cardápio." onTentar={() => lista.refetch()} />}

      {carregando && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {lista.data && configuracao && (
        <>
          {(cardapios.length > 0 || idAberto === "novo") && (
            <div role="tablist" aria-label="Cardápios da semana" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 print:hidden">
              {cardapios.map((c) => (
                <AbaDoCardapio key={c.id} cardapio={c} ativa={c.id === idAberto} onClick={() => abrir(c.id)} />
              ))}
              {idAberto === "novo" && (
                <span role="tab" aria-selected className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-primary bg-primary px-3.5 text-[13px] font-semibold whitespace-nowrap text-primary-foreground">
                  Novo cardápio
                </span>
              )}
              {!somenteLeitura && idAberto !== "novo" && (
                <Button type="button" variant="ghost" className="shrink-0" onClick={() => abrir("novo")}>
                  <Plus data-icon="inline-start" />
                  Novo cardápio
                </Button>
              )}
            </div>
          )}

          {cardapios.length === 0 && idAberto !== "novo" && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-border-dashed bg-card px-4 py-3 print:hidden">
              <p className="mr-auto text-sm text-muted-foreground">
                {somenteLeitura
                  ? "Nenhum cardápio nesta semana."
                  : "Nenhum cardápio nesta semana — copiar a anterior ou começar."}
              </p>
              {!somenteLeitura && (
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" disabled={copiar.isPending || anterior.isLoading} onClick={copiarSemanaAnterior}>
                    <Copy data-icon="inline-start" />
                    Copiar a anterior
                  </Button>
                  <Button type="button" variant="action" onClick={() => abrir("novo")}>
                    <Plus data-icon="inline-start" />
                    Começar
                  </Button>
                </div>
              )}
            </div>
          )}

          {idAberto === "novo" && (
            <Editor
              key={`novo:${semana}`}
              semana={semana}
              inicial={null}
              configuracao={configuracao}
              turmas={turmas}
              somenteLeitura={somenteLeitura}
              hoje={hoje}
              onSalvo={(id) => abrir(id)}
              onApagado={() => setEscolha(null)}
              onDuplicado={(daSemana, id) => {
                setSemana(daSemana);
                abrir(id, daSemana);
              }}
            />
          )}

          {idAberto && idAberto !== "novo" && detalhe.isError && (
            <ErroDeCarga texto="Não foi possível carregar este cardápio." onTentar={() => detalhe.refetch()} />
          )}

          {idAberto && idAberto !== "novo" && detalhe.data && (
            <Editor
              // Muda a chave quando o servidor devolve outra versão: o rascunho local recomeça do que foi salvo.
              key={`${detalhe.data.id}:${detalhe.data.atualizadoEm ?? ""}:${detalhe.data.status}`}
              semana={detalhe.data.semana}
              inicial={detalhe.data}
              configuracao={configuracao}
              turmas={turmas}
              somenteLeitura={somenteLeitura}
              hoje={hoje}
              onSalvo={(id) => abrir(id)}
              onApagado={() => setEscolha(null)}
              onDuplicado={(daSemana, id) => {
                setSemana(daSemana);
                abrir(id, daSemana);
              }}
            />
          )}
        </>
      )}

      {configuracao && <DialogDeRefeicoes aberto={refeicoesAberto} configuracao={configuracao} onFechar={() => setRefeicoesAberto(false)} />}
      <DialogDeOrigem
        aberto={origensAberto}
        semanaDeOrigem={lista.data?.semanaAnterior ?? semana}
        opcoes={opcoesDaAnterior}
        copiando={copiar.isPending}
        onEscolher={(o) => void copiarDe(o)}
        onFechar={() => setOrigensAberto(false)}
      />
    </div>
  );
}

function nomeDoCardapio(c: Pick<CardapioResumo, "titulo" | "escolaToda" | "turmas">): string {
  if (c.titulo) return c.titulo;
  return c.escolaToda ? "Escola toda" : c.turmas.map((t) => t.nome).join(", ");
}

function AbaDoCardapio({ cardapio, ativa, onClick }: { cardapio: CardapioResumo; ativa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 max-w-64 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        ativa ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:bg-muted"
      )}
    >
      <span className="min-w-0 truncate">{nomeDoCardapio(cardapio)}</span>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", cardapio.status === "Publicado" ? "bg-success-soft-foreground" : "bg-warning-soft-foreground")}
      />
      <span className="sr-only">{cardapio.status}</span>
    </button>
  );
}

// ------------------------------------------------------------------ editor

interface PropsDoEditor {
  semana: string;
  /** Nulo = cardápio novo, ainda sem gravar. */
  inicial: CardapioDetalhe | null;
  configuracao: ConfiguracaoDoCardapio;
  turmas: readonly TurmaDaEscola[];
  somenteLeitura: boolean;
  hoje: string;
  onSalvo: (id: string) => void;
  onApagado: () => void;
  onDuplicado: (semana: string, id: string) => void;
}

/** A grade de um cardápio: o rascunho local, a barra de ações e a folha de impressão. */
function Editor({ semana, inicial, configuracao, turmas, somenteLeitura, hoje, onSalvo, onApagado, onDuplicado }: PropsDoEditor) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [turmaIds, setTurmaIds] = useState<number[]>(() => inicial?.turmas.map((t) => t.classId) ?? []);
  const [grade, setGrade] = useState<GradeEditada>(() => gradeDosPratos(inicial?.itens ?? []));
  const [turmasAberto, setTurmasAberto] = useState(false);
  const [duplicarAberto, setDuplicarAberto] = useState(false);

  const salvar = useSalvarCardapio();
  const publicar = usePublicarCardapio();
  const despublicar = useDespublicarCardapio();
  const excluir = useExcluirCardapio();
  const { data: painel } = usePainelInicio();

  const publicado = inicial?.status === "Publicado";
  const salvo = useMemo(() => gradeDosPratos(inicial?.itens ?? []), [inicial]);
  const turmasSalvas = (inicial?.turmas.map((t) => t.classId) ?? []).slice().sort((a, b) => a - b).join(",");
  const sujo =
    !gradesIguais(grade, salvo) ||
    titulo.trim() !== (inicial?.titulo ?? "") ||
    observacao.trim() !== (inicial?.observacao ?? "") ||
    turmaIds.slice().sort((a, b) => a - b).join(",") !== turmasSalvas;
  const ocupado = salvar.isPending || publicar.isPending || despublicar.isPending || excluir.isPending;
  const pratos = contarPratos(grade);

  // O que a grade mostra: o que a escola usa, mais o que já tem prato (ligar e desligar refeição não esconde o que foi lançado).
  const comPrato = Object.entries(grade).filter(([, c]) => c.descricao.trim()).map(([k]) => k.split("|"));
  const refeicoes = REFEICOES_DO_CARDAPIO.map((r) => r.id)
    .filter((r) => configuracao.refeicoes.includes(r) || comPrato.some(([, ref]) => ref === r))
    .sort((a, b) => posicaoDaRefeicao(a) - posicaoDaRefeicao(b));
  const dias = DIAS_DO_CARDAPIO.map((d) => d.id)
    .filter((d) => configuracao.dias.includes(d) || comPrato.some(([dia]) => dia === d))
    .sort((a, b) => posicaoDoDia(a) - posicaoDoDia(b));

  const turmasEscolhidas = turmas.filter((t) => turmaIds.includes(t.id));
  const paraQuem = turmaIds.length === 0 ? "Escola toda" : turmasEscolhidas.map((t) => t.nome).join(", ");

  function mudarCelula(chave: string, celula: CelulaEditada) {
    setGrade((g) => ({ ...g, [chave]: celula }));
  }

  async function gravar() {
    try {
      const salvoAgora = await salvar.mutateAsync({
        id: inicial?.id,
        semana,
        titulo,
        observacao,
        turmaIds,
        itens: pratosDaGrade(grade),
      });
      toast.success(publicado ? "Cardápio salvo. As famílias já veem a mudança." : "Cardápio salvo.");
      onSalvo(salvoAgora.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o cardápio.");
    }
  }

  async function publicarAgora() {
    if (!inicial) return;
    const ok = window.confirm(
      `Publicar o cardápio da semana de ${rotuloDaSemana(semana)}? As famílias recebem um aviso na primeira publicação.`
    );
    if (!ok) return;

    try {
      await publicar.mutateAsync(inicial.id);
      toast.success("Cardápio publicado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar o cardápio.");
    }
  }

  async function despublicarAgora() {
    if (!inicial) return;
    if (!window.confirm("Tirar este cardápio das famílias? Ele volta a ser rascunho.")) return;

    try {
      await despublicar.mutateAsync(inicial.id);
      toast.success("Cardápio despublicado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível despublicar o cardápio.");
    }
  }

  async function excluirAgora() {
    if (!inicial) return;
    if (!window.confirm("Excluir este rascunho? Não dá para desfazer.")) return;

    try {
      await excluir.mutateAsync(inicial.id);
      toast.success("Rascunho excluído.");
      onApagado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o cardápio.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 print:hidden">
        {!somenteLeitura ? (
          <>
            <Input
              aria-label="Título do cardápio"
              placeholder="Título (opcional), ex.: Cardápio — Berçário"
              maxLength={80}
              value={titulo}
              disabled={ocupado}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full sm:w-72"
            />
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => setTurmasAberto(true)} className="max-w-full">
              <Users data-icon="inline-start" />
              <span className="min-w-0 truncate">Para: {paraQuem}</span>
            </Button>
          </>
        ) : (
          <p className="text-sm font-semibold">
            {inicial?.titulo ?? paraQuem}
            {inicial?.titulo && <span className="font-normal text-muted-foreground"> · {paraQuem}</span>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:ml-auto">
          <EtiquetaDeStatusDoCardapio status={inicial?.status ?? "Rascunho"} atualizado={inicial?.atualizado} />
          <span className="text-[12.5px] text-muted-foreground tabular-nums">{pratos === 1 ? "1 prato" : `${pratos} pratos`}</span>
          {sujo && !somenteLeitura && (
            <span role="status" className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-warning-soft-foreground">
              Alterações não salvas
            </span>
          )}
        </div>
      </div>

      {!somenteLeitura && inicial && !publicado && !sujo && (
        <p className="text-[12.5px] text-muted-foreground print:hidden">Rascunho: as famílias ainda não veem este cardápio.</p>
      )}
      {!somenteLeitura && publicado && (
        <p className="text-[12.5px] text-muted-foreground print:hidden">Publicado: ao salvar, as famílias passam a ver a mudança.</p>
      )}

      <div className="print:hidden">
        <GradeDoCardapio
          semana={semana}
          dias={dias}
          refeicoes={refeicoes}
          grade={grade}
          onChange={mudarCelula}
          somenteLeitura={somenteLeitura}
          hoje={hoje}
        />
      </div>

      <div className="flex flex-col gap-1 print:hidden">
        <label htmlFor="cardapio-observacao" className="text-[12.5px] font-semibold">
          Observação para as famílias
        </label>
        {somenteLeitura ? (
          <p className="text-sm whitespace-pre-line text-muted-foreground">{inicial?.observacao ?? "—"}</p>
        ) : (
          <textarea
            id="cardapio-observacao"
            rows={2}
            maxLength={500}
            value={observacao}
            disabled={ocupado}
            placeholder="Ex.: Cardápio sujeito a alteração"
            onChange={(e) => setObservacao(e.target.value)}
            className="block w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        )}
      </div>

      <div className="sticky bottom-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-2 backdrop-blur md:bottom-0 print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()} disabled={pratos === 0}>
          <Printer data-icon="inline-start" />
          Imprimir
        </Button>

        {!somenteLeitura && (
          <>
            {inicial && !publicado && (
              <Button type="button" variant="ghost" className="text-destructive" disabled={ocupado} onClick={() => void excluirAgora()}>
                <Trash2 data-icon="inline-start" />
                Excluir
              </Button>
            )}
            {inicial && (
              <Button
                type="button"
                variant="outline"
                disabled={ocupado || sujo}
                title={sujo ? "Salve as alterações antes de duplicar" : undefined}
                onClick={() => setDuplicarAberto(true)}
              >
                <CopyPlus data-icon="inline-start" />
                Duplicar para...
              </Button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button type="button" variant={sujo ? "action" : "outline"} disabled={ocupado || !sujo} onClick={() => void gravar()}>
                {salvar.isPending ? "Salvando..." : "Salvar"}
              </Button>
              {inicial &&
                (publicado ? (
                  <Button type="button" variant="outline" disabled={ocupado || sujo} onClick={() => void despublicarAgora()}>
                    <Undo2 data-icon="inline-start" />
                    Despublicar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="action"
                    disabled={ocupado || sujo || pratos === 0}
                    title={sujo ? "Salve as alterações antes de publicar" : undefined}
                    onClick={() => void publicarAgora()}
                  >
                    <Send data-icon="inline-start" />
                    Publicar
                  </Button>
                ))}
            </div>
          </>
        )}
      </div>

      <ImpressaoDoCardapio
        escola={painel?.escolaNome ?? null}
        titulo={titulo.trim()}
        paraQuem={paraQuem}
        semana={semana}
        dias={dias}
        refeicoes={refeicoes}
        grade={grade}
        observacao={observacao}
      />

      <DialogDeTurmas
        aberto={turmasAberto}
        turmas={turmas}
        inicial={turmaIds}
        onConfirmar={setTurmaIds}
        onFechar={() => setTurmasAberto(false)}
      />
      <DialogDeDuplicacao
        aberto={duplicarAberto}
        cardapio={inicial}
        turmas={turmas}
        onFechar={() => setDuplicarAberto(false)}
        onCopiado={onDuplicado}
      />
    </div>
  );
}
