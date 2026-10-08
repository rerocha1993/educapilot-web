"use client";

import { useState } from "react";
import { ChevronDown, Lock, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FerramentaDoFuncionamento, TravaDoFuncionamento } from "@/lib/matriculas/tipos";
import { cn } from "@/lib/utils";
import { LinkDeEdicao, Rotulo } from "./partes";

// ------------------------------------------------------------------ ferramentas

function Ferramenta({ f }: { f: FerramentaDoFuncionamento }) {
  const [aberto, setAberto] = useState(false);
  const destino = f.motivo?.includes("agenda")
    ? { href: "/matriculas/agenda", rotulo: "Configurar a agenda" }
    : { href: "/matriculas/materiais", rotulo: "Cadastrar materiais" };

  return (
    <li className={cn("flex min-w-0 flex-col rounded-[20px] border bg-card p-4", f.disponivel ? "border-border" : "border-dashed border-border-dashed bg-card/60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="min-w-0 break-all rounded-md bg-muted px-2 py-0.5 font-mono text-[13px] font-semibold">{f.nome}</code>
        <Badge variant={f.disponivel ? "success" : "waiting"}>{f.disponivel ? "Disponível" : "Indisponível"}</Badge>
      </div>
      <p className="mt-3 break-words text-[13.5px] leading-relaxed">{f.descricao}</p>

      {!f.disponivel && f.motivo && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-muted/70 p-3 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0">{f.motivo}</p>
          <LinkDeEdicao href={destino.href}>{destino.rotulo}</LinkDeEdicao>
        </div>
      )}

      {f.parametros.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setAberto((a) => !a)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-[13px] font-semibold hover:text-action-soft-foreground max-md:min-h-10"
          >
            <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} aria-hidden />
            {f.parametros.length === 1 ? "1 informação que ela passa" : `${f.parametros.length} informações que ela passa`}
          </button>
          {aberto && (
            <dl className="mt-2 flex flex-col gap-3 border-l-2 border-border pl-4">
              {f.parametros.map((p) => (
                <div key={p.nome} className="min-w-0">
                  <dt className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <code className="font-mono text-[12.5px] font-semibold">{p.nome}</code>
                    <span className="text-[12px] text-muted-foreground">{p.tipo}</span>
                    {p.obrigatorio && <Badge variant="pending">obrigatório</Badge>}
                  </dt>
                  {p.descricao && <dd className="mt-1 break-words text-[13px] leading-relaxed text-secondary-foreground">{p.descricao}</dd>}
                  {p.valores.length > 0 && (
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.valores.map((v) => (
                        <code key={v} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
                          {v}
                        </code>
                      ))}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

export function Ferramentas({ ferramentas }: { ferramentas: FerramentaDoFuncionamento[] }) {
  const disponiveis = ferramentas.filter((f) => f.disponivel).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{disponiveis}</span> de{" "}
        <span className="tabular-nums">{ferramentas.length}</span> ferramentas nas mãos dela hoje.
      </p>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {ferramentas.map((f) => (
          <Ferramenta key={f.nome} f={f} />
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ travas

const GRUPOS_DE_TRAVA: { tipo: TravaDoFuncionamento["tipo"]; titulo: string; descricao: string }[] = [
  {
    tipo: "reescreve",
    titulo: "Mandam ela reescrever",
    descricao: "Se a resposta quebra uma destas regras, ela não sai: volta para a assistente refazer, uma vez por problema.",
  },
  {
    tipo: "ajusta",
    titulo: "Corrigem o texto sozinhas",
    descricao: "Ajustes mecânicos, feitos pelo sistema na última passada, sem pedir nada ao modelo.",
  },
  {
    tipo: "estrutura",
    titulo: "Regras de envio",
    descricao: "Como a resposta é montada e quando ela não pode sair.",
  },
];

function Trava({ t }: { t: TravaDoFuncionamento }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Lock className="size-3.5" aria-hidden />
        </span>
        <h4 className="min-w-0 break-words font-heading text-[15px] font-semibold leading-snug">{t.titulo}</h4>
      </div>
      <div>
        <Rotulo>O que confere</Rotulo>
        <p className="mt-1 break-words text-[13.5px] leading-relaxed">{t.oQueConfere}</p>
      </div>
      <div className="flex gap-2.5 rounded-xl bg-muted/60 p-3">
        <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <Rotulo>Por que existe</Rotulo>
          <p className="mt-1 break-words text-[13px] leading-relaxed text-secondary-foreground">{t.porQue}</p>
        </div>
      </div>
    </li>
  );
}

export function Travas({ travas }: { travas: TravaDoFuncionamento[] }) {
  return (
    <div className="flex flex-col gap-8">
      {GRUPOS_DE_TRAVA.map((g) => {
        const doGrupo = travas.filter((t) => t.tipo === g.tipo);
        if (doGrupo.length === 0) return null;
        return (
          <div key={g.tipo} className="min-w-0">
            <div className="mb-3">
              <h3 className="font-heading text-[17px] font-semibold tracking-[-.01em]">{g.titulo}</h3>
              <p className="text-[13px] text-muted-foreground">{g.descricao}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {doGrupo.map((t) => (
                <Trava key={t.chave} t={t} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
