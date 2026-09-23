"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LeadResumo } from "@/lib/matriculas/tipos";
import { MOTIVOS_DE_PERDA } from "@/lib/matriculas/rotulos";

const OUTRO = "Outro";

/**
 * Por que a família não seguiu. Escolha fechada, com "Outro" para o que não couber: o motivo entra no
 * relatório de perdas e ajusta as próximas campanhas. O CRM do Colégio usava window.prompt aqui.
 */
export function FolhaDePerda({
  lead,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo | null;
  enviando: boolean;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}) {
  return (
    <Dialog open={!!lead} onOpenChange={(aberto) => !aberto && onCancelar()}>
      {lead && (
        <Conteudo key={lead.id} lead={lead} enviando={enviando} onConfirmar={onConfirmar} onCancelar={onCancelar} />
      )}
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
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}) {
  const [escolha, setEscolha] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const motivo = escolha === OUTRO ? outro.trim() : escolha;

  return (
    <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">Por que a família não seguiu?</DialogTitle>
        <DialogDescription>
          {lead.nomeResponsavel}
          {lead.nomeCrianca && ` · ${lead.nomeCrianca}`}. O motivo entra no relatório de perdas.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Motivo">
        {[...MOTIVOS_DE_PERDA, OUTRO].map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={escolha === m}
            onClick={() => setEscolha(m)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              escolha === m
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {escolha === OUTRO && (
        <Textarea
          id="motivo-outro"
          autoFocus
          maxLength={300}
          placeholder="O que a família disse"
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
        />
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancelar} disabled={enviando}>
          Voltar
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={!motivo || enviando}
          onClick={() => motivo && onConfirmar(motivo)}
        >
          {enviando ? "Salvando..." : "Marcar como perdida"}
        </Button>
      </div>
    </DialogContent>
  );
}
