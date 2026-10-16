"use client";

import { useState } from "react";
import { Lock, MessageSquareText, RefreshCw } from "lucide-react";

import { GradeDeFotos } from "@/components/relacionamento/grade-de-fotos";
import { VisualizadorDeFotos } from "@/components/relacionamento/visualizador-de-fotos";
import { baixarFotoDoDiarioDaFamilia } from "@/lib/relacionamento/api";
import {
  ICONE_DO_TIPO,
  ROTULO_DO_TIPO,
  duracaoLegivel,
  rotuloDaAceitacao,
  rotuloDoSubtipo,
  temperaturaLegivel,
  type TipoDeRegistro,
} from "@/lib/relacionamento/diario-vocabulario";
import type { RegistroDoDiario } from "@/lib/relacionamento/use-diario";
import type { DiarioDaFamilia } from "@/lib/relacionamento/use-portal-diario";
import { cn } from "@/lib/utils";

/** Uma linha da linha do tempo: a hora (ou faixa de horas), o que aconteceu e, às vezes, um tom. */
interface Linha {
  chave: string;
  hora: string;
  texto: string;
  tom?: string;
}

const TOM_DA_ACEITACAO: Record<string, string> = {
  Recusou: "bg-destructive",
  Pouco: "bg-warning-soft-foreground",
  Metade: "bg-warning-soft-foreground/70",
  Bem: "bg-success-soft-foreground/70",
  Tudo: "bg-success-soft-foreground",
};

function descrever(r: RegistroDoDiario): Linha {
  const base = { chave: r.id, hora: r.horaInicio ?? "" };

  switch (r.tipo) {
    case "Alimentacao":
      return { ...base, hora: "", texto: `${rotuloDoSubtipo("Alimentacao", r.subtipo)} · ${rotuloDaAceitacao(r.nivel)}`, tom: TOM_DA_ACEITACAO[r.nivel ?? ""] };
    case "Sono": {
      const duracao = duracaoLegivel(r.duracaoMinutos);
      return {
        ...base,
        hora: r.horaFim ? `${r.horaInicio}–${r.horaFim}` : (r.horaInicio ?? ""),
        texto: duracao ? `Dormiu ${duracao}` : "Começou a dormir",
      };
    }
    case "Saude":
      if (r.subtipo === "Temperatura") return { ...base, texto: `Temperatura ${temperaturaLegivel(r.valor)}` };
      if (r.subtipo === "Medicamento") return { ...base, texto: `${r.texto ?? "Medicamento"}${r.dose ? ` · ${r.dose}` : ""}` };
      return { ...base, hora: "", texto: r.texto ?? "Observação" };
    case "Reposicao":
      return { ...base, hora: "", texto: r.subtipo === "Outro" ? (r.texto ?? "Outro") : rotuloDoSubtipo("Reposicao", r.subtipo) };
    case "Recado":
      return { ...base, hora: "", texto: r.texto ?? "" };
    default:
      return { ...base, texto: `${rotuloDoSubtipo(r.tipo, r.subtipo)}${r.texto ? ` · ${r.texto}` : ""}` };
  }
}

/** Dentro de um bloco: com hora, por hora; sem hora, na ordem em que o servidor mandou. */
function ordenar(linhas: Linha[]): Linha[] {
  return [...linhas].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
}

const ORDEM: TipoDeRegistro[] = ["Alimentacao", "Sono", "Higiene", "Humor", "Saude", "Reposicao", "Recado"];

/**
 * O dia da criança, bloco a bloco: um ícone, o nome do bloco e, embaixo, as linhas com a hora à
 * esquerda. Só aparecem os blocos que a escola preencheu. Saúde leva um cadeado: é um dado
 * sensível, e só o responsável do aluno vê.
 */
export function LinhaDoTempoDoDiario({ registros }: { registros: readonly RegistroDoDiario[] }) {
  const blocos = ORDEM.map((tipo) => ({ tipo, registros: registros.filter((r) => r.tipo === tipo) })).filter((b) => b.registros.length > 0);
  if (blocos.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {blocos.map(({ tipo, registros: itens }) => {
        const Icone = ICONE_DO_TIPO[tipo];
        const linhas = tipo === "Alimentacao" ? itens.map(descrever) : ordenar(itens.map(descrever));
        return (
          <li key={tipo} className="flex gap-3 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Icone aria-hidden className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
                {ROTULO_DO_TIPO[tipo]}
                {tipo === "Saude" && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
                    <Lock aria-hidden className="size-3" /> só você e a escola veem
                  </span>
                )}
              </h3>
              <ul className="mt-1 flex flex-col gap-1">
                {linhas.map((l) => (
                  <li key={l.chave} className="flex items-baseline gap-2 text-[14px] leading-snug">
                    <span className="w-[4.6rem] shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{l.hora}</span>
                    {l.tom && <span aria-hidden className={cn("size-2 shrink-0 translate-y-px self-center rounded-full", l.tom)} />}
                    <span className="min-w-0 break-words">{l.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * O diário publicado de um dia: recado em destaque, a linha do tempo e as fotos. Quando a escola
 * edita depois de publicar, a etiqueta "Atualizado" avisa.
 */
export function CartaoDoDiario({ diario }: { diario: DiarioDaFamilia }) {
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <article className="flex flex-col gap-3">
      {diario.atualizado && (
        <p className="inline-flex w-max items-center gap-1 rounded-md bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-soft-foreground">
          <RefreshCw aria-hidden className="size-3" /> Atualizado pela escola
        </p>
      )}

      {diario.recadoGeral && (
        <section aria-label="Recado da escola" className="rounded-xl border border-action-border bg-action-soft p-3 text-action-soft-foreground">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
            <MessageSquareText aria-hidden className="size-4" /> Recado da escola
          </h3>
          <p className="mt-1 text-[14.5px] leading-[1.55] break-words whitespace-pre-line">{diario.recadoGeral}</p>
        </section>
      )}

      <LinhaDoTempoDoDiario registros={diario.registros} />

      {diario.fotos.length > 0 && (
        <section aria-label="Fotos do dia" className="flex flex-col gap-2">
          <h3 className="font-heading text-[15px] font-semibold">Fotos do dia</h3>
          <GradeDeFotos fotos={diario.fotos} baixar={baixarFotoDoDiarioDaFamilia} onAbrir={setAberta} />
          <VisualizadorDeFotos
            fotos={diario.fotos}
            indice={aberta}
            baixar={baixarFotoDoDiarioDaFamilia}
            onMudar={setAberta}
            onFechar={() => setAberta(null)}
          />
        </section>
      )}

      {diario.registros.length === 0 && !diario.recadoGeral && diario.fotos.length === 0 && (
        <p className="text-sm text-muted-foreground">A escola publicou este dia sem registros.</p>
      )}
    </article>
  );
}
