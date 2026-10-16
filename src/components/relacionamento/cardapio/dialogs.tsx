"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { rotuloDaSemana } from "@/lib/relacionamento/cardapio-vocabulario";
import {
  useCopiarCardapio,
  useSalvarConfiguracaoDoCardapio,
  type CardapioDetalhe,
  type CardapioResumo,
  type ConfiguracaoDoCardapio,
} from "@/lib/relacionamento/use-cardapio";
import { somarDias } from "@/lib/tasks/calendario-datas";

export interface TurmaDaEscola {
  id: number;
  nome: string;
}

// ------------------------------------------------------------------ turmas

/**
 * "Para quem é": a escola toda ou algumas turmas. Sem turma marcada, vale a escola toda (é assim
 * que o servidor entende). Marcar "Escola toda" limpa as turmas.
 */
export function SeletorDeTurmas({
  turmas,
  selecionadas,
  onChange,
  desabilitado = false,
}: {
  turmas: readonly TurmaDaEscola[];
  selecionadas: readonly number[];
  onChange: (ids: number[]) => void;
  desabilitado?: boolean;
}) {
  const escolaToda = selecionadas.length === 0;

  function alternar(id: number, marcada: boolean) {
    onChange(marcada ? [...selecionadas, id] : selecionadas.filter((i) => i !== id));
  }

  return (
    <div className="grid gap-0.5">
      <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted">
        <Checkbox checked={escolaToda} disabled={desabilitado} onCheckedChange={(v) => v && onChange([])} />
        <span className="text-sm font-medium">Escola toda</span>
      </label>
      <div className="grid max-h-56 gap-0.5 overflow-y-auto border-t border-border pt-1">
        {turmas.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nenhuma turma cadastrada.</p>}
        {turmas.map((t) => (
          <label key={t.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted">
            <Checkbox checked={selecionadas.includes(t.id)} disabled={desabilitado} onCheckedChange={(v) => alternar(t.id, v === true)} />
            <span className="min-w-0 truncate text-sm">{t.nome}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function DialogDeTurmas({
  aberto,
  turmas,
  inicial,
  onConfirmar,
  onFechar,
}: {
  aberto: boolean;
  turmas: readonly TurmaDaEscola[];
  inicial: readonly number[];
  onConfirmar: (ids: number[]) => void;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Para quem é este cardápio</DialogTitle>
          <DialogDescription>
            Uma turma pode ter o seu (o Berçário, com papinha e mamadeira). A família vê o da turma do filho; sem cardápio da turma, o da escola toda.
          </DialogDescription>
        </DialogHeader>
        {aberto && <CorpoDeTurmas turmas={turmas} inicial={inicial} onConfirmar={onConfirmar} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function CorpoDeTurmas({
  turmas,
  inicial,
  onConfirmar,
  onFechar,
}: {
  turmas: readonly TurmaDaEscola[];
  inicial: readonly number[];
  onConfirmar: (ids: number[]) => void;
  onFechar: () => void;
}) {
  const [ids, setIds] = useState<number[]>([...inicial]);
  return (
    <>
      <SeletorDeTurmas turmas={turmas} selecionadas={ids} onChange={setIds} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => {
            onConfirmar(ids);
            onFechar();
          }}
        >
          Usar
        </Button>
      </DialogFooter>
    </>
  );
}

// ------------------------------------------------------------------ duplicar e copiar

/**
 * "Duplicar para...": copia os pratos do cardápio salvo para outra semana e/ou outras turmas, como
 * rascunho. Nas mesmas semana e turmas, o servidor recusa (uma turma tem um cardápio por semana).
 */
export function DialogDeDuplicacao({
  aberto,
  cardapio,
  turmas,
  onFechar,
  onCopiado,
}: {
  aberto: boolean;
  cardapio: CardapioDetalhe | null;
  turmas: readonly TurmaDaEscola[];
  onFechar: () => void;
  onCopiado: (semana: string, id: string) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplicar cardápio</DialogTitle>
          <DialogDescription>Os pratos vão como rascunho; você revisa e publica depois.</DialogDescription>
        </DialogHeader>
        {aberto && cardapio && (
          <CorpoDeDuplicacao key={cardapio.id} cardapio={cardapio} turmas={turmas} onFechar={onFechar} onCopiado={onCopiado} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CorpoDeDuplicacao({
  cardapio,
  turmas,
  onFechar,
  onCopiado,
}: {
  cardapio: CardapioDetalhe;
  turmas: readonly TurmaDaEscola[];
  onFechar: () => void;
  onCopiado: (semana: string, id: string) => void;
}) {
  const [semana, setSemana] = useState(cardapio.semana);
  const [ids, setIds] = useState<number[]>(cardapio.turmas.map((t) => t.classId));
  const [erro, setErro] = useState<string | null>(null);
  const copiar = useCopiarCardapio();

  async function duplicar() {
    setErro(null);
    try {
      const copia = await copiar.mutateAsync({ id: cardapio.id, semana, turmaIds: ids });
      toast.success("Cardápio duplicado como rascunho.");
      onCopiado(copia.semana, copia.id);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível duplicar o cardápio.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-1.5 py-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>
          <ChevronLeft />
        </Button>
        <span className="text-sm font-semibold tabular-nums">{rotuloDaSemana(semana)}</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Semana seguinte" onClick={() => setSemana(somarDias(semana, 7))}>
          <ChevronRight />
        </Button>
      </div>

      <SeletorDeTurmas turmas={turmas} selecionadas={ids} onChange={setIds} desabilitado={copiar.isPending} />

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar} disabled={copiar.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void duplicar()} disabled={copiar.isPending}>
          {copiar.isPending ? "Duplicando..." : "Duplicar"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Mais de um cardápio na semana anterior: escolhe de qual copiar para esta semana. */
export function DialogDeOrigem({
  aberto,
  semanaDeOrigem,
  opcoes,
  copiando,
  onEscolher,
  onFechar,
}: {
  aberto: boolean;
  semanaDeOrigem: string;
  opcoes: readonly CardapioResumo[];
  copiando: boolean;
  onEscolher: (origem: CardapioResumo) => void;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Copiar da semana anterior</DialogTitle>
          <DialogDescription>Semana de {rotuloDaSemana(semanaDeOrigem)}. Escolha o cardápio que será copiado.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5">
          {opcoes.map((o) => (
            <li key={o.id}>
              <Button type="button" variant="outline" className="h-auto min-h-11 w-full justify-between py-2" disabled={copiando} onClick={() => onEscolher(o)}>
                <span className="min-w-0 truncate text-left">{o.titulo ?? (o.escolaToda ? "Escola toda" : o.turmas.map((t) => t.nome).join(", "))}</span>
                <span className="shrink-0 text-xs font-normal text-muted-foreground">{o.pratos} pratos</span>
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ refeições

const LINHAS: { campo: keyof Pick<ConfiguracaoDoCardapio, "cafeDaManha" | "lancheDaManha" | "almoco" | "lancheDaTarde" | "jantar" | "mamadeira" | "papa" | "sabado">; rotulo: string; dica?: string }[] = [
  { campo: "cafeDaManha", rotulo: "Café da manhã" },
  { campo: "lancheDaManha", rotulo: "Lanche da manhã" },
  { campo: "almoco", rotulo: "Almoço" },
  { campo: "lancheDaTarde", rotulo: "Lanche da tarde" },
  { campo: "jantar", rotulo: "Jantar", dica: "Para a escola que tem período integral." },
  { campo: "mamadeira", rotulo: "Mamadeira", dica: "Para o berçário." },
  { campo: "papa", rotulo: "Papa", dica: "Para o berçário." },
  { campo: "sabado", rotulo: "Sábado", dica: "Acrescenta o sábado à grade." },
];

/**
 * "Refeições do cardápio": quais refeições a escola usa (o padrão é café, lanche da manhã, almoço
 * e lanche da tarde, de segunda a sexta). Desligar não apaga o que já foi lançado; só some da
 * grade e deixa de ser aceito em novos cardápios.
 */
export function DialogDeRefeicoes({
  aberto,
  configuracao,
  onFechar,
}: {
  aberto: boolean;
  configuracao: ConfiguracaoDoCardapio;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Refeições do cardápio</DialogTitle>
          <DialogDescription>O que a escola serve. Vale para todos os cardápios.</DialogDescription>
        </DialogHeader>
        {aberto && <CorpoDeRefeicoes inicial={configuracao} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function CorpoDeRefeicoes({ inicial, onFechar }: { inicial: ConfiguracaoDoCardapio; onFechar: () => void }) {
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useSalvarConfiguracaoDoCardapio();

  async function gravar() {
    setErro(null);
    try {
      await salvar.mutateAsync(c);
      toast.success("Refeições salvas.");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar as refeições.");
    }
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {LINHAS.map((l) => {
          const id = `cardapio-${l.campo}`;
          return (
            <li key={l.campo} className="flex items-center gap-3 py-2.5">
              <label htmlFor={id} className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{l.rotulo}</span>
                {l.dica && <span className="block text-xs text-muted-foreground">{l.dica}</span>}
              </label>
              <Switch id={id} checked={c[l.campo]} disabled={salvar.isPending} onCheckedChange={(v) => setC((a) => ({ ...a, [l.campo]: v }))} />
            </li>
          );
        })}
      </ul>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar} disabled={salvar.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void gravar()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
