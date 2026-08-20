"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRequireMasterSession } from "@/lib/auth/use-require-master-session";
import { clearMasterSession } from "@/lib/auth/master-session";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/master/tenants", label: "Escolas" },
  { href: "/master/modulos", label: "Catálogo de módulos" },
];

export default function MasterPanelLayout({ children }: { children: React.ReactNode }) {
  const session = useRequireMasterSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-[#1D1D1B] px-6 py-3 text-white">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs uppercase tracking-wide text-[#B9AEDD]">
            Kernel
          </span>
          <nav className="flex gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium text-white/60 hover:text-white",
                  pathname.startsWith(item.href) && "text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">{session.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => {
              clearMasterSession();
              router.replace("/master/login");
            }}
          >
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
