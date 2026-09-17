"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  ChevronRight,
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
import { useRequireSession } from "@/lib/auth/use-session";
import { useVisibilidade } from "@/lib/access/use-visibilidade";

interface Atalho {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AtalhoDetalhado extends Atalho {
  descricao: string;
}

// Só telas que existem. Cada atalho passa pela mesma checagem do ModuleGate (módulo contratado e
// área liberada): a pessoa não vê bloco que a leva para "Sem acesso".
const PRINCIPAIS: Atalho[] = [
  { href: "/", label: "Chamada", icon: CalendarCheck },
  { href: "/ocorrencias", label: "Ocorrências", icon: MessageSquareWarning },
  { href: "/flow", label: "Formulários", icon: FileStack },
  { href: "/finance", label: "Financeiro", icon: Wallet },
  { href: "/portaria", label: "Portaria", icon: DoorOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/flow/contratos", label: "Contratos", icon: FileSignature },
  { href: "/admin/alunos", label: "Alunos", icon: UsersRound },
  { href: "/events", label: "Vendas", icon: ShoppingBag },
];

const DIA_A_DIA: AtalhoDetalhado[] = [
  {
    href: "/planejamento-semanal",
    label: "Planejamento semanal",
    descricao: "O que a turma vai ver nesta semana",
    icon: NotebookPen,
  },
  {
    href: "/checklist",
    label: "Checklist",
    descricao: "A rotina da turma, item por item",
    icon: ClipboardList,
  },
  {
    href: "/flow/respostas",
    label: "Caixa de respostas",
    descricao: "Rematrículas e formulários enviados pelas famílias",
    icon: Inbox,
  },
  {
    href: "/finance/inadimplencia",
    label: "Inadimplência",
    descricao: "Mensalidades em aberto, atualizadas pelo EduPay",
    icon: Wallet,
  },
  {
    href: "/materiais",
    label: "Materiais",
    descricao: "Estoque da escola",
    icon: Package,
  },
];

export default function InicioPage() {
  const session = useRequireSession();
  const { carregando, rotaVisivel } = useVisibilidade();

  const primeiroNome = session?.name.split(" ").find(Boolean) ?? "";
  const hoje = new Date();
  // "quarta-feira" → "Quarta-feira". O capitalize do CSS faria "Quarta-Feira".
  const semana = hoje.toLocaleDateString("pt-BR", { weekday: "long" });
  const diaDaSemana = semana.charAt(0).toUpperCase() + semana.slice(1);
  const data = hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

  const principais = PRINCIPAIS.filter((a) => rotaVisivel(a.href));
  const diaADia = DIA_A_DIA.filter((a) => rotaVisivel(a.href));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="flex items-start justify-between gap-4 rounded-2xl bg-accent px-5 py-5">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Olá{primeiroNome && `, ${primeiroNome}`}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Que bom te ver por aqui.</p>
        </div>
        <p className="shrink-0 text-right text-sm leading-snug text-muted-foreground">
          {diaDaSemana}
          <br />
          {data}
        </p>
      </section>

      {carregando ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted sm:aspect-auto sm:h-28" />
          ))}
        </div>
      ) : principais.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          Ainda não há nenhuma área liberada para você. Peça à direção da escola para liberar o seu
          acesso.
        </p>
      ) : (
        <section className="grid grid-cols-3 gap-3">
          {principais.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-sidebar-border bg-card p-2 text-center shadow-sm transition-colors active:bg-accent sm:aspect-auto sm:h-28 hover:border-primary/30"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <Icon className="size-6" strokeWidth={2.2} />
              </span>
              <span className="text-[13px] font-medium leading-tight text-foreground">{label}</span>
            </Link>
          ))}
        </section>
      )}

      {diaADia.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="mb-1 font-heading text-lg font-bold">No dia a dia</h2>
          <ul className="flex flex-col divide-y divide-sidebar-border">
            {diaADia.map(({ href, label, descricao, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-4 py-3 active:opacity-70">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{descricao}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
