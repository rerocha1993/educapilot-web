"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FluxoDoFuncionamento, ModeloDoFluxo } from "@/lib/matriculas/tipos";
import { cn } from "@/lib/utils";
import { irPara, LinkDeEdicao, Rotulo } from "./partes";

const GRUPOS: { chave: FluxoDoFuncionamento["grupo"]; titulo: string; descricao: string }[] = [
  { chave: "conversa", titulo: "Na conversa", descricao: "Do primeiro oi até a família que parou de responder." },
  { chave: "familia", titulo: "Visita e contato com a família", descricao: "O que a escola manda sozinha antes e depois da visita." },
  { chave: "equipe", titulo: "Avisos para a equipe", descricao: "O que chega para a direção, por e-mail ou WhatsApp." },
];

/** Onde se liga, desliga ou ajusta cada fluxo. */
const ONDE_EDITAR: Record<string, { href: string; rotulo: string }> = {
  atendimento: { href: "/matriculas/assistente", rotulo: "Editar na Assistente" },
  janela_de_contato: { href: "/matriculas/assistente", rotulo: "Horário na Assistente" },
};
const CONFIGURACAO = { href: "/matriculas/configuracao", rotulo: "Editar na Configuração" };

function pilulaDoFluxo(f: FluxoDoFuncionamento) {
  if (!f.temInterruptor) return { variante: "success" as const, texto: "Sempre ativo" };
  if (!f.ligado) return { variante: "waiting" as const, texto: "Desligado" };
  if (f.pendencias.length > 0) return { variante: "pending" as const, texto: "Ligado, com pendência" };
  return { variante: "success" as const, texto: "Ligado" };
}

function PilulaDeModelo({ m }: { m: ModeloDoFluxo }) {
  const variante = m.aprovado
    ? "success"
    : m.situacao === "Em análise"
      ? "pending"
      : m.situacao === "Recusado" || m.situacao === "Pausado" || m.situacao === "Desativado"
        ? "overdue"
        : "waiting";
  return (
    <li className="flex max-w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 py-1 pr-1 pl-2.5">
      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 truncate font-mono text-[12px]">{m.nome}</span>
      <Badge variant={variante}>{m.situacao}</Badge>
    </li>
  );
}

// ------------------------------------------------------------------ o mapa

/** Um passo do mapa: ou um fluxo (clicável, com a cor do estado) ou um marco que não é fluxo. */
type Passo = { chave?: string; rotulo: string };

const CAMINHOS: { titulo: string; passos: Passo[] }[] = [
  {
    titulo: "A família escreve e depois some",
    passos: [
      { rotulo: "Família escreve" },
      { chave: "atendimento", rotulo: "Assistente responde" },
      { chave: "repescagem", rotulo: "Repescagem" },
      { chave: "ciclo_de_7_dias", rotulo: "Ciclo de 7 dias" },
      { chave: "chamar_novamente", rotulo: "Chamar novamente" },
      { chave: "perdido_por_silencio", rotulo: "Perdido por silêncio" },
    ],
  },
  {
    titulo: "A visita",
    passos: [
      { rotulo: "Visita marcada" },
      { chave: "lembretes", rotulo: "Lembretes" },
      { rotulo: "Visita" },
      { chave: "briefing", rotulo: "Briefing" },
      { chave: "toques_pos_visita", rotulo: "Toques depois" },
      { chave: "reagendamento", rotulo: "Reagendamento" },
    ],
  },
  {
    titulo: "A equipe demora",
    passos: [
      { rotulo: "Equipe assume" },
      { chave: "alerta_de_espera", rotulo: "Alerta de espera" },
      { chave: "resposta_pendente", rotulo: "Resposta pendente" },
    ],
  },
];

function Mapa({ fluxos }: { fluxos: FluxoDoFuncionamento[] }) {
  const porChave = new Map(fluxos.map((f) => [f.chave, f]));
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[15px] font-semibold">O mapa</h3>
        <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" /> Ligado
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/40" /> Desligado
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-dashed border-muted-foreground/60" /> Marco, não é automação
          </li>
        </ul>
      </div>
      {CAMINHOS.map((c) => (
        <div key={c.titulo} className="min-w-0">
          <Rotulo className="mb-2">{c.titulo}</Rotulo>
          <ol className="flex flex-wrap items-center gap-y-2">
            {c.passos.map((p, i) => {
              const fluxo = p.chave ? porChave.get(p.chave) : undefined;
              const ligado = fluxo ? fluxo.ligado : undefined;
              return (
                <li key={p.rotulo} className="flex items-center">
                  {i > 0 && <ChevronRight className="mx-1 size-4 shrink-0 text-muted-foreground/60" aria-hidden />}
                  {fluxo ? (
                    <button
                      type="button"
                      onClick={() => irPara(`fluxo-${fluxo.chave}`)}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors max-md:min-h-10",
                        ligado
                          ? "border-success-border bg-success-soft text-success-soft-foreground hover:bg-success-soft/70"
                          : "border-border bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className={cn("size-2 rounded-full", ligado ? "bg-success" : "bg-muted-foreground/40")} />
                      {p.rotulo}
                    </button>
                  ) : (
                    <span className="inline-flex min-h-9 items-center rounded-full border border-dashed border-muted-foreground/40 px-3 text-[13px] text-muted-foreground">
                      {p.rotulo}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      <p className="text-[12.5px] text-muted-foreground">Toque em uma etapa para ir direto ao detalhe dela.</p>
    </div>
  );
}

// ------------------------------------------------------------------ um fluxo

function Fluxo({ f, aberto, aoAlternar, ultimo }: { f: FluxoDoFuncionamento; aberto: boolean; aoAlternar: () => void; ultimo: boolean }) {
  const pilula = pilulaDoFluxo(f);
  const ativo = !f.temInterruptor || f.ligado;
  const editar = ONDE_EDITAR[f.chave] ?? CONFIGURACAO;
  const semModeloAprovado = f.modelos.some((m) => !m.aprovado);

  return (
    <li id={`fluxo-${f.chave}`} className="relative scroll-mt-20 pl-9">
      {/* o trilho da linha do tempo */}
      <span aria-hidden className={cn("absolute top-6 left-[11px] w-px bg-muted-foreground/25", ultimo ? "h-0" : "-bottom-4")} />
      <span
        aria-hidden
        className={cn(
          "absolute top-[18px] left-0 grid size-6 place-items-center rounded-full ring-4 ring-background",
          ativo ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <span className={cn("size-2 rounded-full", ativo ? "bg-success-foreground" : "bg-muted-foreground/50")} />
      </span>

      <article className={cn("min-w-0 rounded-[20px] border bg-card p-4 sm:p-5", ativo ? "border-border" : "border-border bg-card/60")}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="font-heading text-base font-semibold leading-tight">{f.nome}</h4>
            <Badge variant={pilula.variante}>{pilula.texto}</Badge>
          </div>
          <LinkDeEdicao href={editar.href}>{editar.rotulo}</LinkDeEdicao>
        </div>

        <p className="mt-2.5 flex items-start gap-2 text-[13px] font-medium text-action-soft-foreground">
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{f.quando}</span>
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed">{f.oQueFaz}</p>

        {f.regras.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={aberto}
              onClick={aoAlternar}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-[13px] font-semibold text-foreground hover:text-action-soft-foreground max-md:min-h-10"
            >
              <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} aria-hidden />
              {aberto ? "Esconder as regras" : `Ver as ${f.regras.length} regras`}
            </button>
            {aberto && (
              <ul className="mt-2 flex flex-col gap-2 border-l-2 border-border pl-4">
                {f.regras.map((r) => (
                  <li key={r} className="break-words text-[13.5px] leading-relaxed text-secondary-foreground">
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {f.modelos.length > 0 && (
          <div className="mt-4">
            <Rotulo className="mb-2">Modelos de WhatsApp que usa</Rotulo>
            <ul className="flex flex-wrap gap-2">
              {f.modelos.map((m) => (
                <PilulaDeModelo key={m.nome} m={m} />
              ))}
            </ul>
            {semModeloAprovado && (
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                A Meta só deixa a escola puxar conversa fora das 24 horas por modelo aprovado.{" "}
                <Link href="/matriculas/whatsapp" className="font-medium text-foreground underline underline-offset-2">
                  Ver na aba WhatsApp
                </Link>
              </p>
            )}
          </div>
        )}

        {f.pendencias.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-[13px] text-warning-soft-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="min-w-0 break-words">Para funcionar: {f.pendencias.join("; ")}.</p>
          </div>
        )}
      </article>
    </li>
  );
}

export function Fluxos({ fluxos }: { fluxos: FluxoDoFuncionamento[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(["atendimento"]));
  const todasAbertas = fluxos.filter((f) => f.regras.length > 0).every((f) => abertos.has(f.chave));

  function alternar(chave: string) {
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Mapa fluxos={fluxos} />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAbertos(todasAbertas ? new Set() : new Set(fluxos.map((f) => f.chave)))}
        >
          {todasAbertas ? "Recolher todas as regras" : "Abrir todas as regras"}
        </Button>
      </div>

      {GRUPOS.map((g) => {
        const doGrupo = fluxos.filter((f) => f.grupo === g.chave);
        if (doGrupo.length === 0) return null;
        return (
          <div key={g.chave} className="min-w-0">
            <div className="mb-3">
              <h3 className="font-heading text-[17px] font-semibold tracking-[-.01em]">{g.titulo}</h3>
              <p className="text-[13px] text-muted-foreground">{g.descricao}</p>
            </div>
            <ol className="flex flex-col gap-4">
              {doGrupo.map((f, i) => (
                <Fluxo
                  key={f.chave}
                  f={f}
                  aberto={abertos.has(f.chave)}
                  aoAlternar={() => alternar(f.chave)}
                  ultimo={i === doGrupo.length - 1}
                />
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
