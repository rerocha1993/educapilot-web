"use client";

import Link from "next/link";
import { Users, GraduationCap, UserRound, UploadCloud, ArrowRightLeft, Contact, Mail, FileSignature } from "lucide-react";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { useClasses } from "@/lib/kernel/use-classes";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";

// Índice de Administração — sem isso, o item "Administração" da sidebar levava
// pra uma rota sem page.tsx (404). Lista as áreas já construídas; conforme o
// design/handoff/README.md (A1-A10) tiver mais telas prontas, entram aqui.
const SECTIONS = [
  {
    href: "/admin/contratos",
    label: "Contratos",
    description: "Conferir e aprovar os contratos assinados pelas famílias.",
    icon: FileSignature,
    // Única área daqui que pertence a outro módulo (Fluxos): além da permissão, depende de a
    // escola ter Fluxos contratado — ver o filtro abaixo.
    moduloDeFora: true,
  },
  {
    href: "/admin/turmas",
    label: "Turmas",
    description: "Nome, professor regente e alunos por turma.",
    icon: GraduationCap,
    contagem: "turmas" as const,
  },
  {
    href: "/admin/alunos",
    label: "Alunos",
    description: "Lista de alunos com filtro por turma.",
    icon: UserRound,
    contagem: "alunos" as const,
  },
  {
    href: "/admin/responsaveis",
    label: "Responsáveis",
    description: "Pais e responsáveis, com o vínculo de cada um com os alunos.",
    icon: Contact,
  },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    description: "Professores, coordenação e convites.",
    icon: Users,
  },
  {
    href: "/admin/progressao",
    label: "Progressão de turma",
    description: "Para onde cada turma passa na virada do ano, e promover os alunos.",
    icon: ArrowRightLeft,
  },
  {
    href: "/admin/email",
    label: "E-mail da escola",
    description: "Conta que envia o contrato assinado e as demais mensagens automáticas.",
    icon: Mail,
  },
  {
    href: "/admin/importar",
    label: "Importação em massa",
    description: "Enviar arquivo de alunos ou turmas (sem preview/validação).",
    icon: UploadCloud,
  },
];

export default function AdminPage() {
  const { data: meuAcesso } = useMeuAcesso();
  const { data: turmas } = useClasses();
  const { rotaVisivel } = useVisibilidade();

  // Cada cartão é uma área da permissão: quem não tem "Usuários e convites" não vê o
  // cartão, e a rota também fica bloqueada (ver ModuleGate). Cartão de área hospedada pergunta
  // também se a escola contratou o módulo dono dela — é o que rotaVisivel faz a mais.
  const secoes = SECTIONS.filter((s) =>
    s.moduloDeFora ? rotaVisivel(s.href) : podeVerRota(meuAcesso, s.href)
  );

  const listaDeTurmas = turmas ?? [];
  // Só contagens que vêm de dado real: o resto dos cartões fica sem número.
  const contagens = {
    turmas: listaDeTurmas.length,
    alunos: listaDeTurmas.reduce((total, t) => total + (t.students?.length ?? 0), 0),
  };

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoDaPagina
        eyebrow="Escola"
        titulo="Administração"
        apoio="A base da escola: turmas, pessoas, permissões e integrações."
      />

      {listaDeTurmas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-heading text-[15.5px] font-semibold">
              <span className="font-mono tabular-nums">{contagens.turmas}</span> turma
              {contagens.turmas === 1 ? "" : "s"} ·{" "}
              <span className="font-mono tabular-nums">{contagens.alunos}</span> aluno
              {contagens.alunos === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {listaDeTurmas.map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary-foreground"
              >
                {t.className}
                <strong className="font-mono font-semibold tabular-nums text-primary">
                  {t.students?.length ?? 0}
                </strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {secoes.map((section) => {
          const Icon = section.icon;
          const stat = section.contagem ? contagens[section.contagem] : null;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-[18px] transition-colors hover:border-primary"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 font-heading text-base font-semibold tracking-[-.01em]">{section.label}</span>
                {stat !== null && (
                  <span className="ml-auto font-mono text-xl font-semibold tabular-nums tracking-[-.02em]">{stat}</span>
                )}
              </div>
              <p className="text-[13.5px] leading-[1.55] text-pretty text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
