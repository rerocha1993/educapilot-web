"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClasses } from "@/lib/kernel/use-classes";
import { ROTULOS_DO_PERIODO } from "@/components/reception/periodo-do-aluno-campos";
import type { TipoDePeriodo } from "@/lib/reception/use-portaria";
import type { LeadDetalhe, OrigemDoLead, SalvarLead } from "@/lib/matriculas/tipos";
import { ROTULO_DA_ORIGEM, brasiliaParaUtc, utcParaBrasilia } from "@/lib/matriculas/rotulos";
import { useAtualizarLead, useCriarLead } from "@/lib/matriculas/use-funil";

const NENHUM = "-";

interface Valores {
  nomeResponsavel: string;
  telefone: string;
  nomeCrianca: string;
  dataNascimento: string;
  classId: string;
  anoLetivo: string;
  periodo: string;
  origem: OrigemDoLead;
  visitaEm: string;
  notas: string;
}

function valoresIniciais(lead?: LeadDetalhe | null): Valores {
  return {
    nomeResponsavel: lead?.nomeResponsavel ?? "",
    telefone: lead?.telefoneFormatado ?? "",
    nomeCrianca: lead?.nomeCrianca ?? "",
    dataNascimento: lead?.dataNascimento ?? "",
    classId: lead?.classId ? String(lead.classId) : NENHUM,
    anoLetivo: lead?.anoLetivo ? String(lead.anoLetivo) : String(new Date().getFullYear() + 1),
    periodo: lead?.periodo ?? NENHUM,
    origem: lead?.origem ?? "Outro",
    visitaEm: utcParaBrasilia(lead?.visitaEm),
    notas: lead?.notas ?? "",
  };
}

/** Cadastro à mão (a família veio pela porta, ligou, foi indicada) e edição dos dados. */
export function FormularioDoLead({
  aberto,
  lead,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  /** Com lead, edita; sem, cadastra. */
  lead?: LeadDetalhe | null;
  onFechar: () => void;
  onSalvo?: (lead: LeadDetalhe) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      {aberto && <Conteudo key={lead?.id ?? "novo"} lead={lead} onFechar={onFechar} onSalvo={onSalvo} />}
    </Dialog>
  );
}

function Conteudo({
  lead,
  onFechar,
  onSalvo,
}: {
  lead?: LeadDetalhe | null;
  onFechar: () => void;
  onSalvo?: (lead: LeadDetalhe) => void;
}) {
  const [v, setV] = useState<Valores>(() => valoresIniciais(lead));
  const { data: turmas } = useClasses();
  const criar = useCriarLead();
  const atualizar = useAtualizarLead();
  const salvando = criar.isPending || atualizar.isPending;

  const listaDeTurmas = (turmas ?? []).filter((t) => t.id != null);
  const campo = <K extends keyof Valores>(k: K) => (valor: Valores[K]) => setV((atual) => ({ ...atual, [k]: valor }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const dto: SalvarLead = {
      nomeResponsavel: v.nomeResponsavel.trim(),
      telefone: v.telefone.trim(),
      nomeCrianca: v.nomeCrianca.trim() || null,
      dataNascimento: v.dataNascimento || null,
      classId: v.classId !== NENHUM ? Number(v.classId) : null,
      anoLetivo: v.anoLetivo ? Number(v.anoLetivo) : null,
      periodo: v.periodo !== NENHUM ? (v.periodo as TipoDePeriodo) : null,
      origem: v.origem,
      visitaEm: v.visitaEm ? brasiliaParaUtc(v.visitaEm) : null,
      notas: v.notas.trim() || null,
    };

    try {
      const salvo = lead ? await atualizar.mutateAsync({ id: lead.id, dto }) : await criar.mutateAsync(dto);
      toast.success(lead ? "Dados salvos." : `${salvo.nomeResponsavel} entrou no funil.`);
      onSalvo?.(salvo);
      onFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }

  return (
    <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">{lead ? "Editar família" : "Nova família"}</DialogTitle>
        <DialogDescription>
          {lead
            ? "O telefone é a chave da família: trocar aqui muda para qual número a conversa vai."
            : "Para quem veio pela porta, ligou ou foi indicado. Quem chega pelo WhatsApp entra sozinho."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="lead-responsavel" rotulo="Responsável" obrigatorio>
            <Input
              id="lead-responsavel"
              required
              maxLength={200}
              autoComplete="off"
              value={v.nomeResponsavel}
              onChange={(e) => campo("nomeResponsavel")(e.target.value)}
            />
          </Campo>
          <Campo id="lead-telefone" rotulo="WhatsApp" obrigatorio>
            <Input
              id="lead-telefone"
              required
              inputMode="tel"
              placeholder="(11) 98765-4321"
              value={v.telefone}
              onChange={(e) => campo("telefone")(e.target.value)}
            />
          </Campo>
          <Campo id="lead-crianca" rotulo="Criança">
            <Input id="lead-crianca" maxLength={200} value={v.nomeCrianca} onChange={(e) => campo("nomeCrianca")(e.target.value)} />
          </Campo>
          <Campo id="lead-nascimento" rotulo="Nascimento">
            <Input id="lead-nascimento" type="date" value={v.dataNascimento} onChange={(e) => campo("dataNascimento")(e.target.value)} />
          </Campo>
          <Campo id="lead-turma" rotulo="Turma pretendida">
            <Select value={v.classId} onValueChange={(x) => campo("classId")(x ?? NENHUM)}>
              <SelectTrigger id="lead-turma" className="w-full">
                <SelectValue>{() => listaDeTurmas.find((t) => String(t.id) === v.classId)?.className ?? lead?.turmaNome ?? "Não sei ainda"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Não sei ainda</SelectItem>
                {listaDeTurmas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="lead-ano" rotulo="Ano letivo">
            <Input id="lead-ano" type="number" min={2000} max={2100} value={v.anoLetivo} onChange={(e) => campo("anoLetivo")(e.target.value)} />
          </Campo>
          <Campo id="lead-periodo" rotulo="Período">
            <Select value={v.periodo} onValueChange={(x) => campo("periodo")(x ?? NENHUM)}>
              <SelectTrigger id="lead-periodo" className="w-full">
                <SelectValue>{() => (v.periodo !== NENHUM ? ROTULOS_DO_PERIODO[v.periodo as TipoDePeriodo] : "Não sei ainda")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Não sei ainda</SelectItem>
                {(Object.keys(ROTULOS_DO_PERIODO) as TipoDePeriodo[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULOS_DO_PERIODO[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="lead-origem" rotulo="Como chegou">
            <Select value={v.origem} onValueChange={(x) => campo("origem")((x as OrigemDoLead) ?? "Outro")}>
              <SelectTrigger id="lead-origem" className="w-full">
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
          <Campo id="lead-visita" rotulo="Visita (horário de Brasília)" className="sm:col-span-2">
            <Input id="lead-visita" type="datetime-local" value={v.visitaEm} onChange={(e) => campo("visitaEm")(e.target.value)} />
          </Campo>
          <Campo id="lead-notas" rotulo="Notas" className="sm:col-span-2">
            <Textarea id="lead-notas" maxLength={4000} rows={3} value={v.notas} onChange={(e) => campo("notas")(e.target.value)} />
          </Campo>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="action" className="flex-1" disabled={salvando}>
            {salvando ? "Salvando..." : lead ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function Campo({
  id,
  rotulo,
  obrigatorio,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[5px] ${className ?? ""}`}>
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
        {obrigatorio && <span className="text-action"> *</span>}
      </Label>
      {children}
    </div>
  );
}
