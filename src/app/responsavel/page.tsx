"use client";

import Link from "next/link";
import { CalendarClock, CalendarDays, DoorOpen, Megaphone, type LucideIcon } from "lucide-react";

import {
  ErroDoPortal,
  ItemDeAviso,
  LinhaDaAgenda,
  SecaoDoPortal,
  VazioDoPortal,
} from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";

/** Início do site do responsável: o dia de hoje, o que vem aí e os avisos recentes. */
export default function InicioDoResponsavelPage() {
  const { data, isLoading, isError, refetch } = useInicioDoPortal();

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </>
    );
  }

  if (isError || !data) {
    return <ErroDoPortal texto="Não foi possível carregar o início. Tente de novo." onTentar={() => refetch()} />;
  }

  const primeiroNome = data.responsavel.nome.split(" ")[0];
  const proximos = data.proximosEventos.slice(0, 3);
  const recentes = data.avisosRecentes.slice(0, 3);

  return (
    <>
      <div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">
          Olá{primeiroNome && `, ${primeiroNome}`}
        </h1>
        {data.avisosNaoLidos > 0 ? (
          <Link href="/responsavel/avisos" className="inline-flex min-h-11 items-center text-sm font-semibold text-action-soft-foreground">
            {data.avisosNaoLidos} {data.avisosNaoLidos === 1 ? "aviso novo esperando" : "avisos novos esperando"} sua leitura
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Você está em dia com a escola.</p>
        )}
      </div>

      {data.escola.mensagemDeBoasVindas && (
        <p className="rounded-xl border border-border bg-accent px-4 py-3 text-sm leading-[1.55] whitespace-pre-line text-accent-foreground">
          {data.escola.mensagemDeBoasVindas}
        </p>
      )}

      <SecaoDoPortal titulo="Hoje" acao={{ href: "/responsavel/agenda", rotulo: "Agenda" }}>
        {data.agendaDeHoje.length === 0 ? (
          <VazioDoPortal icone={<CalendarDays />} titulo="Nada marcado para hoje" texto="A rotina e os eventos do dia aparecem aqui." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.agendaDeHoje.map((item) => (
              <li key={`${item.origem}-${item.id}`}>
                <LinhaDaAgenda item={item} />
              </li>
            ))}
          </ul>
        )}
      </SecaoDoPortal>

      <SecaoDoPortal titulo="Próximos eventos" acao={{ href: "/responsavel/agenda", rotulo: "Ver tudo" }}>
        {proximos.length === 0 ? (
          <VazioDoPortal icone={<CalendarClock />} titulo="Nenhum evento por enquanto" />
        ) : (
          <ul className="flex flex-col gap-2">
            {proximos.map((item) => (
              <li key={`${item.origem}-${item.id}`}>
                <LinhaDaAgenda item={item} comData />
              </li>
            ))}
          </ul>
        )}
      </SecaoDoPortal>

      <SecaoDoPortal titulo="Avisos recentes" acao={{ href: "/responsavel/avisos", rotulo: "Ver todos" }}>
        {recentes.length === 0 ? (
          <VazioDoPortal icone={<Megaphone />} titulo="Nenhum aviso por enquanto" texto="Quando a escola publicar, aparece aqui." />
        ) : (
          <ul className="flex flex-col gap-2">
            {recentes.map((a) => (
              <li key={a.id}>
                <ItemDeAviso aviso={a} />
              </li>
            ))}
          </ul>
        )}
      </SecaoDoPortal>

      <SecaoDoPortal titulo="Atalhos">
        <div className="grid grid-cols-2 gap-2">
          <Atalho href="/responsavel/portaria" icone={DoorOpen} titulo="Estou a caminho" texto="Avisar a portaria" />
          <Atalho href="/responsavel/agenda?aba=rotina" icone={CalendarClock} titulo="Rotina da semana" texto="Horários da turma" />
        </div>
      </SecaoDoPortal>
    </>
  );
}

function Atalho({ href, icone: Icone, titulo, texto }: { href: string; icone: LucideIcon; titulo: string; texto: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-24 flex-col gap-1 rounded-xl border border-border bg-card p-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Icone aria-hidden className="size-[18px]" />
      </span>
      <span className="text-sm font-semibold">{titulo}</span>
      <span className="text-xs text-muted-foreground">{texto}</span>
    </Link>
  );
}
