"use client";

import type { ReactNode } from "react";
import { Baby, BriefcaseBusiness, HeartHandshake, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { juntarNomes, ROTULO_DO_ENVOLVIDO, type TipoDeEnvolvido } from "@/lib/tasks/use-reunioes-e-atendimentos";
import { cn } from "@/lib/utils";

/** Um ícone por tipo de pessoa: aluno, responsável e funcionário se reconhecem sem ler. */
export const ICONE_DO_ENVOLVIDO: Record<TipoDeEnvolvido, ReactNode> = {
  Aluno: <Baby aria-hidden />,
  Responsavel: <HeartHandshake aria-hidden />,
  Funcionario: <BriefcaseBusiness aria-hidden />,
};

const COR_DO_ENVOLVIDO: Record<TipoDeEnvolvido, string> = {
  Aluno: "bg-accent text-accent-foreground",
  Responsavel: "bg-action-soft text-action-soft-foreground",
  Funcionario: "bg-secondary text-secondary-foreground",
};

/** Pessoa da reunião: ícone do tipo, nome e (se houver) o detalhe. Com `aoRemover`, vira chip editável. */
export function ChipDeEnvolvido({
  tipo,
  nome,
  detalhe,
  aoRemover,
  className,
}: {
  tipo: TipoDeEnvolvido;
  nome: string;
  detalhe?: string | null;
  aoRemover?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pr-2.5 pl-0.5 text-sm",
        aoRemover && "pr-1",
        className
      )}
    >
      <span
        title={ROTULO_DO_ENVOLVIDO[tipo]}
        className={cn("grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5", COR_DO_ENVOLVIDO[tipo])}
      >
        {ICONE_DO_ENVOLVIDO[tipo]}
        <span className="sr-only">{ROTULO_DO_ENVOLVIDO[tipo]}: </span>
      </span>
      <span className="min-w-0 break-words">
        <span className="font-medium">{nome}</span>
        {detalhe && <span className="text-[12.5px] text-muted-foreground"> · {detalhe}</span>}
      </span>
      {aoRemover && (
        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Tirar ${nome}`}
          className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground max-md:size-8"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

// ------------------------------------------------------------------ notas

/** Escala de 0 a 10 em botões. Tocar de novo no número escolhido tira a nota (a nota é opcional). */
export function EscalaDeNota({
  idDoRotulo,
  rotulo,
  explicacao,
  extremos,
  valor,
  aoMudar,
  desabilitada,
}: {
  idDoRotulo: string;
  rotulo: string;
  explicacao: string;
  extremos: [string, string];
  valor: number | null;
  aoMudar: (v: number | null) => void;
  desabilitada?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <p id={idDoRotulo} className="text-sm font-medium">
        {rotulo}
        {valor != null && <span className="ml-2 font-numeric text-base font-semibold">{valor}</span>}
      </p>
      <p className="text-[12.5px] text-muted-foreground">{explicacao}</p>
      <div role="radiogroup" aria-labelledby={idDoRotulo} className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const marcado = valor === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={marcado}
              disabled={desabilitada}
              onClick={() => aoMudar(marcado ? null : n)}
              className={cn(
                "h-9 min-w-0 rounded-md border text-sm font-numeric transition-colors disabled:opacity-50 max-md:h-10",
                marcado ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-card hover:bg-muted"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
        <span>0 · {extremos[0]}</span>
        <span className="text-right">10 · {extremos[1]}</span>
      </div>
    </div>
  );
}

/** As duas escalas da gestão. Só a gestão chega aqui; a nota entra no Desempenho de quem esteve na reunião. */
export function EscalasDeNota({
  notaDoAssunto,
  notaDoDesfecho,
  aoMudarAssunto,
  aoMudarDesfecho,
  desabilitada,
}: {
  notaDoAssunto: number | null;
  notaDoDesfecho: number | null;
  aoMudarAssunto: (v: number | null) => void;
  aoMudarDesfecho: (v: number | null) => void;
  desabilitada?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <EscalaDeNota
        idDoRotulo="nota-assunto"
        rotulo="Assunto: ruim ↔ bom"
        explicacao="Como era o motivo da reunião. Um assunto chato ou difícil fica perto de 0."
        extremos={["assunto ruim", "assunto bom"]}
        valor={notaDoAssunto}
        aoMudar={aoMudarAssunto}
        desabilitada={desabilitada}
      />
      <EscalaDeNota
        idDoRotulo="nota-desfecho"
        rotulo="Desfecho: terminou mal ↔ terminou bem"
        explicacao="Como a conversa terminou. Um assunto difícil que terminou bem tem nota baixa em cima e alta aqui."
        extremos={["terminou mal", "terminou bem"]}
        valor={notaDoDesfecho}
        aoMudar={aoMudarDesfecho}
        desabilitada={desabilitada}
      />
    </div>
  );
}

// ------------------------------------------------------------------ advertência verbal

/** Aviso antes de finalizar uma reunião de advertência verbal: ela passa a valer no Desempenho. */
export function ConfirmarFinalizacao({
  aberto,
  funcionarios,
  ehAdvertencia,
  pendente,
  aoConfirmar,
  aoFechar,
}: {
  aberto: boolean;
  funcionarios: string[];
  ehAdvertencia: boolean;
  pendente: boolean;
  aoConfirmar: () => void;
  aoFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && !pendente && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar esta reunião?</DialogTitle>
        </DialogHeader>
        {ehAdvertencia ? (
          <p className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            Ao finalizar, a advertência verbal é registrada no Desempenho de: <strong>{juntarNomes(funcionarios)}</strong>. Se a reunião
            for cancelada depois, o registro é retirado.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">A reunião passa para o histórico de cada pessoa que esteve nela.</p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pendente} onClick={aoFechar}>
            Voltar
          </Button>
          <Button variant="action" disabled={pendente} onClick={aoConfirmar}>
            {pendente ? "Finalizando…" : "Finalizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
