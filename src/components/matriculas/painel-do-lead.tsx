"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROTULOS_DO_PERIODO } from "@/components/reception/periodo-do-aluno-campos";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { BriefingDaVisita, EtapaDoFunil, EventoDoLead, LeadDetalhe, SinalDaFamilia } from "@/lib/matriculas/tipos";
import {
  COR_DA_ETAPA,
  ORDEM_DAS_ETAPAS,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_SINAL,
  TITULO_PADRAO_DA_ETAPA,
  dataHoraCurta,
  esperaEmTexto,
  idadeCurta,
  iniciais,
} from "@/lib/matriculas/rotulos";
import { useDefinirSinal, useExcluirLead, useLead } from "@/lib/matriculas/use-funil";

const SEM_SINAL = "-";

type Titulos = Partial<Record<EtapaDoFunil, string>>;

/**
 * A ficha da família, num painel que entra pela direita sem tirar o quadro da tela.
 */
export function PainelDoLead({
  id,
  titulos,
  onFechar,
  onMover,
  onEditar,
}: {
  id: string | null;
  titulos: Titulos;
  onFechar: () => void;
  onMover: (lead: LeadDetalhe, para: EtapaDoFunil) => void;
  onEditar: (lead: LeadDetalhe) => void;
}) {
  return (
    <Dialog open={!!id} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent
        className={cn(
          // Painel à direita, não modal central: o quadro continua à vista atrás do vidro.
          "top-3 right-3 bottom-3 left-auto flex max-h-none w-[min(440px,calc(100%-24px))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-[28px] bg-popover/80 p-0 shadow-[0_28px_60px_-12px_rgba(46,28,84,.32)] backdrop-blur-2xl backdrop-saturate-150 sm:max-w-none",
          "data-open:slide-in-from-right-8 data-open:zoom-in-100 data-closed:slide-out-to-right-8 data-closed:zoom-out-100"
        )}
      >
        {id && <Conteudo id={id} titulos={titulos} onFechar={onFechar} onMover={onMover} onEditar={onEditar} />}
      </DialogContent>
    </Dialog>
  );
}

function Conteudo({
  id,
  titulos,
  onFechar,
  onMover,
  onEditar,
}: {
  id: string;
  titulos: Titulos;
  onFechar: () => void;
  onMover: (lead: LeadDetalhe, para: EtapaDoFunil) => void;
  onEditar: (lead: LeadDetalhe) => void;
}) {
  const { data: lead, isLoading, isError } = useLead(id);
  const definirSinal = useDefinirSinal();
  const excluir = useExcluirLead();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const ehGestao = getSession()?.role === "Admin";
  const titulo = (e: EtapaDoFunil) => titulos[e] ?? TITULO_PADRAO_DA_ETAPA[e];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <DialogTitle className="sr-only">Carregando a família</DialogTitle>
        <Skeleton className="h-12 w-2/3 rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-5">
        <DialogTitle className="font-heading text-lg">Família não encontrada</DialogTitle>
        <DialogDescription className="mt-1">Ela pode ter sido excluída por outra pessoa da equipe.</DialogDescription>
      </div>
    );
  }

  async function mudarSinal(valor: string | null) {
    try {
      await definirSinal.mutateAsync({
        id: lead!.id,
        sinal: !valor || valor === SEM_SINAL ? null : (valor as SinalDaFamilia),
      });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o sinal.");
    }
  }

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(lead!.id);
      toast.success(`Os dados de ${lead!.nomeResponsavel} foram apagados.`);
      onFechar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
    }
  }

  const idade = idadeCurta(lead.idadeEmMeses);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-foreground/[.07] px-5 pb-4 pt-5 pr-12">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary font-heading text-base font-semibold text-primary-foreground">
          {iniciais(lead.nomeResponsavel)}
        </div>
        <div className="min-w-0">
          <DialogTitle className="truncate font-heading text-[19px] font-semibold">{lead.nomeResponsavel}</DialogTitle>
          <DialogDescription className="truncate">
            {lead.nomeCrianca ?? "Criança sem nome ainda"}
            {idade && ` · ${idade}`}
          </DialogDescription>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        {lead.aguardandoEquipeDesde && (
          <div className="rounded-2xl bg-action-soft px-3.5 py-3 text-sm text-action-soft-foreground">
            <p className="font-semibold">
              Aguardando a equipe
              {lead.minutosEsperando != null && ` · ${esperaEmTexto(lead.minutosEsperando)}`}
            </p>
            {lead.motivoRepasse && <p className="mt-0.5 text-[13px] opacity-90">{lead.motivoRepasse}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Seletor rotulo="Etapa">
            <Select value={lead.etapa} onValueChange={(v) => v && v !== lead.etapa && onMover(lead, v as EtapaDoFunil)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => (
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: COR_DA_ETAPA[lead.etapa] }} />
                      {titulo(lead.etapa)}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ORDEM_DAS_ETAPAS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {titulo(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Seletor>
          <Seletor rotulo="Sinal da família">
            <Select value={lead.sinal ?? SEM_SINAL} onValueChange={mudarSinal}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => (lead.sinal ? ROTULO_DO_SINAL[lead.sinal] : "Sem sinal ainda")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_SINAL}>Sem sinal ainda</SelectItem>
                {(Object.keys(ROTULO_DO_SINAL) as SinalDaFamilia[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ROTULO_DO_SINAL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Seletor>
        </div>

        {lead.etapa === "Perdido" && lead.motivoPerda && (
          <p className="rounded-2xl bg-foreground/[.04] px-3.5 py-3 text-sm">
            <span className="font-semibold">Motivo da perda: </span>
            {lead.motivoPerda}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Dado rotulo="WhatsApp">
            <a
              href={`https://wa.me/${lead.telefone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              {lead.telefoneFormatado}
            </a>
          </Dado>
          <Dado rotulo="Turma">{lead.turmaNome ?? "—"}</Dado>
          <Dado rotulo="Período">{lead.periodo ? ROTULOS_DO_PERIODO[lead.periodo] : "—"}</Dado>
          <Dado rotulo="Ano letivo">{lead.anoLetivo ?? "—"}</Dado>
          <Dado rotulo="Como chegou">{ROTULO_DA_ORIGEM[lead.origem]}</Dado>
          <Dado rotulo="Visita">{lead.visitaEm ? dataHoraCurta(lead.visitaEm) : "—"}</Dado>
          <Dado rotulo="Nesta etapa">{lead.diasNaEtapa === 0 ? "desde hoje" : `há ${lead.diasNaEtapa} ${lead.diasNaEtapa === 1 ? "dia" : "dias"}`}</Dado>
          <Dado rotulo="Entrou no funil">{dataHoraCurta(lead.criadoEm)}</Dado>
        </div>

        {lead.briefingVisita && <Briefing json={lead.briefingVisita} deOutraVisita={lead.briefingDeOutraVisita} />}

        {lead.notas && (
          <Secao titulo="Notas">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{lead.notas}</p>
          </Secao>
        )}

        {lead.toques.length > 0 && (
          <Secao titulo="Contatos depois da visita">
            <ul className="flex flex-col gap-1.5">
              {lead.toques.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                  <span>
                    {t.numero}º contato · {dataHoraCurta(t.agendadoPara)}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      t.feitoEm ? "text-success" : t.cancelado ? "text-muted-foreground line-through" : "text-action"
                    )}
                  >
                    {t.feitoEm ? "feito" : t.cancelado ? "cancelado" : "agendado"}
                  </span>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <Secao titulo="Histórico">
          <ol className="flex flex-col gap-2 border-l border-foreground/10 pl-3.5">
            {lead.eventos.map((e) => (
              <li key={e.id} className="relative text-sm">
                <span aria-hidden className="absolute -left-[18.5px] top-1.5 size-2 rounded-full bg-foreground/25" />
                <p>{descreverEvento(e, titulo)}</p>
                <p className="text-xs text-muted-foreground">{dataHoraCurta(e.criadoEm)}</p>
              </li>
            ))}
          </ol>
        </Secao>
      </div>

      <div className="flex flex-col gap-2 border-t border-foreground/[.07] px-5 py-4">
        {confirmandoExclusao ? (
          <>
            <p className="text-sm">
              Apagar todos os dados de <b>{lead.nomeResponsavel}</b>, com o histórico? Use só quando a família pedir (LGPD).
              Não tem como desfazer.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmandoExclusao(false)}>
                Voltar
              </Button>
              <Button variant="destructive" className="flex-1" disabled={excluir.isPending} onClick={confirmarExclusao}>
                {excluir.isPending ? "Apagando..." : "Apagar de vez"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <Link href={`/matriculas/conversas?lead=${lead.id}`} className={buttonVariants({ variant: "action", className: "flex-1" })}>
              <MessageCircle data-icon="inline-start" />
              Conversa
            </Link>
            <Button variant="outline" className="flex-1" onClick={() => onEditar(lead)}>
              <Pencil data-icon="inline-start" />
              Editar dados
            </Button>
            {ehGestao && (
              <Button variant="ghost" size="icon" aria-label="Apagar dados da família" onClick={() => setConfirmandoExclusao(true)}>
                <Trash2 />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function descreverEvento(evento: EventoDoLead, titulo: (e: EtapaDoFunil) => string): string {
  let dados: Record<string, unknown> = {};
  try {
    dados = evento.dados ? JSON.parse(evento.dados) : {};
  } catch {
    // Evento com JSON estragado ainda aparece, só sem os detalhes.
  }

  switch (evento.tipo) {
    case "lead_criado":
      return "Entrou no funil";
    case "etapa_alterada": {
      const de = dados.de as EtapaDoFunil | undefined;
      const para = dados.para as EtapaDoFunil | undefined;
      const texto = de && para ? `Passou de ${titulo(de)} para ${titulo(para)}` : "Mudou de etapa";
      return dados.motivoPerda ? `${texto}: ${dados.motivoPerda}` : texto;
    }
    case "toques_agendados":
      return "3 contatos agendados: 24 horas, 3 dias e 7 dias depois da visita";
    case "sinal_alterado": {
      const para = dados.para as SinalDaFamilia | undefined;
      return para ? `Sinal: ${ROTULO_DO_SINAL[para]}` : "Sinal apagado";
    }
    case "dados_alterados":
      return "Dados editados";
    default:
      return DESCRICAO_DO_EVENTO[evento.tipo] ?? evento.tipo.replaceAll("_", " ");
  }
}

/** Os eventos da assistente e das automações, em palavras de escola. */
const DESCRICAO_DO_EVENTO: Record<string, string> = {
  turma_determinada: "A assistente calculou a turma",
  dados_registrados: "A assistente anotou dados da família",
  retomada_combinada: "Combinado de retomar depois",
  conversa_encerrada: "Conversa encerrada: não é matrícula",
  repasse_para_equipe: "Passada para a equipe",
  equipe_assumiu: "A equipe assumiu a conversa",
  devolvida_a_assistente: "Devolvida para a assistente",
  toque_enviado: "Contato pós-visita enviado",
  toque_falhou: "Contato pós-visita não saiu",
  lembrete_da_vespera_enviado: "Lembrete da véspera enviado",
  lembrete_do_dia_enviado: "Lembrete de uma hora antes enviado",
  pedido_de_remarcacao_enviado: "Pedido de remarcação enviado",
  retomada_enviada: "A assistente voltou a procurar",
  ciclo_encerrado: "Retomadas encerradas",
  reengajado_pos_equipe: "A assistente respondeu o que ficou pendente",
  reengajamento_precisa_da_equipe: "Pendente precisa da equipe",
  alerta_de_espera_enviado: "Equipe avisada da espera",
  briefing_gerado: "Briefing da visita pronto",
  estilo_ajustado: "Resposta da assistente ajustada",
};

function Briefing({ json, deOutraVisita }: { json: string; deOutraVisita: boolean }) {
  let b: BriefingDaVisita | null = null;
  try {
    b = JSON.parse(json) as BriefingDaVisita;
  } catch {
    return null;
  }
  const itens = (titulo: string, lista?: (string | undefined)[]) => {
    const l = (lista ?? []).filter((x): x is string => !!x && x.trim().length > 0);
    return l.length === 0 ? null : (
      <div>
        <p className="text-[11.5px] font-semibold text-muted-foreground">{titulo}</p>
        <ul className="mt-0.5 list-disc pl-4 text-[13.5px] leading-relaxed">
          {l.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Secao titulo="Briefing da visita">
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-3.5">
        {deOutraVisita && <p className="text-[12.5px] text-muted-foreground">Este é da visita anterior; o da nova sai em alguns minutos.</p>}
        {b.orcamentoDeclarado && (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-[13.5px] text-warning-soft-foreground">
            <b>O que ela disse que pode pagar:</b> {b.orcamentoDeclarado}
          </p>
        )}
        {itens("A criança", [...(b.crianca?.comoE ?? []), ...(b.crianca?.saude ?? []), ...(b.crianca?.historico ?? []), ...(b.crianca?.gostos ?? [])])}
        {itens("A família", [b.familia?.quemDecide && `Quem decide: ${b.familia.quemDecide}`, b.familia?.trabalho, b.familia?.outrosFilhos, b.familia?.localizacao])}
        {itens("O que valoriza", b.prioridades)}
        {itens("Preocupações", [...(b.preocupacoes ?? []), ...(b.objecoes ?? [])])}
        {itens("Nas palavras dela", b.frasesLiterais?.map((f) => f.texto && `“${f.texto}”`))}
        {itens("Como conduzir", b.sugestoesParaVisita)}
      </div>
    </Secao>
  );
}

function Seletor({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">{rotulo}</span>
      {children}
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-card px-3 py-2.5">
      <span className="block text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">{rotulo}</span>
      <span className="block truncate text-[13.5px] font-medium">{children}</span>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{titulo}</h3>
      {children}
    </section>
  );
}
