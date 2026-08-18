"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Settings,
  ShoppingBag,
  FileStack,
  Wallet,
  SlidersHorizontal,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoredSession } from "@/lib/auth/types";
import { clearSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

// Áreas do menu — ver design_handoff_educapilot/README.md, "Estrutura de navegação".
// TODO: montar dinamicamente a partir dos módulos contratados (GET /api/tenants/modules)
// em vez de fixo, quando o gate de módulo por tenant estiver ligado no front.
const NAV_ITEMS = [
  { href: "/", label: "Rotina", icon: CalendarCheck },
  { href: "/admin", label: "Administração", icon: Settings },
  { href: "/events", label: "Eventos & Vendas", icon: ShoppingBag },
  { href: "/flow", label: "Formulários", icon: FileStack },
  { href: "/finance", label: "Financeiro", icon: Wallet },
  { href: "/settings", label: "Configurações", icon: SlidersHorizontal },
];

export function AppShell({
  session,
  children,
}: {
  session: StoredSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const initials = session.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-full">
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5">
        <Link href="/" className="flex items-center gap-2 px-2">
          <Image src="/logo.png" alt="EducaPilot" width={28} height={22} className="h-6 w-auto" />
          <span className="font-heading text-sm font-bold text-sidebar-foreground">
            EducaPilot
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-heading font-semibold">{session.name}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials || "?"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {session.role}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
