"use client";

import Link from "next/link";
import { Camera, CalendarClock, CalendarDays, ChevronRight, DoorOpen, Images, Megaphone, MapPin, type LucideIcon } from "lucide-react";

import { CartaoDeAlbum, CartaoDeAtividade } from "@/components/relacionamento/portal/conteudo";
import {
  ErroDoPortal,
  ItemDeAviso,
  LinhaDaAgenda,
  SecaoDoPortal,
  VazioDoPortal,
} from "@/components/relacionamento/portal/comum";
import { Skeleton } from "@/components/ui/skeleton";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";

/** Início do site do responsável: o dia de hoje, as fotos da sala, o que vem aí e os avisos recentes. */
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
  const atividades = data.atividadesRecentes.slice(0, 3);
  const albuns = data.albunsRecentes.slice(0, 3);
  const variosFilhos = data.alunos.length > 1;

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

      <Link
        href="/responsavel/portaria"
        className="flex min-h-16 items-center gap-3 rounded-xl border border-action-border bg-action-soft px-4 py-3 text-action-soft-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-90"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-action text-action-foreground">
          <MapPin aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Estou a caminho</span>
          <span className="block text-[13px]">Avise a portaria que você está chegando</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0" />
      </Link>

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

      <SecaoDoPortal titulo="Da sala de aula" acao={{ href: "/responsavel/atividades", rotulo: "Ver todas" }}>
        {atividades.length === 0 ? (
          <VazioDoPortal
            icone={<Camera />}
            titulo="Nenhuma atividade por enquanto"
            texto="As fotos e o relato do dia da turma aparecem aqui."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {atividades.map((a) => (
              <li key={a.id}>
                <CartaoDeAtividade atividade={a} mostrarAluno={variosFilhos} />
              </li>
            ))}
          </ul>
        )}
      </SecaoDoPortal>

      <SecaoDoPortal titulo="Mural" acao={{ href: "/responsavel/mural", rotulo: "Ver fotos" }}>
        {albuns.length === 0 ? (
          <VazioDoPortal icone={<Images />} titulo="Nenhum álbum por enquanto" texto="Festas, passeios e projetos da escola." />
        ) : (
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {albuns.map((a) => (
              <li key={a.id} className="w-40 shrink-0">
                <CartaoDeAlbum album={a} compacto />
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
          <Atalho href="/responsavel/agenda?aba=rotina" icone={CalendarClock} titulo="Rotina da semana" texto="Horários da turma" />
          <Atalho href="/responsavel/portaria" icone={DoorOpen} titulo="Portaria" texto="Entrada, saída e visitas" />
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
