"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Bot, CircleCheck, MessageCircleQuestion, Sparkles, UsersRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Bloco, CabecalhoDaAssistente, Campo, erro } from "@/components/matriculas/assistente/partes";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { Assistente } from "@/lib/matriculas/tipos";
import { useAssistente, useSalvarAjustesDaAssistente } from "@/lib/matriculas/use-assistente";

const HORAS = Array.from({ length: 25 }, (_, h) => h);
const numero = new Intl.NumberFormat("pt-BR");

/** Para onde levar a escola em cada pendência. */
function destinoDa(pendencia: string): string | null {
  if (pendencia.includes("WhatsApp")) return "/matriculas/whatsapp";
  if (pendencia.includes("ficha") || pendencia.includes("turmas")) return "/matriculas/assistente/ficha";
  return null;
}

export default function AssistentePage() {
  const { data, isLoading, isError } = useAssistente();

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoDaAssistente
        titulo="A assistente da escola"
        descricao="Ela responde as famílias no WhatsApp com o que está na ficha da escola, e passa para a equipe tudo o que não souber. A família sempre fala com um número só."
      />
      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a assistente.
        </div>
      )}
      {isLoading && <Skeleton className="h-72 w-full max-w-5xl rounded-[24px]" />}
      {data && <Painel key={`${data.ligada}-${data.atendimentoInicio}-${data.atendimentoFim}-${data.esperaParaJuntarSegundos}`} a={data} />}
    </div>
  );
}

function Painel({ a }: { a: Assistente }) {
  const ehGestao = getSession()?.role === "Admin";
  const salvar = useSalvarAjustesDaAssistente();
  const [inicio, setInicio] = useState(a.atendimentoInicio);
  const [fim, setFim] = useState(a.atendimentoFim);
  const [espera, setEspera] = useState(String(a.esperaParaJuntarSegundos));
  const podeLigar = a.pendencias.length === 0;

  async function alternar(ligada: boolean) {
    try {
      await salvar.mutateAsync({ ligada, atendimentoInicio: a.atendimentoInicio, atendimentoFim: a.atendimentoFim, esperaParaJuntarSegundos: a.esperaParaJuntarSegundos });
      toast.success(ligada ? "A assistente está atendendo as famílias." : "Assistente desligada. As conversas novas ficam com a equipe.");
    } catch (e) {
      toast.error(erro(e, "Não foi possível mudar a assistente."));
    }
  }

  async function salvarHorario(e: FormEvent) {
    e.preventDefault();
    try {
      await salvar.mutateAsync({ ligada: a.ligada, atendimentoInicio: inicio, atendimentoFim: fim, esperaParaJuntarSegundos: Number(espera) });
      toast.success("Horário salvo.");
    } catch (err) {
      toast.error(erro(err, "Não foi possível salvar o horário."));
    }
  }

  const limite = a.limiteMensalDeRespostas;
  const usado = limite ? Math.min(100, Math.round((a.usoDoMes.respostas / limite) * 100)) : null;

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-[1.35fr_1fr]">
      {/* ligar e desligar */}
      <section
        className={cn(
          "relative overflow-hidden rounded-[28px] border p-6 lg:row-span-2",
          a.ligada ? "border-success/30 bg-success-soft/60" : "border-border bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-12 place-items-center rounded-2xl",
                a.ligada ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Bot className="size-6" aria-hidden />
            </span>
            <div>
              <p className="font-heading text-lg font-semibold leading-tight">{a.ligada ? "Atendendo" : "Desligada"}</p>
              <p className="text-[13px] text-muted-foreground">
                {a.ligada
                  ? `Responde das ${a.atendimentoInicio}h às ${a.atendimentoFim}h. Fora disso, a família é a primeira da manhã.`
                  : "As mensagens novas esperam alguém da equipe."}
              </p>
            </div>
          </div>
          {ehGestao && (
            <Switch
              aria-label="Assistente atendendo"
              checked={a.ligada}
              disabled={salvar.isPending || (!a.ligada && !podeLigar)}
              onCheckedChange={alternar}
            />
          )}
        </div>

        {!a.ligada && a.pendencias.length > 0 && (
          <div className="mt-5 rounded-2xl bg-card/80 p-4 ring-1 ring-border">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-warning" aria-hidden /> Antes de ligar
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {a.pendencias.map((p) => {
                const destino = destinoDa(p);
                return (
                  <li key={p} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="first-letter:uppercase">{p}</span>
                    {destino && (
                      <Link href={destino} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Resolver <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!a.ligada && podeLigar && (
          <p className="mt-5 flex items-center gap-2 rounded-2xl bg-card/80 p-4 text-[13.5px] ring-1 ring-border">
            <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
            Tudo pronto. Antes de ligar, converse com ela como se fosse uma família.
            <Link href="/matriculas/assistente/conversar" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto shrink-0")}>
              Conversar
            </Link>
          </p>
        )}

        <ul className="mt-6 grid gap-3 text-[13.5px] sm:grid-cols-3">
          <li className="flex flex-col gap-1">
            <Sparkles className="size-4 text-action" aria-hidden />
            <span className="font-semibold">Só o que a escola confirmou</span>
            <span className="text-muted-foreground">O que não está na ficha, ela não afirma: diz que vai confirmar.</span>
          </li>
          <li className="flex flex-col gap-1">
            <UsersRound className="size-4 text-action" aria-hidden />
            <span className="font-semibold">A equipe assume quando precisa</span>
            <span className="text-muted-foreground">O card aparece na faixa de espera do funil, com o motivo.</span>
          </li>
          <li className="flex flex-col gap-1">
            <MessageCircleQuestion className="size-4 text-action" aria-hidden />
            <span className="font-semibold">Aprende com a escola</span>
            <span className="text-muted-foreground">O que ela não soube vira pergunta; a resposta entra na ficha.</span>
          </li>
        </ul>
      </section>

      {/* uso do mês */}
      <Bloco titulo="Este mês" descricao="Conversas de teste não contam.">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/60 p-3.5">
            <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Respostas</dt>
            <dd className="mt-1 font-heading text-2xl font-semibold tabular-nums">{numero.format(a.usoDoMes.respostas)}</dd>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3.5">
            <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Para a equipe</dt>
            <dd className="mt-1 font-heading text-2xl font-semibold tabular-nums">{numero.format(a.usoDoMes.paraAEquipe)}</dd>
          </div>
        </dl>
        {limite != null && usado != null && (
          <div className="mt-4">
            <div className="flex justify-between text-[12.5px] text-muted-foreground">
              <span>Limite do plano</span>
              <span className="tabular-nums">
                {numero.format(a.usoDoMes.respostas)} de {numero.format(limite)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", usado >= 90 ? "bg-destructive" : "bg-action")} style={{ width: `${usado}%` }} />
            </div>
          </div>
        )}
        {a.perguntasEmAberto > 0 && (
          <Link
            href="/matriculas/assistente/perguntas"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-action-soft px-3.5 py-3 text-[13.5px] font-medium transition-colors hover:bg-action-soft/70"
          >
            {a.perguntasEmAberto === 1 ? "1 pergunta que ela não soube responder" : `${a.perguntasEmAberto} perguntas que ela não soube responder`}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        )}
      </Bloco>

      {/* horário */}
      <Bloco titulo="Horário de atendimento" descricao="Horário de Brasília. Ninguém quer mensagem de escola às 23h.">
        <form onSubmit={salvarHorario} className="grid gap-3 sm:grid-cols-3">
          <Campo id="ass-inicio" rotulo="Começa">
            <Select value={String(inicio)} onValueChange={(x) => x != null && setInicio(Number(x))} disabled={!ehGestao}>
              <SelectTrigger id="ass-inicio" className="w-full">
                <SelectValue>{() => `${inicio}h`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HORAS.slice(0, 24).map((h) => (
                  <SelectItem key={h} value={String(h)}>{`${h}h`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="ass-fim" rotulo="Termina">
            <Select value={String(fim)} onValueChange={(x) => x != null && setFim(Number(x))} disabled={!ehGestao}>
              <SelectTrigger id="ass-fim" className="w-full">
                <SelectValue>{() => `${fim}h`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HORAS.slice(1).map((h) => (
                  <SelectItem key={h} value={String(h)}>{`${h}h`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="ass-espera" rotulo="Espera (s)" dica="Junta as mensagens seguidas.">
            <Input
              id="ass-espera"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={espera}
              onChange={(e) => setEspera(e.target.value)}
              disabled={!ehGestao}
            />
          </Campo>
          {ehGestao && (
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={salvar.isPending}>
                Salvar horário
              </Button>
            </div>
          )}
        </form>
      </Bloco>

      {!a.servicoDisponivel && (
        <p className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground lg:col-span-2">
          A IA ainda não foi ativada para a sua escola. Isso é feito pelo EducaPilot; enquanto isso, dá para preencher a ficha.
        </p>
      )}
    </div>
  );
}
