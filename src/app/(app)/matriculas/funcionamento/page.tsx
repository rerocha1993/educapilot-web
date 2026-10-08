"use client";

import Link from "next/link";
import { BookOpenText, Bot, GitBranch, Lock, ScrollText, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { Ferramentas, Travas } from "@/components/matriculas/funcionamento/ferramentas-e-travas";
import { Fluxos } from "@/components/matriculas/funcionamento/fluxos";
import { Identidade, OQueElaSabe } from "@/components/matriculas/funcionamento/identidade-e-saber";
import { Manual } from "@/components/matriculas/funcionamento/manual";
import { irPara, Secao, useSecaoAtiva } from "@/components/matriculas/funcionamento/partes";
import { cn } from "@/lib/utils";
import type { FuncionamentoDaAssistente } from "@/lib/matriculas/tipos";
import { useFuncionamentoDaAssistente } from "@/lib/matriculas/use-funcionamento";

const SECOES: { id: string; rotulo: string }[] = [
  { id: "identidade", rotulo: "Identidade" },
  { id: "saber", rotulo: "O que ela sabe" },
  { id: "fluxos", rotulo: "Fluxos" },
  { id: "ferramentas", rotulo: "Ferramentas" },
  { id: "travas", rotulo: "Travas" },
  { id: "escrever", rotulo: "Como ela escreve" },
];
const IDS = SECOES.map((s) => s.id);

const ONDE_EDITAR: { href: string; rotulo: string }[] = [
  { href: "/matriculas/assistente", rotulo: "Assistente" },
  { href: "/matriculas/configuracao", rotulo: "Configuração" },
  { href: "/matriculas/agenda", rotulo: "Agenda" },
  { href: "/matriculas/materiais", rotulo: "Materiais" },
  { href: "/matriculas/whatsapp", rotulo: "WhatsApp" },
];

export default function FuncionamentoPage() {
  const { data, isLoading, isError } = useFuncionamentoDaAssistente();

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <MatriculasNav />
      <header>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
          Como a assistente funciona
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Aqui está, em detalhe, exatamente o que a assistente usa para atender as famílias: a configuração, as regras e os
          fluxos que rodam sozinhos. É só leitura e vem direto do sistema, então nunca fica desatualizado. Para mudar algo, vá
          à aba certa:
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {ONDE_EDITAR.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="font-medium text-action-soft-foreground underline-offset-2 hover:underline">
                {l.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar como a assistente funciona.
        </div>
      )}
      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
          <Skeleton className="h-64 w-full rounded-[20px]" />
        </div>
      )}
      {data && <Conteudo f={data} />}
    </div>
  );
}

function Conteudo({ f }: { f: FuncionamentoDaAssistente }) {
  const ativa = useSecaoAtiva(IDS);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-[176px_minmax(0,1fr)]">
      {/* celular: chips que acompanham a rolagem */}
      <nav
        aria-label="Seções"
        className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/90 px-4 py-2 backdrop-blur lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {SECOES.map((s) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => irPara(s.id)}
                aria-current={ativa === s.id ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  ativa === s.id
                    ? "border-action bg-action-soft text-action-soft-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {s.rotulo}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* computador: índice fixo ao lado */}
      <aside className="hidden lg:block">
        <nav aria-label="Seções" className="sticky top-0 pt-1">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Nesta página</p>
          <ul className="flex flex-col border-l border-border">
            {SECOES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => irPara(s.id)}
                  aria-current={ativa === s.id ? "true" : undefined}
                  className={cn(
                    "-ml-px block w-full border-l-2 py-1.5 pl-3.5 text-left text-[13.5px] transition-colors",
                    ativa === s.id
                      ? "border-action font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.rotulo}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-12 pb-6">
        <Secao
          id="identidade"
          icone={Bot}
          titulo="Identidade"
          descricao="Quem ela é nesta escola, quando atende e com qual modelo de IA."
          editar={{ href: "/matriculas/assistente", rotulo: "Editar na Assistente" }}
        >
          <Identidade f={f} />
        </Secao>

        <Secao
          id="saber"
          icone={BookOpenText}
          titulo="O que ela sabe"
          descricao="A ficha da escola e os materiais. Fora disto ela não afirma nada: diz que vai confirmar e chama a equipe."
          editar={{ href: "/matriculas/assistente/ficha", rotulo: "Editar a ficha" }}
        >
          <OQueElaSabe f={f} />
        </Secao>

        <Secao
          id="fluxos"
          icone={GitBranch}
          titulo="Fluxos"
          descricao="Tudo o que acontece sozinho, na ordem em que a família vive: quando roda, o que faz, as regras e os modelos de WhatsApp de cada um."
        >
          <Fluxos fluxos={f.fluxos} />
        </Secao>

        <Secao
          id="ferramentas"
          icone={Wrench}
          titulo="Ferramentas"
          descricao="O que ela pode fazer além de escrever: consultar a turma, salvar dados, marcar visita, mandar material. Cada ferramenta depende do que a escola configurou."
        >
          <Ferramentas ferramentas={f.ferramentas} />
        </Secao>

        <Secao
          id="travas"
          icone={Lock}
          titulo="Travas"
          descricao="Conferências automáticas antes de qualquer resposta sair. Cada uma nasceu de uma família real que recebeu algo errado, mesmo com a instrução certa no manual."
        >
          <Travas travas={f.travas} />
        </Secao>

        <Secao
          id="escrever"
          icone={ScrollText}
          titulo="Como ela escreve"
          descricao="O manual completo que ela lê antes de cada conversa, montado com a ficha desta escola."
          editar={{ href: "/matriculas/assistente/ficha", rotulo: "Editar a ficha" }}
        >
          <Manual m={f.comoEscreve} />
        </Secao>
      </div>
    </div>
  );
}
