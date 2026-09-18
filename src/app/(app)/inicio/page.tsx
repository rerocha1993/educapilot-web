"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  FileSignature,
  FileStack,
  Inbox,
  MessageSquareWarning,
  NotebookPen,
  Package,
  ShoppingBag,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Estatistica, EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { useRequireSession } from "@/lib/auth/use-session";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { usePainelInicio, type PainelInicio } from "@/lib/kernel/use-painel";

// Tela Início da direção visual nova (ver docs/direcao-visual.md): o dia da escola em quatro
// números, o que pede decisão agora e os atalhos. Cada bloco só aparece se a pessoa tem acesso à
// tela que ele abre — número que não se pode investigar não ajuda ninguém.

interface Atalho {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ATALHOS: Atalho[] = [
  { href: "/", label: "Chamada", icon: CalendarCheck },
  { href: "/ocorrencias", label: "Ocorrências", icon: MessageSquareWarning },
  { href: "/flow/respostas", label: "Rematrícula", icon: Inbox },
  { href: "/flow/contratos", label: "Contratos", icon: FileSignature },
  { href: "/finance/mensalidades", label: "Mensalidades", icon: Wallet },
  { href: "/portaria", label: "Portaria", icon: DoorOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/planejamento-semanal", label: "Planejamento", icon: NotebookPen },
  { href: "/checklist", label: "Checklist", icon: ClipboardList },
  { href: "/materiais", label: "Materiais", icon: Package },
  { href: "/admin/alunos", label: "Alunos", icon: UsersRound },
  { href: "/events", label: "Vendas", icon: ShoppingBag },
  { href: "/flow", label: "Formulários", icon: FileStack },
];

const dinheiro = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

function saudacao(hora: number) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function InicioPage() {
  const session = useRequireSession();
  const { rotaVisivel } = useVisibilidade();
  const { data, isLoading, isError } = usePainelInicio();
  // Resposta fora do formato (API antiga ainda no ar, por exemplo) não derruba a tela: os
  // atalhos continuam valendo e o aviso de falha aparece.
  const painel = data?.presencas && data?.rematriculas && data?.contratos ? data : undefined;

  const primeiroNome = session?.name.split(" ").find(Boolean) ?? "";
  const hoje = new Date();
  const semana = hoje.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataLonga = `${semana.charAt(0).toUpperCase()}${semana.slice(1)} · ${hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;

  const tarefas = painel ? tarefasDoDia(painel, rotaVisivel) : [];
  const atalhos = ATALHOS.filter((a) => rotaVisivel(a.href));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <CabecalhoDaPagina
        eyebrow={dataLonga}
        titulo={
          <>
            {saudacao(hoje.getHours())}
            {primeiroNome && `, ${primeiroNome}`}
            <span className="text-action-brand">.</span>
          </>
        }
        apoio={
          isLoading
            ? "Carregando o dia da escola…"
            : tarefas.length > 0
              ? `${tarefas.length} ${tarefas.length === 1 ? "coisa pede" : "coisas pedem"} sua atenção hoje — comece por elas.`
              : "Nada pendente por aqui. Bom dia de trabalho."
        }
        acoes={
          rotaVisivel("/ocorrencias") && (
            <Link
              href="/ocorrencias"
              className={buttonVariants({ variant: "action", className: "w-full md:w-auto" })}
            >
              + Registrar ocorrência
            </Link>
          )
        }
      />

      {(isError || (!isLoading && !painel)) && (
        <p className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os números do dia. Os atalhos abaixo continuam funcionando.
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[148px] animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        painel && (
          <>
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {rotaVisivel("/") && <CartaoPresencas painel={painel} />}
              {rotaVisivel("/flow/respostas") && <CartaoRematriculas painel={painel} />}
              {rotaVisivel("/finance/inadimplencia") && <CartaoEmAtraso painel={painel} />}
              {rotaVisivel("/flow/contratos") && <CartaoContratos painel={painel} />}
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              {tarefas.length > 0 && <PrecisaDeVoce tarefas={tarefas} />}
              {rotaVisivel("/flow/respostas") && painel.rematriculas.porTurma.length > 0 && (
                <RematriculaPorTurma painel={painel} />
              )}
            </div>
          </>
        )
      )}

      {atalhos.length > 0 && (
        <section>
          <div className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[.16em] text-muted-foreground">
            Atalhos
          </div>
          <div className="flex flex-wrap gap-2.5">
            {atalhos.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card py-2.5 pl-2.5 pr-3.5 text-[13.5px] font-medium text-secondary-foreground transition-colors hover:border-action-brand hover:text-action"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-primary">
                  <Icon className="size-4" />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ cartões

function CartaoPresencas({ painel }: { painel: PainelInicio }) {
  const { presentes, atrasados, alunosAtivos, turmasSemChamada, turmas } = painel.presencas;
  // Atrasado esteve na escola: conta como presente na barra, e aparece separado no rodapé.
  const naEscola = presentes + atrasados;
  const pct = alunosAtivos > 0 ? Math.round((naEscola / alunosAtivos) * 100) : 0;

  return (
    <Estatistica
      rotulo="Presenças de hoje"
      etiqueta={<EtiquetaDoCartao tom={pct >= 90 ? "success" : "neutro"}>{pct}%</EtiquetaDoCartao>}
      valor={naEscola}
      total={alunosAtivos}
      proporcao={pct}
      alertarAbaixoDe={75}
      rodape={
        <>
        {atrasados > 0 && (
          <>
            <span className="font-mono tabular-nums">{atrasados}</span> com atraso ·{" "}
          </>
        )}
        {turmasSemChamada > 0 ? (
          <>
            <span className="font-mono tabular-nums">{turmasSemChamada}</span>{" "}
            {turmasSemChamada === 1 ? "turma sem chamada" : "turmas sem chamada"}
            {turmas.length > 0 && `: ${turmas.map((t) => t.turma).join(", ")}`}
          </>
        ) : (
          "chamada fechada em todas as turmas"
        )}
        </>
      }
    />
  );
}

function CartaoRematriculas({ painel }: { painel: PainelInicio }) {
  const { confirmadas, aguardando, totalAlunos, proximoAno } = painel.rematriculas;
  const semEnvio = Math.max(totalAlunos - confirmadas - aguardando, 0);
  const pct = totalAlunos > 0 ? Math.round((confirmadas / totalAlunos) * 100) : 0;

  return (
    <Estatistica
      rotulo={`Rematrículas ${proximoAno}`}
      etiqueta={<EtiquetaDoCartao tom="action">{pct}%</EtiquetaDoCartao>}
      valor={confirmadas}
      total={totalAlunos}
      /* Três faixas: confirmada, aguardando aprovação e quem ainda não enviou. */
      barra={
        <div className="flex h-1.5 gap-[3px]">
          <span className="rounded-l-[4px] bg-action-brand" style={{ flex: confirmadas || 0.0001 }} />
          <span className="bg-[#FFC894]" style={{ flex: aguardando || 0.0001 }} />
          <span className="rounded-r-[4px] bg-muted" style={{ flex: semEnvio || 0.0001 }} />
        </div>
      }
      rodape={
        <>
          <span className="font-mono tabular-nums">{aguardando}</span> aguardando aprovação ·{" "}
          <span className="font-mono tabular-nums">{semEnvio}</span> sem envio
        </>
      }
    />
  );
}

function CartaoEmAtraso({ painel }: { painel: PainelInicio }) {
  const { totalEmAberto, cobrancasVencidas, origem, erro, atualizadoEm } = painel.financeiro;
  const hora = atualizadoEm
    ? new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Estatistica
      rotulo="Em atraso"
      etiqueta={
        <EtiquetaDoCartao tom={cobrancasVencidas > 0 ? "danger" : "neutro"}>
          {cobrancasVencidas} {cobrancasVencidas === 1 ? "título" : "títulos"}
        </EtiquetaDoCartao>
      }
      valor={dinheiro(totalEmAberto)}
      tom={totalEmAberto > 0 ? "danger" : undefined}
      rodape={
        // Erro na leitura vai para a tela: zero com falha não é "ninguém deve".
        erro ? (
          <span className="text-destructive">Leitura falhou: {erro}</span>
        ) : origem === "agendaedu" ? (
          <>Sincronizado com o EduPay{hora && ` · ${hora}`}</>
        ) : (
          <>Mensalidades do sistema{hora && ` · ${hora}`}</>
        )
      }
    />
  );
}

function CartaoContratos({ painel }: { painel: PainelInicio }) {
  const { assinadosNoMes, aguardandoConferencia, mes, ano } = painel.contratos;

  return (
    <Estatistica
      rotulo="Contratos assinados"
      etiqueta={
        <EtiquetaDoCartao tom="neutro">
          {MESES[mes - 1]}/{ano}
        </EtiquetaDoCartao>
      }
      valor={assinadosNoMes}
      rodape={
        aguardandoConferencia > 0 ? (
          <>
            <span className="font-mono tabular-nums">{aguardandoConferencia}</span> aguardando
            conferência da gestão
          </>
        ) : (
          "nada aguardando conferência"
        )
      }
    />
  );
}

// ------------------------------------------------------------------ precisa de você

interface Tarefa {
  href: string;
  icon: LucideIcon;
  titulo: string;
  sub: string;
  acao: string;
  urgente?: boolean;
}

/** As pendências reais do dia, na ordem em que valem a pena. Só entra o que a pessoa pode abrir. */
function tarefasDoDia(painel: PainelInicio, rotaVisivel: (href: string) => boolean): Tarefa[] {
  const t: Tarefa[] = [];
  const { presencas, rematriculas, contratos, financeiro, faltas } = painel;

  if (contratos.aguardandoConferencia > 0 && rotaVisivel("/flow/contratos")) {
    t.push({
      href: "/flow/contratos",
      icon: FileSignature,
      titulo: `${contratos.aguardandoConferencia} ${contratos.aguardandoConferencia === 1 ? "contrato assinado aguardando" : "contratos assinados aguardando"} conferência`,
      sub: "Assinados pelas famílias, ainda sem aprovação da gestão",
      acao: "Conferir",
    });
  }

  if (presencas.turmasSemChamada > 0 && rotaVisivel("/")) {
    t.push({
      href: "/",
      icon: CalendarCheck,
      titulo: `${presencas.turmasSemChamada === 1 ? "Chamada em aberto" : `${presencas.turmasSemChamada} chamadas em aberto`}`,
      sub: presencas.turmas.map((x) => x.turma).join(", ") || "Ninguém marcou presença hoje",
      acao: "Fazer agora",
      urgente: true,
    });
  }

  if (faltas.semJustificativa > 0 && rotaVisivel("/")) {
    t.push({
      href: "/",
      icon: AlertTriangle,
      titulo: `${faltas.semJustificativa} ${faltas.semJustificativa === 1 ? "falta sem justificativa" : "faltas sem justificativa"}`,
      sub: `${faltas.turmas.map((x) => x.turma).join(", ") || "Últimos dias"} · ${faltas.dias} dias`,
      acao: "Justificar",
    });
  }

  if (financeiro.cobrancasVencidas > 0 && rotaVisivel("/finance/inadimplencia")) {
    t.push({
      href: "/finance/inadimplencia",
      icon: Wallet,
      titulo: `${financeiro.cobrancasVencidas} ${financeiro.cobrancasVencidas === 1 ? "mensalidade vencida" : "mensalidades vencidas"}`,
      sub: `${dinheiro(financeiro.totalEmAberto)} · contatos prontos para cobrança`,
      acao: "Abrir lista",
    });
  }

  if (rematriculas.aguardando > 0 && rotaVisivel("/flow/respostas")) {
    t.push({
      href: "/flow/respostas",
      icon: Inbox,
      titulo: `${rematriculas.aguardando} ${rematriculas.aguardando === 1 ? "rematrícula aguardando" : "rematrículas aguardando"} aprovação`,
      sub: `Enviadas pelas famílias para ${rematriculas.proximoAno}`,
      acao: "Revisar",
    });
  }

  return t;
}

function PrecisaDeVoce({ tarefas }: { tarefas: Tarefa[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-muted px-4.5 py-4">
        <span className="font-heading text-[15.5px] font-semibold">Precisa de você</span>
        <EtiquetaDoCartao tom="action">{tarefas.length}</EtiquetaDoCartao>
      </div>
      <ul>
        {tarefas.map(({ href, icon: Icon, titulo, sub, acao, urgente }) => (
          <li key={`${href}-${titulo}`} className="border-b border-muted last:border-0">
            <Link
              href={href}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3.5 px-4.5 py-3.5 transition-colors hover:bg-muted/60"
            >
              <span
                className={`grid size-[34px] place-items-center rounded-lg ${urgente ? "bg-action-soft text-action" : "bg-accent text-primary"}`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{sub}</span>
              </span>
              <span className="whitespace-nowrap text-[12.5px] font-semibold text-primary">{acao}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RematriculaPorTurma({ painel }: { painel: PainelInicio }) {
  const { porTurma, proximoAno } = painel.rematriculas;

  return (
    <section className="rounded-xl border border-border bg-card px-4.5 pb-4.5 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-heading text-[15.5px] font-semibold">Rematrícula por turma</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{proximoAno}</span>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {porTurma.map((t) => {
          const pctConfirmadas = t.total > 0 ? (t.confirmadas / t.total) * 100 : 0;
          const pctAguardando = t.total > 0 ? (t.aguardando / t.total) * 100 : 0;
          return (
            <div key={t.turma}>
              <div className="flex items-baseline justify-between gap-2.5 text-[13px]">
                <span className="truncate font-medium text-secondary-foreground">{t.turma}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {t.confirmadas} / {t.total}
                </span>
              </div>
              <div className="mt-1.5 flex h-[7px] overflow-hidden rounded-[4px] bg-muted">
                <span className="bg-primary transition-[width] duration-700" style={{ width: `${pctConfirmadas}%` }} />
                <span className="bg-action-brand transition-[width] duration-700" style={{ width: `${pctAguardando}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3.5 border-t border-muted pt-3.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-primary" />
          Confirmadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-action-brand" />
          Aguardando
        </span>
      </div>
    </section>
  );
}
