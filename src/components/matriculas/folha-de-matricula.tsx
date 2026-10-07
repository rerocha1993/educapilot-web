"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROTULOS_DO_PERIODO } from "@/components/reception/periodo-do-aluno-campos";
import { useClasses } from "@/lib/kernel/use-classes";
import type { TipoDePeriodo } from "@/lib/reception/use-portaria";
import type { EtapaDoFunil, LancarMatricula, OrigemDoLead, ResultadoDaMatricula } from "@/lib/matriculas/tipos";
import { ROTULO_DA_ORIGEM, TITULO_PADRAO_DA_ETAPA } from "@/lib/matriculas/rotulos";
import { useLancarMatricula } from "@/lib/matriculas/use-funil";

const NENHUM = "-";

interface Valores {
  nomeResponsavel: string;
  telefone: string;
  nomeCrianca: string;
  dataNascimento: string;
  classId: string;
  origem: OrigemDoLead;
  periodo: string;
  notas: string;
}

const VAZIO: Valores = {
  nomeResponsavel: "",
  telefone: "",
  nomeCrianca: "",
  dataNascimento: "",
  classId: NENHUM,
  origem: "Porta",
  periodo: NENHUM,
  notas: "",
};

/**
 * Lançar matrícula: para a que veio por outro caminho (porta, telefone, indicação). O card nasce
 * direto em Matriculado, ou, se o telefone já está no funil, o card que existe é aproveitado.
 */
export function FolhaDeMatricula({
  aberto,
  titulos,
  onFechar,
}: {
  aberto: boolean;
  titulos: Partial<Record<EtapaDoFunil, string>>;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      {aberto && <Conteudo titulos={titulos} onFechar={onFechar} />}
    </Dialog>
  );
}

function Conteudo({ titulos, onFechar }: { titulos: Partial<Record<EtapaDoFunil, string>>; onFechar: () => void }) {
  const [v, setV] = useState<Valores>(VAZIO);
  const [passo, setPasso] = useState<"formulario" | "confirmar">("formulario");
  const [resultado, setResultado] = useState<ResultadoDaMatricula | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const travado = useRef(false);
  const { data: turmas } = useClasses();
  const lancar = useLancarMatricula();
  const listaDeTurmas = (turmas ?? []).filter((t) => t.id != null);
  const campo = <K extends keyof Valores>(k: K) => (valor: Valores[K]) => setV((atual) => ({ ...atual, [k]: valor }));

  async function enviar(confirmarExistente: boolean) {
    if (travado.current) return;
    travado.current = true;
    setErro(null);
    setAviso(null);
    const dto: LancarMatricula = {
      nomeResponsavel: v.nomeResponsavel.trim(),
      telefone: v.telefone.trim(),
      nomeCrianca: v.nomeCrianca.trim() || null,
      dataNascimento: v.dataNascimento || null,
      classId: v.classId !== NENHUM ? Number(v.classId) : null,
      periodo: v.periodo !== NENHUM ? (v.periodo as TipoDePeriodo) : null,
      origem: v.origem,
      notas: v.notas.trim() || null,
      confirmarExistente,
    };
    try {
      const r = await lancar.mutateAsync(dto);
      if (r.situacao === "Lancada") {
        toast.success("Matrícula lançada");
        onFechar();
      } else if (r.situacao === "PrecisaConfirmar") {
        setResultado(r);
        setPasso("confirmar");
      } else {
        setAviso(`${(r.nomeExistente || r.lead?.nomeResponsavel)?.trim() || "Um card sem nome"} já está como matriculada neste telefone.`);
        setPasso("formulario");
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Não foi possível lançar a matrícula.";
      setErro(mensagem);
      setPasso("formulario");
    } finally {
      travado.current = false;
    }
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    void enviar(false);
  }

  if (passo === "confirmar" && resultado) {
    const nome = (resultado.nomeExistente || resultado.lead?.nomeResponsavel)?.trim() || "Um card sem nome";
    const etapa = (resultado.etapaExistente ?? resultado.lead?.etapa) ? (titulos[(resultado.etapaExistente ?? resultado.lead!.etapa)] ?? TITULO_PADRAO_DA_ETAPA[(resultado.etapaExistente ?? resultado.lead!.etapa)]) : "outra etapa";
    return (
      <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Esse telefone já está no funil</DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-foreground">
            {nome} está em <b>{etapa}</b> com este telefone. Posso mover esse card para Matriculado?
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-2xl bg-muted/70 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          {resultado.atribuiAoAnuncio
            ? "Esta família veio de anúncio, e mover o card que já existe é o que devolve a matrícula para a Meta: a campanha fica com o crédito dela."
            : "Criar um segundo card com o mesmo telefone contaria a mesma matrícula duas vezes."}
        </p>
        {erro && (
          <p role="alert" className="rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-[13px] text-destructive-soft-foreground">
            {erro}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onFechar} disabled={lancar.isPending}>
            Não, deixa como está
          </Button>
          <Button variant="action" className="flex-1" onClick={() => void enviar(true)} disabled={lancar.isPending}>
            {lancar.isPending ? "Movendo…" : "Mover para Matriculado"}
          </Button>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-5 rounded-[28px] p-5 sm:max-w-lg sm:p-6">
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-semibold tracking-[-.02em]">Lançar matrícula</DialogTitle>
        <DialogDescription className="leading-relaxed">
          O card nasce direto em Matriculado e conta no resumo do dia e no painel, igual a qualquer outro.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={aoEnviar} className="flex min-w-0 flex-col gap-4">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="mat-responsavel" rotulo="Responsável" obrigatorio>
            <Input
              id="mat-responsavel"
              required
              autoFocus
              maxLength={200}
              autoComplete="off"
              value={v.nomeResponsavel}
              onChange={(e) => campo("nomeResponsavel")(e.target.value)}
            />
          </Campo>
          <Campo id="mat-telefone" rotulo="Telefone" obrigatorio>
            <Input
              id="mat-telefone"
              required
              inputMode="tel"
              placeholder="(11) 98765-4321"
              value={v.telefone}
              onChange={(e) => campo("telefone")(e.target.value)}
            />
          </Campo>
          <Campo id="mat-crianca" rotulo="Criança">
            <Input id="mat-crianca" maxLength={200} value={v.nomeCrianca} onChange={(e) => campo("nomeCrianca")(e.target.value)} />
          </Campo>
          <Campo id="mat-nascimento" rotulo="Nascimento">
            <Input id="mat-nascimento" type="date" value={v.dataNascimento} onChange={(e) => campo("dataNascimento")(e.target.value)} />
          </Campo>
          <Campo id="mat-turma" rotulo="Turma">
            <Select value={v.classId} onValueChange={(x) => campo("classId")(x ?? NENHUM)}>
              <SelectTrigger id="mat-turma" className="w-full">
                <SelectValue>{() => listaDeTurmas.find((t) => String(t.id) === v.classId)?.className ?? "Pela data de nascimento"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Pela data de nascimento</SelectItem>
                {listaDeTurmas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="mat-origem" rotulo="Veio por">
            <Select value={v.origem} onValueChange={(x) => campo("origem")((x as OrigemDoLead) ?? "Porta")}>
              <SelectTrigger id="mat-origem" className="w-full">
                <SelectValue>{() => ROTULO_DA_ORIGEM[v.origem]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROTULO_DA_ORIGEM) as OrigemDoLead[]).map((o) => (
                  <SelectItem key={o} value={o}>
                    {ROTULO_DA_ORIGEM[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="mat-periodo" rotulo="Período" className="sm:col-span-2">
            <Select value={v.periodo} onValueChange={(x) => campo("periodo")(x ?? NENHUM)}>
              <SelectTrigger id="mat-periodo" className="w-full">
                <SelectValue>{() => (v.periodo !== NENHUM ? ROTULOS_DO_PERIODO[v.periodo as TipoDePeriodo] : "Não informado")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Não informado</SelectItem>
                {(Object.keys(ROTULOS_DO_PERIODO) as TipoDePeriodo[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULOS_DO_PERIODO[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="mat-notas" rotulo="Observação" className="sm:col-span-2">
            <Textarea
              id="mat-notas"
              maxLength={4000}
              rows={3}
              placeholder="Irmã da Lívia do Jardim, matriculou na secretaria."
              value={v.notas}
              onChange={(e) => campo("notas")(e.target.value)}
            />
          </Campo>
        </div>

        <p className="rounded-2xl bg-muted/70 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          A assistente não procura família matriculada: ninguém recebe mensagem por causa deste lançamento. Se o telefone já estiver no
          funil, o card que existe é aproveitado em vez de virar cópia.
        </p>

        {aviso && (
          <p role="alert" className="rounded-2xl bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning-soft-foreground">
            {aviso}
          </p>
        )}
        {erro && (
          <p role="alert" className="rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-[13px] text-destructive-soft-foreground">
            {erro}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={onFechar} disabled={lancar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="action" className="flex-1" disabled={lancar.isPending}>
            {lancar.isPending ? "Lançando…" : "Lançar matrícula"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function Campo({ id, rotulo, obrigatorio, className, children }: { id: string; rotulo: string; obrigatorio?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-[5px] ${className ?? ""}`}>
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
        {obrigatorio && <span className="text-action"> *</span>}
      </Label>
      {children}
    </div>
  );
}
