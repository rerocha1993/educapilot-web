"use client";

import type { ReactNode } from "react";
import { Lock, Plus, X } from "lucide-react";

import { horaAgora } from "@/components/relacionamento/diario/comum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { novoItem, type Item } from "@/lib/relacionamento/diario-edicao";
import {
  ACEITACOES,
  HIGIENES,
  HUMORES,
  REFEICOES,
  REPOSICOES,
  duracaoLegivel,
  minutosEntre,
  rotuloDoSubtipo,
} from "@/lib/relacionamento/diario-vocabulario";
import { cn } from "@/lib/utils";

/**
 * Os editores de cada bloco do diário. Todos recebem a lista de linhas do bloco e devolvem a
 * lista nova por `onChange`: quem guarda o estado (e decide quando gravar) é o painel do aluno.
 *
 * Chips e botões têm 40px de altura no celular (a professora lança com uma mão) e ficam
 * compactos no computador. A cor nunca vai sozinha: o rótulo de cada opção está sempre escrito.
 */

type Muda = (itens: Item[]) => void;

const TOM_DA_ACEITACAO: Record<string, string> = {
  Recusou: "bg-destructive-soft text-destructive-soft-foreground border-destructive-border",
  Pouco: "bg-warning-soft text-warning-soft-foreground border-warning-border",
  Metade: "bg-warning-soft text-warning-soft-foreground border-warning-border",
  Bem: "bg-success-soft text-success-soft-foreground border-success-border",
  Tudo: "bg-success-soft text-success-soft-foreground border-success-border",
};

export function Chip({
  ativo,
  onClick,
  children,
  tom,
  className,
  disabled,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Classe de cor quando ativo (padrão: primária). */
  tom?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-full border px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 md:min-h-8",
        ativo ? (tom ?? "border-primary bg-primary text-primary-foreground") : "border-input bg-card text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function BotaoRemover({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:size-8"
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}

// ------------------------------------------------------------------ alimentação

/** Uma linha por refeição; o toque na aceitação grava, e o mesmo toque de novo limpa. */
export function EditorDeAlimentacao({ itens, onChange }: { itens: Item[]; onChange: Muda }) {
  function escolher(refeicao: string, nivel: string) {
    const atual = itens.find((i) => i.subtipo === refeicao);
    const sem = itens.filter((i) => i.subtipo !== refeicao);
    if (atual?.nivel === nivel) onChange(sem);
    else onChange([...sem, novoItem({ subtipo: refeicao, nivel })]);
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {REFEICOES.map((r) => {
        const atual = itens.find((i) => i.subtipo === r.id);
        return (
          <li key={r.id} className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:items-center">
            <span id={`ref-${r.id}`} className="text-[13px] font-medium">
              {r.rotulo}
            </span>
            <div role="group" aria-labelledby={`ref-${r.id}`} className="grid grid-cols-5 gap-1">
              {ACEITACOES.map((a) => {
                const ativo = atual?.nivel === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => escolher(r.id, a.id)}
                    className={cn(
                      "min-h-10 rounded-md border px-0.5 text-[12px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8",
                      ativo ? cn(TOM_DA_ACEITACAO[a.id], "font-bold") : "border-input bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {a.rotulo}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ sono

export function EditorDeSono({ itens, onChange }: { itens: Item[]; onChange: Muda }) {
  const muda = (chave: string, parcial: Partial<Item>) => onChange(itens.map((i) => (i.chave === chave ? { ...i, ...parcial } : i)));

  return (
    <div className="flex flex-col gap-2">
      {itens.length === 0 && <p className="text-[13px] text-muted-foreground">Nenhum sono lançado.</p>}
      {itens.map((i, n) => {
        const minutos = minutosEntre(i.horaInicio, i.horaFim);
        const invertido = !!i.horaInicio && !!i.horaFim && minutos === null;
        return (
          <div key={i.chave} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
              Começou
              <Input type="time" value={i.horaInicio} onChange={(e) => muda(i.chave, { horaInicio: e.target.value })} className="w-[7.5rem]" />
            </label>
            <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
              Acordou
              <Input
                type="time"
                value={i.horaFim}
                aria-invalid={invertido || undefined}
                onChange={(e) => muda(i.chave, { horaFim: e.target.value })}
                className="w-[7.5rem]"
              />
            </label>
            <span className="min-h-10 self-end pb-2 text-[13px] font-medium tabular-nums md:min-h-0 md:pb-1.5">
              {invertido ? <span className="text-destructive">Fim antes do começo</span> : duracaoLegivel(minutos)}
            </span>
            <BotaoRemover rotulo={`Remover o sono ${n + 1}`} onClick={() => onChange(itens.filter((x) => x.chave !== i.chave))} />
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-max"
        onClick={() => onChange([...itens, novoItem({ horaInicio: itens.length === 0 ? "13:00" : "", horaFim: "" })])}
      >
        <Plus /> {itens.length === 0 ? "Lançar sono" : "Outra soneca"}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ higiene e humor

/**
 * Botões de um toque que acrescentam uma linha com a hora do toque (e o número de vezes no botão).
 * Abaixo, as linhas do dia, cada uma com a hora e o botão de remover. `unico` faz o toque alternar
 * (humor: ou tem, ou não tem).
 */
function ContadorDeOcorrencias({
  tipo,
  opcoes,
  itens,
  onChange,
  unico = false,
}: {
  tipo: "Higiene" | "Humor";
  opcoes: readonly { id: string; rotulo: string }[];
  itens: Item[];
  onChange: Muda;
  unico?: boolean;
}) {
  function tocar(id: string) {
    const existentes = itens.filter((i) => i.subtipo === id);
    if (unico && existentes.length > 0) onChange(itens.filter((i) => i.subtipo !== id));
    else onChange([...itens, novoItem({ subtipo: id, horaInicio: horaAgora() })]);
  }

  const ordenados = [...itens].sort((a, b) => (a.horaInicio || "99:99").localeCompare(b.horaInicio || "99:99"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => {
          const n = itens.filter((i) => i.subtipo === o.id).length;
          return (
            <Chip key={o.id} ativo={n > 0} onClick={() => tocar(o.id)} className="gap-1.5">
              {o.rotulo}
              {!unico && n > 0 && <span className="rounded-full bg-primary-foreground/25 px-1.5 text-[11px] tabular-nums">{n}</span>}
            </Chip>
          );
        })}
      </div>

      {!unico && ordenados.length > 0 && (
        <ul aria-label={`${tipo === "Higiene" ? "Higiene" : "Humor"} do dia`} className="flex flex-wrap gap-1">
          {ordenados.map((i) => (
            <li
              key={i.chave}
              className="inline-flex items-center gap-0.5 rounded-md bg-muted py-0.5 pr-0.5 pl-2 text-[12px] font-medium"
            >
              {rotuloDoSubtipo(tipo, i.subtipo, true)}
              <Input
                type="time"
                value={i.horaInicio}
                aria-label={`Hora de ${rotuloDoSubtipo(tipo, i.subtipo)}`}
                onChange={(e) => onChange(itens.map((x) => (x.chave === i.chave ? { ...x, horaInicio: e.target.value } : x)))}
                className="h-7 w-[5.6rem] border-0 bg-transparent px-1 text-[12px] md:h-6"
              />
              <BotaoRemover rotulo={`Remover ${rotuloDoSubtipo(tipo, i.subtipo)} das ${i.horaInicio || "sem hora"}`} onClick={() => onChange(itens.filter((x) => x.chave !== i.chave))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EditorDeHigiene({ itens, onChange, fralda }: { itens: Item[]; onChange: Muda; fralda: boolean }) {
  return (
    <ContadorDeOcorrencias
      tipo="Higiene"
      opcoes={HIGIENES.filter((h) => h.id !== "TrocaDeFralda" || fralda)}
      itens={itens}
      onChange={onChange}
    />
  );
}

export function EditorDeHumor({ itens, onChange }: { itens: Item[]; onChange: Muda }) {
  return <ContadorDeOcorrencias tipo="Humor" opcoes={HUMORES} itens={itens} onChange={onChange} unico />;
}

// ------------------------------------------------------------------ saúde

/** Dado sensível (LGPD): o aviso fica sempre visível, para ninguém copiar para onde não deve. */
export function EditorDeSaude({ itens, onChange }: { itens: Item[]; onChange: Muda }) {
  const muda = (chave: string, parcial: Partial<Item>) => onChange(itens.map((i) => (i.chave === chave ? { ...i, ...parcial } : i)));
  const remove = (chave: string) => onChange(itens.filter((i) => i.chave !== chave));

  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
        <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Dado de saúde: só a equipe do diário e os responsáveis do aluno veem. Nunca vai no aviso do celular.
      </p>

      {itens.map((i) => (
        <div key={i.chave} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-2">
          <span className="w-full text-[12px] font-semibold text-muted-foreground">{rotuloDoSubtipo("Saude", i.subtipo)}</span>

          {i.subtipo === "Temperatura" && (
            <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
              Graus
              <Input
                inputMode="decimal"
                placeholder="36,8"
                value={i.valor}
                maxLength={5}
                onChange={(e) => muda(i.chave, { valor: e.target.value })}
                className="w-24"
              />
            </label>
          )}

          {i.subtipo === "Medicamento" && (
            <>
              <label className="grid min-w-36 flex-1 gap-0.5 text-[11.5px] font-medium text-muted-foreground">
                Medicamento
                <Input value={i.texto} maxLength={120} onChange={(e) => muda(i.chave, { texto: e.target.value })} />
              </label>
              <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
                Dose
                <Input value={i.dose} maxLength={60} placeholder="5 ml" onChange={(e) => muda(i.chave, { dose: e.target.value })} className="w-28" />
              </label>
            </>
          )}

          {i.subtipo === "Observacao" && (
            <label className="grid min-w-full flex-1 gap-0.5 text-[11.5px] font-medium text-muted-foreground">
              Observação
              <Textarea value={i.texto} maxLength={500} rows={2} onChange={(e) => muda(i.chave, { texto: e.target.value })} />
            </label>
          )}

          {i.subtipo !== "Observacao" && (
            <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
              Hora
              <Input type="time" value={i.horaInicio} onChange={(e) => muda(i.chave, { horaInicio: e.target.value })} className="w-[7.5rem]" />
            </label>
          )}

          <BotaoRemover rotulo={`Remover ${rotuloDoSubtipo("Saude", i.subtipo).toLowerCase()}`} onClick={() => remove(i.chave)} />
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...itens, novoItem({ subtipo: "Temperatura", horaInicio: horaAgora() })])}>
          <Plus /> Temperatura
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...itens, novoItem({ subtipo: "Medicamento", horaInicio: horaAgora() })])}>
          <Plus /> Medicamento
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...itens, novoItem({ subtipo: "Observacao" })])}>
          <Plus /> Observação
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ reposição

export function EditorDeReposicao({ itens, onChange }: { itens: Item[]; onChange: Muda }) {
  function alternar(id: string) {
    if (itens.some((i) => i.subtipo === id)) onChange(itens.filter((i) => i.subtipo !== id));
    else onChange([...itens, novoItem({ subtipo: id })]);
  }
  const outro = itens.find((i) => i.subtipo === "Outro");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {REPOSICOES.map((r) => (
          <Chip key={r.id} ativo={itens.some((i) => i.subtipo === r.id)} onClick={() => alternar(r.id)}>
            {rotuloDoSubtipo("Reposicao", r.id, true)}
          </Chip>
        ))}
      </div>
      {outro && (
        <label className="grid gap-0.5 text-[11.5px] font-medium text-muted-foreground">
          O que precisa repor
          <Input
            value={outro.texto}
            maxLength={120}
            placeholder="Escova de dente, mochila..."
            onChange={(e) => onChange(itens.map((i) => (i.chave === outro.chave ? { ...i, texto: e.target.value } : i)))}
          />
        </label>
      )}
    </div>
  );
}
