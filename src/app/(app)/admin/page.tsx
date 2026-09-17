"use client";

import Link from "next/link";
import { Users, GraduationCap, UserRound, UploadCloud, ArrowRightLeft, Contact, Mail } from "lucide-react";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerRota } from "@/lib/access/pode-ver";

// Índice de Administração — sem isso, o item "Administração" da sidebar levava
// pra uma rota sem page.tsx (404). Lista as áreas já construídas; conforme o
// design/handoff/README.md (A1-A10) tiver mais telas prontas, entram aqui.
const SECTIONS = [
  {
    href: "/admin/turmas",
    label: "Turmas",
    description: "Nome, professor regente e alunos por turma.",
    icon: GraduationCap,
  },
  {
    href: "/admin/alunos",
    label: "Alunos",
    description: "Lista de alunos com filtro por turma.",
    icon: UserRound,
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

  // Cada cartão é uma área da permissão: quem não tem "Usuários e convites" não vê o
  // cartão, e a rota também fica bloqueada (ver ModuleGate).
  const secoes = SECTIONS.filter((s) => podeVerRota(meuAcesso, s.href));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Turmas, alunos e usuários da escola.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {secoes.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <Icon className="size-5 text-primary" />
              <span className="font-heading text-sm font-semibold">{section.label}</span>
              <span className="text-xs text-muted-foreground">{section.description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
