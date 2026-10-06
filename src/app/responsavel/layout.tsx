"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, DoorOpen, Ellipsis, House, MapPin, Megaphone, type LucideIcon } from "lucide-react";

import { MarcaEducaPilot } from "@/components/auth/marca";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { RastreioContext } from "@/lib/reception/rastreio-context";
import { useRastreioTrajeto } from "@/lib/reception/use-rastreio-trajeto";
import { useInicioDoPortal } from "@/lib/relacionamento/use-portal-familia";
import { cn } from "@/lib/utils";

const PORTARIA = "/responsavel/portaria";

const ABAS: { href: string; rotulo: string; icone: LucideIcon; exata?: boolean }[] = [
  { href: "/responsavel", rotulo: "Início", icone: House, exata: true },
  { href: "/responsavel/avisos", rotulo: "Avisos", icone: Megaphone },
  { href: "/responsavel/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: PORTARIA, rotulo: "Portaria", icone: DoorOpen },
  { href: "/responsavel/mais", rotulo: "Mais", icone: Ellipsis },
];

/**
 * Site do responsável. Fica fora do (app) de propósito: o shell da equipe chama APIs que este papel
 * não pode usar, e no celular o que importa é um toque grande, não um menu lateral.
 *
 * A tela de criar senha (`definir-senha`) é de quem ainda não tem sessão: passa direto, sem
 * cabeçalho nem abas.
 */
export default function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/responsavel/definir-senha")) return children;

  return <PortalDaFamilia>{children}</PortalDaFamilia>;
}

function PortalDaFamilia({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessao = useSessaoLocal();
  const ehResponsavel = sessao?.role === "Responsavel";

  useEffect(() => {
    if (sessao === undefined) return;
    if (!sessao) router.replace("/login");
    else if (sessao.role !== "Responsavel") router.replace("/");
  }, [sessao, router]);

  const rastreio = useRastreioTrajeto();
  const { data: inicio } = useInicioDoPortal(ehResponsavel);

  if (!ehResponsavel) return null;

  const naoLidos = inicio?.avisosNaoLidos ?? 0;
  const nomeDoPortal = inicio?.escola.nomeDoPortal || inicio?.escola.nome;
  const rastreando = rastreio.estado === "rastreando" && pathname !== PORTARIA;

  return (
    <RastreioContext.Provider value={rastreio}>
      <div className="flex min-h-dvh flex-1 flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <MarcaEducaPilot className="h-8" />
              {nomeDoPortal && (
                <p className="min-w-0 truncate border-l border-border pl-2.5 font-heading text-[15px] font-semibold tracking-[-.02em]">
                  {nomeDoPortal}
                </p>
              )}
            </div>

            {inicio && inicio.alunos.length > 0 && (
              <ul aria-label="Seus filhos" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {inicio.alunos.map((a) => (
                  <li
                    key={a.studentId}
                    className="shrink-0 rounded-full bg-accent px-3 py-1 text-[12.5px] font-semibold whitespace-nowrap text-accent-foreground"
                  >
                    {a.nome.split(" ")[0]}
                    {a.turma && <span className="font-medium opacity-75"> · {a.turma}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {rastreando && (
            <Link
              href={PORTARIA}
              className="flex min-h-11 items-center justify-center gap-2 bg-success-soft px-4 text-[13px] font-semibold text-success-soft-foreground"
            >
              <MapPin className="size-4" aria-hidden /> Enviando sua localização. Toque para abrir
            </Link>
          )}
        </header>

        {/* pb-28: a barra de baixo é fixa e o último cartão não pode ficar escondido atrás dela. */}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        <nav
          aria-label="Seções do portal"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {ABAS.map((aba) => {
              const ativa = aba.exata ? pathname === aba.href : pathname === aba.href || pathname.startsWith(`${aba.href}/`);
              const Icone = aba.icone;
              const comBadge = aba.href === "/responsavel/avisos" && naoLidos > 0;

              return (
                <li key={aba.href}>
                  <Link
                    href={aba.href}
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11.5px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      ativa ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span className="relative">
                      <Icone aria-hidden className={cn("size-5", ativa && "stroke-[2.4]")} />
                      {comBadge && (
                        <span className="absolute -top-1.5 -right-2.5 grid min-w-4 place-items-center rounded-full bg-action px-1 font-mono text-[10px] leading-4 font-semibold text-action-foreground tabular-nums">
                          <span aria-hidden>{naoLidos > 9 ? "9+" : naoLidos}</span>
                          <span className="sr-only">
                            {naoLidos} {naoLidos === 1 ? "aviso não lido" : "avisos não lidos"}
                          </span>
                        </span>
                      )}
                    </span>
                    <span className={cn(ativa && "font-bold")}>{aba.rotulo}</span>
                    {ativa && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </RastreioContext.Provider>
  );
}
