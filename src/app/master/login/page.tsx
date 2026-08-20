"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMasterLogin } from "@/lib/auth/use-master-login";

export default function MasterLoginPage() {
  const router = useRouter();
  const login = useMasterLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      router.push("/master/tenants");
    } catch {
      // erro exibido abaixo via login.error
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#1D1D1B] p-6">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-[10px] border border-border bg-card p-7 shadow-lg">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Kernel
          </span>
          <span className="font-heading text-base font-bold">Painel administrativo</span>
          <span className="text-[11.5px] text-muted-foreground">
            Acesso restrito à equipe EducaPilot.
          </span>
        </div>

        {login.error && (
          <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {login.error.message}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-[5px]">
            <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              E-mail
            </Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
              Senha
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9"
            />
          </div>
          <Button type="submit" disabled={login.isPending} className="mt-1 h-10">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
