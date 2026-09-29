"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LeadResumo } from "@/lib/matriculas/tipos";

const ATALHOS = [
  { dias: 1, rotulo: "Amanhã" },
  { dias: 3, rotulo: "3 dias" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 15, rotulo: "15 dias" },
  { dias: 30, rotulo: "30 dias" },
];

/** yyyy-MM-dd do dia em Brasília, daqui a N dias. */
function diaDaqui(dias: number): string {
  const d = new Date(Date.now() + dias * 24 * 60 * 60_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function diaDeUmIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function diaPorExtenso(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

/**
 * Arrastar para Chamar novamente pede o dia. No CRM do Colégio o card caía na coluna sem data, e ninguém
 * sabia quando a família seria procurada.
 */
export function FolhaDeRetorno({
  lead,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo | null;
  enviando: boolean;
  onConfirmar: (dia: string) => void;
  onCancelar: () => void;
}) {
  return (
    <Dialog open={!!lead} onOpenChange={(aberto) => !aberto && onCancelar()}>
      {lead && <Conteudo key={lead.id} lead={lead} enviando={enviando} onConfirmar={onConfirmar} onCancelar={onCancelar} />}
    </Dialog>
  );
}

function Conteudo({
  lead,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo;
  enviando: boolean;
  onConfirmar: (dia: string) => void;
  onCancelar: () => void;
}) {
  const hoje = diaDaqui(0);
  const [dia, setDia] = useState(() => {
    const atual = lead.retornoEm ? diaDeUmIso(lead.retornoEm) : null;
    return atual && atual >= hoje ? atual : diaDaqui(7);
  });
  const valido = dia >= hoje;
  const nome = lead.nomeResponsavel.split(" ")[0];

  return (
    <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">Chamar novamente</DialogTitle>
        <DialogDescription>
          Quando a escola volta a falar com {nome}? A mensagem sai às 9h do dia escolhido, pela assistente.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos">
        {ATALHOS.map((a) => {
          const alvo = diaDaqui(a.dias);
          return (
            <button
              key={a.dias}
              type="button"
              aria-pressed={dia === alvo}
              onClick={() => setDia(alvo)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                dia === alvo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retorno-dia">Dia</Label>
        <Input id="retorno-dia" type="date" min={hoje} value={dia} onChange={(e) => setDia(e.target.value)} required />
        {valido && <p className="text-[13px] first-letter:uppercase text-muted-foreground">{diaPorExtenso(dia)}, às 9h.</p>}
      </div>

      <p className="rounded-2xl bg-muted/70 px-3.5 py-2.5 text-[13px] text-muted-foreground">
        Se {nome} escrever antes, o card volta sozinho para Em conversa, e a assistente responde.
      </p>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button className="flex-1" disabled={!valido || enviando} onClick={() => onConfirmar(dia)}>
          {enviando ? "Marcando..." : "Marcar"}
        </Button>
      </div>
    </DialogContent>
  );
}
