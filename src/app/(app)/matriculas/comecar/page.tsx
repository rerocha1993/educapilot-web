"use client";

import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { cn } from "@/lib/utils";
import type { PassoDoCadastro } from "@/lib/matriculas/tipos";
import { usePrimeirosPassos } from "@/lib/matriculas/use-assistente";

export default function ComecarPage() {
  const { data, isLoading, isError } = usePrimeirosPassos();
  const proximo = data?.passos.find((p) => p.situacao === "pendente");
  const pct = data ? Math.round((data.feitos / Math.max(1, data.obrigatorios)) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">Primeiros passos</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Da escola ao primeiro atendimento da assistente. Cada passo se marca sozinho quando fica pronto; você pode fazer na ordem que
          quiser, mas esta é a que funciona.
        </p>
      </div>

      {isError && <p className="text-sm text-destructive">Não foi possível carregar os primeiros passos.</p>}
      {isLoading && <Skeleton className="h-96 max-w-3xl rounded-[24px]" />}

      {data && (
        <div className="flex max-w-3xl flex-col gap-4">
          <section className="rounded-[24px] border border-border bg-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-heading text-lg font-semibold">
                {data.pronta ? "Tudo pronto" : `${data.feitos} de ${data.obrigatorios} passos`}
              </p>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-action transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            {proximo && (
              <Link href={proximo.caminho} className={cn(buttonVariants({ variant: "action" }), "mt-4")}>
                Continuar: {proximo.titulo} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </section>

          <ol className="flex flex-col gap-2">
            {data.passos.map((p, i) => (
              <Passo key={p.chave} p={p} numero={i + 1} proximo={p.chave === proximo?.chave} />
            ))}
          </ol>

          <section
            className={cn(
              "flex flex-col gap-3 rounded-[24px] border p-5 sm:flex-row sm:items-center",
              data.assistenteLigada ? "border-success/30 bg-success-soft/60" : "border-border bg-card"
            )}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", data.assistenteLigada ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}>
              <Bot className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{data.assistenteLigada ? "A assistente está atendendo" : "Ligar a assistente"}</p>
              <p className="text-[13px] text-muted-foreground">
                {data.assistenteLigada
                  ? "As famílias que escrevem no WhatsApp já são respondidas por ela, no horário da escola."
                  : data.pronta
                    ? "Tudo configurado. Quando ligar, ela passa a responder as famílias no WhatsApp."
                    : "Depois dos passos acima. Enquanto isso, as mensagens ficam com a equipe."}
              </p>
            </div>
            <Link href="/matriculas/assistente" className={buttonVariants({ variant: data.pronta && !data.assistenteLigada ? "action" : "outline" })}>
              {data.assistenteLigada ? "Ver" : "Ligar"}
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}

function Passo({ p, numero, proximo }: { p: PassoDoCadastro; numero: number; proximo: boolean }) {
  const feito = p.situacao === "feito";
  const Icone = feito ? CheckCircle2 : p.situacao === "opcional" ? CircleDashed : Circle;

  return (
    <li>
      <Link
        href={p.caminho}
        className={cn(
          "flex items-start gap-3 rounded-[20px] border bg-card p-4 transition-colors hover:bg-muted/40",
          proximo ? "border-action/50 ring-2 ring-action/15" : "border-border"
        )}
      >
        <Icone className={cn("mt-0.5 size-5 shrink-0", feito ? "text-success" : proximo ? "text-action" : "text-muted-foreground")} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            <span className="mr-1.5 font-mono text-[12px] tabular-nums text-muted-foreground">{numero}.</span>
            {p.titulo}
          </p>
          <p className="text-[13px] text-muted-foreground">{p.descricao}</p>
          {p.detalhe && <p className={cn("mt-1 text-[12.5px]", feito ? "text-success" : "text-foreground")}>{p.detalhe}</p>}
        </div>
        <span className="sr-only">{feito ? "feito" : p.situacao === "opcional" ? "opcional" : "por fazer"}</span>
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
