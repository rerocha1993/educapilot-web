"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CloudOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarSoData } from "@/lib/format/date";
import {
  formatarNota,
  useAvaliacao,
  useConcluirAvaliacao,
  useSalvarAvaliacao,
  type Avaliacao,
  type PerguntaRespondida,
  type Resposta,
} from "@/lib/rh/use-desempenho";
import { cn } from "@/lib/utils";

import { ErroDeCarga } from "../campo";
import { RotuloPequeno } from "./pecas";

export interface Operacoes {
  /** Salva respostas (rascunho). */
  salvar: (respostas: Resposta[]) => Promise<unknown>;
  /** Conclui a avaliação. */
  concluir: () => Promise<unknown>;
}

type Valor = { nota: number | null; texto: string };
type Estado = "salvo" | "pendente" | "salvando" | "erro";

const respondida = (p: PerguntaRespondida, v: Valor | undefined) => (p.tipo === "Nota" ? v?.nota != null : !!v?.texto.trim());

/** Escolha de 1 a 5. A âncora (o que cada nota quer dizer) aparece ao passar o mouse ou focar, e fica na nota escolhida. */
function Segmentado({
  pergunta,
  valor,
  desabilitado,
  onEscolher,
}: {
  pergunta: PerguntaRespondida;
  valor: number | null;
  desabilitado: boolean;
  onEscolher: (n: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const foco = hover ?? valor;
  const ancora = foco != null ? pergunta.ancoras[foco - 1] : null;

  return (
    <div className="grid gap-1">
      <div role="radiogroup" aria-label={pergunta.texto} className="inline-flex w-fit overflow-hidden rounded-lg border border-input" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const ativo = valor === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={desabilitado}
              title={pergunta.ancoras[n - 1] ? `${n}: ${pergunta.ancoras[n - 1]}` : String(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onEscolher(ativo ? null : n)}
              className={cn(
                "h-8 w-9 border-r border-input text-sm font-semibold transition-colors last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring max-md:h-10 max-md:w-11",
                ativo ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                desabilitado && "cursor-default opacity-70"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="min-h-4 text-[11.5px] leading-snug text-muted-foreground" aria-live="polite">
        {ancora ? (
          <>
            <span className="font-semibold text-foreground">{foco}</span> · {ancora}
          </>
        ) : pergunta.ancoras.length > 0 ? (
          "1 = abaixo do esperado … 5 = referência"
        ) : (
          ""
        )}
      </p>
    </div>
  );
}

/** Ícone e frase do estado do rascunho, ao lado do progresso. */
function EstadoDoRascunho({ estado, onTentar }: { estado: Estado; onTentar: () => void }) {
  if (estado === "erro")
    return (
      <button type="button" onClick={onTentar} className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
        <CloudOff className="size-3.5" /> Não salvou. Tentar de novo
      </button>
    );
  if (estado === "salvando" || estado === "pendente")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" /> Salvando...
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CircleCheck className="size-3.5 text-success" /> Rascunho salvo
    </span>
  );
}

/**
 * Formulário de feedback numa página só: perguntas agrupadas por competência em grade compacta, nota de 1 a 5 em
 * segmentado, texto em áreas curtas, progresso "X de Y respondidas", rascunho salvo sozinho e conclusão com revisão.
 * Usado pelo gestor e, com outras operações, pelo funcionário na autoavaliação.
 */
export function FormularioDeFeedback({
  avaliacao,
  operacoes,
  voltarHref,
  rotuloVoltar,
  aviso,
  apos,
  rodape,
}: {
  avaliacao: Avaliacao;
  operacoes: Operacoes;
  voltarHref: string;
  rotuloVoltar: string;
  /** Texto sob o título (quem avalia, o que acontece depois). */
  aviso?: React.ReactNode;
  /** O que fazer depois de concluir (a tela decide para onde ir). */
  apos: () => void;
  /** Bloco extra no fim da página (contestação, reabertura...). */
  rodape?: React.ReactNode;
}) {
  const somenteLeitura = avaliacao.status === "Concluida";
  const [valores, setValores] = useState<Record<string, Valor>>(() =>
    Object.fromEntries(avaliacao.perguntas.map((p) => [p.id!, { nota: p.notaDada, texto: p.textoDado ?? "" }]))
  );
  const [estado, setEstado] = useState<Estado>("salvo");
  const [revisando, setRevisando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);

  const pendentes = useRef(new Map<string, Resposta>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emVoo = useRef(false);

  async function salvarAgora(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (emVoo.current) return false;
    if (pendentes.current.size === 0) return true;

    const lote = [...pendentes.current.values()];
    pendentes.current.clear();
    emVoo.current = true;
    setEstado("salvando");
    try {
      await operacoes.salvar(lote);
      emVoo.current = false;
      if (pendentes.current.size > 0) {
        void salvarAgora();
        return true;
      }
      setEstado("salvo");
      return true;
    } catch (err) {
      emVoo.current = false;
      // Devolve o lote à fila (sem sobrescrever o que o usuário mexeu depois).
      for (const r of lote) if (!pendentes.current.has(r.perguntaId)) pendentes.current.set(r.perguntaId, r);
      setEstado("erro");
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o rascunho.");
      return false;
    }
  }

  function alterar(p: PerguntaRespondida, mudanca: Partial<Valor>) {
    if (somenteLeitura) return;
    const novo = { ...(valores[p.id!] ?? { nota: null, texto: "" }), ...mudanca };
    setValores((v) => ({ ...v, [p.id!]: novo }));
    pendentes.current.set(p.id!, { perguntaId: p.id!, nota: novo.nota, texto: novo.texto.trim() || null });
    setEstado("pendente");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void salvarAgora(), 1200);
  }

  // Ao sair da tela com alteração pendente, grava antes (a mutação segue depois de desmontar).
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendentes.current.size > 0 && !emVoo.current) {
        const lote = [...pendentes.current.values()];
        pendentes.current.clear();
        void operacoes.salvar(lote).catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, PerguntaRespondida[]>();
    for (const p of avaliacao.perguntas) mapa.set(p.grupo, [...(mapa.get(p.grupo) ?? []), p]);
    // Os grupos só de texto (visão geral) vão para o fim, em largura total.
    const todos = [...mapa.entries()];
    return {
      escalas: todos.filter(([, ps]) => ps.some((p) => p.tipo === "Nota")),
      abertas: todos.filter(([, ps]) => ps.every((p) => p.tipo === "Texto")),
    };
  }, [avaliacao.perguntas]);

  const total = avaliacao.perguntas.length;
  const feitas = avaliacao.perguntas.filter((p) => respondida(p, valores[p.id!])).length;
  const faltando = avaliacao.perguntas.filter((p) => p.obrigatoria && !respondida(p, valores[p.id!]));

  /** Média ponderada parcial (1 a 5), para o resumo da revisão. */
  const mediaPorGrupo = grupos.escalas.map(([grupo, ps]) => {
    const dadas = ps.filter((p) => p.tipo === "Nota" && valores[p.id!]?.nota != null);
    const peso = dadas.reduce((s, p) => s + p.peso, 0);
    return { grupo, media: peso > 0 ? dadas.reduce((s, p) => s + p.peso * valores[p.id!]!.nota!, 0) / peso : null, peso };
  });
  const pesoTotal = mediaPorGrupo.reduce((s, g) => s + (g.media != null ? g.peso : 0), 0);
  const mediaGeral = pesoTotal > 0 ? mediaPorGrupo.reduce((s, g) => s + (g.media != null ? g.media * g.peso : 0), 0) / pesoTotal : null;

  async function concluir() {
    setConcluindo(true);
    try {
      if (!(await salvarAgora())) {
        // Se uma gravação estava em andamento, espera a fila esvaziar antes de concluir.
        await new Promise((r) => setTimeout(r, 600));
        if (pendentes.current.size > 0 && !(await salvarAgora())) return;
      }
      await operacoes.concluir();
      toast.success("Feedback concluído.");
      setRevisando(false);
      apos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir o feedback.");
    } finally {
      setConcluindo(false);
    }
  }

  const linhaDePergunta = (p: PerguntaRespondida) => {
    const v = valores[p.id!];
    const sem = p.obrigatoria && !respondida(p, v);
    return (
      <div key={p.id} className="grid gap-1.5 py-2">
        <p className="text-[13.5px] leading-snug">
          {p.texto}
          {p.obrigatoria && !somenteLeitura && (
            <span className={cn("ml-1 text-xs", sem ? "text-destructive" : "text-muted-foreground")} title="Obrigatória">
              *
            </span>
          )}
        </p>
        {p.tipo === "Nota" ? (
          <Segmentado pergunta={p} valor={v?.nota ?? null} desabilitado={somenteLeitura} onEscolher={(n) => alterar(p, { nota: n })} />
        ) : (
          <Textarea
            aria-label={p.texto}
            rows={2}
            maxLength={4000}
            disabled={somenteLeitura}
            value={v?.texto ?? ""}
            onChange={(e) => alterar(p, { texto: e.target.value })}
            onBlur={() => void salvarAgora()}
            className="min-h-14 text-[13.5px]"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <CabecalhoDaPagina
        eyebrow={`← ${rotuloVoltar}`}
        eyebrowHref={voltarHref}
        titulo={`Feedback · ${avaliacao.cicloNome}`}
        tags={
          <>
            <Badge variant={somenteLeitura ? "success" : "pending"}>{somenteLeitura ? "Concluído" : "Rascunho"}</Badge>
            {avaliacao.tipo === "Auto" && <Badge variant="outline">Autoavaliação</Badge>}
          </>
        }
        apoio={aviso ?? `${avaliacao.funcionarioNome}${avaliacao.avaliadorNome ? ` · avaliador: ${avaliacao.avaliadorNome}` : ""}`}
      />

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        {somenteLeitura ? (
          <>
            <div>
              <RotuloPequeno>Nota do feedback</RotuloPequeno>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {formatarNota(avaliacao.nota100)} <span className="text-sm font-normal text-muted-foreground">/ 100 · {formatarNota(avaliacao.notaGeral)} de 5</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Concluído em {avaliacao.concluidaEm ? formatarSoData(avaliacao.concluidaEm) : "—"}
              {avaliacao.reaberturas > 0 && ` · reaberto ${avaliacao.reaberturas}×`}
            </p>
          </>
        ) : (
          <>
            <div className="min-w-40 flex-1">
              <p className="text-sm font-medium tabular-nums">
                {feitas} de {total} respondidas
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitas} aria-label="Progresso do feedback">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} />
              </div>
            </div>
            <EstadoDoRascunho estado={estado} onTentar={() => void salvarAgora()} />
            <Button variant="action" onClick={() => setRevisando(true)}>
              Revisar e concluir
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {grupos.escalas.map(([grupo, ps]) => (
          <section key={grupo} className="rounded-xl border border-border bg-card px-4 py-2.5" aria-label={grupo}>
            <h3 className="font-heading text-[15px] font-semibold">{grupo}</h3>
            <div className="divide-y divide-border">{ps.map(linhaDePergunta)}</div>
          </section>
        ))}
      </div>

      {grupos.abertas.map(([grupo, ps]) => (
        <section key={grupo} className="rounded-xl border border-border bg-card px-4 py-2.5" aria-label={grupo}>
          <h3 className="font-heading text-[15px] font-semibold">{grupo}</h3>
          <div className="grid gap-x-4 md:grid-cols-2">{ps.map(linhaDePergunta)}</div>
        </section>
      ))}

      {rodape}

      {revisando && (
        <Dialog open onOpenChange={(aberto) => !aberto && !concluindo && setRevisando(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Revisar e concluir</DialogTitle>
              <DialogDescription>
                Depois de concluído o feedback não se edita (só reabrindo, com motivo registrado). Ele só chega ao funcionário se
                você o compartilhar.
              </DialogDescription>
            </DialogHeader>

            {faltando.length > 0 ? (
              <div role="alert" className="grid gap-1 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
                <p className="font-semibold">Faltam {faltando.length} pergunta(s) obrigatória(s):</p>
                <ul className="list-disc pl-5 text-[13px]">
                  {faltando.slice(0, 6).map((p) => (
                    <li key={p.id}>{p.tipo === "Nota" ? p.grupo : p.texto}</li>
                  ))}
                  {faltando.length > 6 && <li>e mais {faltando.length - 6}...</li>}
                </ul>
              </div>
            ) : (
              <div className="grid gap-2 text-sm">
                <p>
                  Média ponderada: <span className="font-semibold tabular-nums">{mediaGeral == null ? "—" : mediaGeral.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span> de 5
                  {mediaGeral != null && (
                    <span className="text-muted-foreground"> ({formatarNota(((mediaGeral - 1) / 4) * 100)} de 100)</span>
                  )}
                </p>
                <ul className="grid max-h-56 gap-x-4 gap-y-0.5 overflow-y-auto text-[12.5px] sm:grid-cols-2">
                  {mediaPorGrupo.map((g) => (
                    <li key={g.grupo} className="flex justify-between gap-2">
                      <span className="truncate">{g.grupo}</span>
                      <span className="font-mono tabular-nums">{g.media == null ? "—" : g.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" disabled={concluindo} onClick={() => setRevisando(false)}>
                Voltar e ajustar
              </Button>
              <Button variant="action" disabled={concluindo || faltando.length > 0} onClick={concluir}>
                {concluindo ? "Concluindo..." : "Concluir feedback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Tela do gestor: carrega a avaliação e liga o formulário às rotas de gestão. */
export function TelaDeFeedback({ avaliacaoId }: { avaliacaoId: string }) {
  const router = useRouter();
  const { data, isError, isFetchedAfterMount, refetch } = useAvaliacao(avaliacaoId);
  const salvar = useSalvarAvaliacao();
  const concluir = useConcluirAvaliacao();

  if (isError) return <ErroDeCarga texto="Não foi possível carregar o feedback." onTentar={() => refetch()} />;
  // Só monta depois de ler o servidor: o formulário nasce com o estado da resposta e não pode partir de um cache velho.
  if (!data || !isFetchedAfterMount)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );

  const voltar = `/rh/funcionarios/${data.funcionarioId}?aba=desempenho`;
  return (
    <FormularioDeFeedback
      key={data.id}
      avaliacao={data}
      operacoes={{
        salvar: (respostas) => salvar.mutateAsync({ id: data.id, respostas }),
        concluir: () => concluir.mutateAsync({ id: data.id }),
      }}
      voltarHref={voltar}
      rotuloVoltar={data.funcionarioNome}
      apos={() => router.push(voltar)}
      rodape={
        data.contestacao ? (
          <section className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground" aria-label="Contestação do funcionário">
            <p className="font-semibold">Contestação ou observação do funcionário{data.contestacaoEm ? ` (${formatarSoData(data.contestacaoEm)})` : ""}</p>
            <p className="mt-1 whitespace-pre-wrap">{data.contestacao}</p>
          </section>
        ) : data.motivoDaReabertura ? (
          <p className="text-xs text-muted-foreground">
            Última reabertura{data.reabertaEm ? ` em ${formatarSoData(data.reabertaEm)}` : ""}: {data.motivoDaReabertura}
          </p>
        ) : null
      }
    />
  );
}
