import Link from "next/link";
import { Users, GraduationCap, UserRound } from "lucide-react";

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
    href: "/admin/usuarios",
    label: "Usuários",
    description: "Professores, coordenação e convites.",
    icon: Users,
  },
];

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Turmas, alunos e usuários da escola.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => {
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
