"use client";

import { useState } from "react";
import { ChevronDown, Gavel, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import { formatarNota, useConfiguracaoDeDesempenho } from "@/lib/rh/use-desempenho";
import { ROTULO_DA_RECOMENDACAO, useParecer, type Parecer } from "@/lib/rh/use-parecer";
import { cn } from "@/lib/utils";

import { ErroDeCarga } from "../campo";
import { DialogoDeDecisao } from "./dialogo-de-decisao";
import { SeloDoParecer } from "./selo-do-parecer";

const FRASE: Record<string, string> = {
  Manter: "Os números e os fatos recentes não pedem nenhuma providência.",
  Acompanhar: "Há sinais que merecem atenção; vale olhar de perto e rever em breve.",
  PlanoDeMelhoria: "O desempenho pede um plano de melhoria, com metas e prazo.",
  AvaliarDesligamento: "O plano de melhoria não foi cumprido ou há advertências graves: a direção deve avaliar a permanência.",
};

const PESO: Record<string, string> = { alto: "bg-destructive", medio: "bg-action-brand", baixo: "bg-muted-foreground" };

/** Regras do parecer em português claro, com os limites lidos das faixas da escola (nada de 50/70 fixo). */
function ComoOParecerECalculado() {
  const { data } = useConfiguracaoDeDesempenho();
  const faixas = [...(data?.faixas ?? [])].sort((a, b) => b.minimo - a.minimo);
  const atencao = faixas.length >= 2 ? faixas[faixas.length - 2].minimo : null;
  const esperado = faixas.length >= 2 ? faixas[1].minimo : null;
  const nomeAtencao = faixas.length ? faixas[faixas.length - 1].nome : "mais baixa";
  const txtAtencao = atencao != null ? `abaixo de ${formatarNota(atencao)} (faixa "${nomeAtencao}")` : `na faixa "${nomeAtencao}"`;
  const txtEsperado = esperado != null ? `abaixo de ${formatarNota(esperado)}` : "abaixo do esperado";

  return (
    <ol className="grid list-decimal gap-1.5 pl-5 text-[13px] leading-snug text-muted-foreground">
      <li>
        <strong className="text-foreground">Pouco histórico:</strong> com menos de 3 notas mensais fechadas, o parecer é &quot;Acompanhar&quot; e
        avisa que está pouco firme. Advertência grave ainda conta.
      </li>
      <li>
        <strong className="text-foreground">Avaliar desligamento:</strong> um plano de melhoria não cumprido nos últimos 12 meses, ou 2 ou
        mais advertências graves (suspensão conta como grave) nos últimos 12 meses.
      </li>
      <li>
        <strong className="text-foreground">Plano de melhoria</strong> (se não há plano em andamento): média de 6 meses {txtAtencao}; ou 3
        meses seguidos nessa faixa; ou queda de 15 pontos ou mais entre os 3 meses mais recentes e os 3 anteriores, com a nota atual{" "}
        {txtEsperado}; ou 1 advertência grave nos últimos 6 meses.
      </li>
      <li>
        <strong className="text-foreground">Acompanhar:</strong> plano em andamento; nota atual {txtEsperado}; queda de 10 pontos ou mais;
        qualquer advertência nos últimos 6 meses; ou decisão &quot;Acompanhar&quot; cuja revisão ainda não chegou.
      </li>
      <li>
        <strong className="text-foreground">Manter:</strong> nenhuma das anteriores.
      </li>
    </ol>
  );
}

function Provas({ parecer }: { parecer: Parecer }) {
  if (parecer.provas.length === 0) return null;
  return (
    <div className="grid gap-1">
      <p className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">Provas</p>
      <ul className="divide-y divide-border">
        {parecer.provas.map((p, i) => (
          <li key={`${p.tipo}-${p.data ?? ""}-${i}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2 py-1 text-[13px] leading-snug">
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{p.data != null ? formatarSoData(p.data) : ""}</span>
            <span className="min-w-0 break-words">
              <span className="font-medium">{p.titulo}</span>
              {p.detalhe != null && <span className="text-muted-foreground"> · {p.detalhe}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cartão "Parecer de permanência", no topo da aba Desempenho: a recomendação do sistema com as provas, o aviso de que
 * quem decide é a direção (LGPD, art. 20) e o botão para registrar a decisão. Só a gestão chega aqui.
 */
export function CartaoDeParecer({
  funcionarioId,
  podeDecidir,
  onDesligar,
}: {
  funcionarioId: string;
  /** Escrita no RH: quem só lê vê o parecer, mas não registra decisão. */
  podeDecidir: boolean;
  onDesligar?: () => void;
}) {
  const { data, isLoading, isError, refetch } = useParecer(funcionarioId);
  const [aberto, setAberto] = useState(false);
  const [dialogo, setDialogo] = useState(false);

  if (isError) return <ErroDeCarga texto="Não foi possível carregar o parecer de permanência." onTentar={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-40 w-full rounded-xl" />;

  const parecer = data;
  const ultima = parecer.ultimaDecisao;

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4" aria-label="Parecer de permanência">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">Parecer de permanência</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SeloDoParecer recomendacao={parecer.recomendacao} className="h-8 px-3 text-sm" />
            {parecer.revisaoVencida && <Badge variant="overdue">Revisão vencida</Badge>}
          </div>
          <p className="mt-1.5 text-[13px] leading-snug">{FRASE[parecer.recomendacao] ?? ROTULO_DA_RECOMENDACAO[parecer.recomendacao]}</p>
        </div>
        {podeDecidir && (
          <Button variant="action" className="w-full sm:w-auto" onClick={() => setDialogo(true)}>
            <Gavel /> Registrar decisão
          </Button>
        )}
      </div>

      {parecer.poucoHistorico && (
        <p className="rounded-lg bg-accent px-3 py-2 text-[13px] text-accent-foreground">
          Ainda não há 3 meses de notas fechadas; o parecer fica mais firme com o tempo.
        </p>
      )}
      {parecer.revisaoVencida && (
        <p className="rounded-lg bg-destructive-soft px-3 py-2 text-[13px] text-destructive-soft-foreground">
          A revisão marcada na última decisão
          {ultima?.proximaRevisaoEm != null ? ` (${formatarSoData(ultima.proximaRevisaoEm)})` : ""} já passou. Reveja o caso e registre uma nova decisão.
        </p>
      )}

      {parecer.motivos.length > 0 && (
        <div className="grid gap-1">
          <p className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">Por quê</p>
          <ul className="grid gap-1">
            {parecer.motivos.map((m, i) => (
              <li key={`${m.regra}-${i}`} className="flex items-start gap-2 text-[13px] leading-snug">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PESO[m.peso] ?? "bg-muted-foreground")} title={`Peso ${m.peso}`} />
                <span className="min-w-0 break-words">{m.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Provas parecer={parecer} />

      {(ultima != null || parecer.planoEmAndamento != null) && (
        <p className="text-xs text-muted-foreground">
          {ultima != null && (
            <>
              Última decisão: <span className="font-medium text-foreground">{ultima.decisao === "PlanoDeMelhoria" ? "Plano de melhoria" : ultima.decisao}</span>{" "}
              em {formatarSoData(ultima.data)}
              {ultima.proximaRevisaoEm != null && `, revisão em ${formatarSoData(ultima.proximaRevisaoEm)}`}.{" "}
            </>
          )}
          {parecer.planoEmAndamento != null && <>Plano em andamento até {formatarSoData(parecer.planoEmAndamento.fim)}.</>}
        </p>
      )}

      <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] leading-snug text-muted-foreground">
        <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>O sistema recomenda; a decisão é da direção e fica registrada. A pessoa pode pedir revisão (LGPD, art. 20).</span>
      </p>

      <div>
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", aberto && "rotate-180")} aria-hidden />
          Como o parecer é calculado
        </button>
        {aberto && (
          <div className="mt-2">
            <ComoOParecerECalculado />
          </div>
        )}
      </div>

      {dialogo && <DialogoDeDecisao funcionarioId={funcionarioId} parecer={parecer} onFechar={() => setDialogo(false)} onDesligar={onDesligar} />}
    </section>
  );
}
