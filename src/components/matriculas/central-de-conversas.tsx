"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ConversaResumo, Mensagem } from "@/lib/matriculas/tipos";
import { COR_DA_ETAPA, TITULO_PADRAO_DA_ETAPA, esperaEmTexto, iniciais, tempoDesde } from "@/lib/matriculas/rotulos";
import { useAssumirConversa, useConversa, useConversas } from "@/lib/matriculas/use-conversas";
import { BolhaDeMensagem } from "./bolha-de-mensagem";
import { CaixaDeEnvio } from "./caixa-de-envio";

const FUSO = "America/Sao_Paulo";
const diaIso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const diaLongo = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "numeric", month: "long" });

function rotuloDoDia(iso: string) {
  const dia = diaIso.format(new Date(iso));
  const hoje = diaIso.format(new Date());
  const ontem = diaIso.format(new Date(Date.now() - 86_400_000));
  if (dia === hoje) return "Hoje";
  if (dia === ontem) return "Ontem";
  return diaLongo.format(new Date(iso));
}

/**
 * As conversas do WhatsApp da escola: lista à esquerda, conversa à direita. A família escolhida fica
 * no endereço (?lead=), para a ficha do funil poder abrir a conversa direto.
 */
export function CentralDeConversas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selecionada = params.get("lead");
  const [busca, setBusca] = useState("");
  const { data: conversas, isLoading, isError, dataUpdatedAt } = useConversas(busca);

  function abrir(leadId: string | null) {
    router.replace(leadId ? `${pathname}?lead=${leadId}` : pathname, { scroll: false });
  }

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[480px] overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_1px_2px_rgba(42,37,48,.05),0_8px_24px_-12px_rgba(42,37,48,.12)] max-md:h-[calc(100dvh-13rem)]">
      <aside
        className={cn(
          "flex w-full flex-col border-r border-foreground/[.07] md:w-[340px] md:shrink-0",
          selecionada && "max-md:hidden"
        )}
      >
        <div className="p-3">
          <label className="flex h-9 items-center gap-2 rounded-full bg-muted px-3.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id="busca-conversas"
              aria-label="Buscar conversa"
              placeholder="Família, criança ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 pb-2">
          {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mx-1.5 my-1 h-16 rounded-2xl" />)}
          {isError && <p className="px-4 py-6 text-sm text-destructive">Não foi possível carregar as conversas.</p>}
          {conversas?.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
              <MessageCircle className="size-8 opacity-40" aria-hidden />
              {busca ? "Nenhuma conversa com essa busca." : "Quando uma família escrever no WhatsApp da escola, a conversa aparece aqui."}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {conversas?.map((c) => (
              <li key={c.leadId}>
                <ItemDaLista conversa={c} ativa={c.leadId === selecionada} agora={dataUpdatedAt} onAbrir={() => abrir(c.leadId)} />
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className={cn("flex min-w-0 flex-1 flex-col bg-muted/40", !selecionada && "max-md:hidden")}>
        {selecionada ? (
          <ConversaAberta leadId={selecionada} onVoltar={() => abrir(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageCircle className="size-10 opacity-30" aria-hidden />
            Escolha uma conversa.
          </div>
        )}
      </section>
    </div>
  );
}

function ItemDaLista({ conversa, ativa, agora, onAbrir }: { conversa: ConversaResumo; ativa: boolean; agora: number; onAbrir: () => void }) {
  const esperando = conversa.minutosEsperando != null;
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={ativa || undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        ativa ? "bg-accent" : "hover:bg-muted"
      )}
    >
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
        {iniciais(conversa.nomeResponsavel)}
        {esperando && (
          <span
            aria-hidden
            className={cn(
              "absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-card",
              conversa.nivelDaEspera === "Estourado" ? "bg-destructive" : "bg-action"
            )}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[14px] font-semibold">{conversa.nomeResponsavel}</span>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {tempoDesde(conversa.ultimaMensagemEm, agora)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-[13px]", esperando ? "font-medium text-foreground" : "text-muted-foreground")}>
            {conversa.ultimaDirecao === "Enviada" && "Você: "}
            {conversa.ultimaMensagem}
          </span>
          {esperando && (
            <span className="ml-auto shrink-0 text-[11px] font-semibold text-action">{esperaEmTexto(conversa.minutosEsperando!)}</span>
          )}
        </span>
      </span>
    </button>
  );
}

function ConversaAberta({ leadId, onVoltar }: { leadId: string; onVoltar: () => void }) {
  const { data: conversa, isLoading, isError, dataUpdatedAt } = useConversa(leadId);
  const mudar = useAssumirConversa(leadId);
  const fim = useRef<HTMLDivElement>(null);
  const ultima = conversa?.mensagens.at(-1)?.id;

  // Desce até a última mensagem quando chega uma nova, não a cada releitura.
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [ultima]);

  const porDia = useMemo(() => {
    const grupos: { dia: string; mensagens: Mensagem[] }[] = [];
    for (const m of conversa?.mensagens ?? []) {
      const dia = rotuloDoDia(m.ocorridaEm);
      if (grupos.at(-1)?.dia === dia) grupos.at(-1)!.mensagens.push(m);
      else grupos.push({ dia, mensagens: [m] });
    }
    return grupos;
  }, [conversa?.mensagens]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-12 w-60 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-52 rounded-2xl" />
        <Skeleton className="h-16 w-64 rounded-2xl" />
      </div>
    );
  }
  if (isError || !conversa) {
    return <p className="p-6 text-sm text-muted-foreground">Não foi possível abrir esta conversa.</p>;
  }

  const lead = conversa.lead;

  async function assumir() {
    try {
      await mudar.mutateAsync("assumir");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível assumir.");
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-foreground/[.07] bg-card/80 px-3 py-2.5 backdrop-blur-xl">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Voltar para a lista" onClick={onVoltar}>
          <ChevronLeft />
        </Button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
          {iniciais(lead.nomeResponsavel)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{lead.nomeResponsavel}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: COR_DA_ETAPA[lead.etapa] }} aria-hidden />
            {TITULO_PADRAO_DA_ETAPA[lead.etapa]}
            {lead.nomeCrianca && ` · ${lead.nomeCrianca}`}
            {` · ${lead.telefoneFormatado}`}
          </p>
        </div>
        {lead.atendimento === "Assistente" && (
          <Button variant="outline" size="sm" onClick={assumir} disabled={mudar.isPending}>
            Assumir conversa
          </Button>
        )}
      </header>

      {lead.minutosEsperando != null && (
        <p className="border-b border-action-border bg-action-soft px-4 py-2 text-[12.5px] font-medium text-action-soft-foreground">
          A família espera resposta {esperaEmTexto(lead.minutosEsperando)}.
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
        {porDia.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem com esta família ainda.</p>
        )}
        <div className="flex flex-col gap-1.5">
          {porDia.map((grupo) => (
            <Fragment key={grupo.dia}>
              <p className="my-2 self-center rounded-full bg-card/90 px-3 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-[0_1px_1px_rgba(42,37,48,.06)]">
                {grupo.dia}
              </p>
              {grupo.mensagens.map((m) => (
                <BolhaDeMensagem key={m.id} mensagem={m} />
              ))}
            </Fragment>
          ))}
        </div>
        <div ref={fim} />
      </div>

      <CaixaDeEnvio conversa={conversa} agora={dataUpdatedAt} />
    </>
  );
}
