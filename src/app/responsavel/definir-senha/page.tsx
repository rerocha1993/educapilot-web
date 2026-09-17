"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDefinirSenhaResponsavel } from "@/lib/reception/use-responsavel";

/**
 * Tela que o link de acesso do responsável abre: /responsavel/definir-senha?token=...
 *
 * Suspense em volta do formulário porque useSearchParams exige, na página pré-renderizada.
 */
export default function DefinirSenhaPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-4 md:p-6">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] md:p-7">
        <Image src="/logo.png" alt="EducaPilot" width={156} height={123} className="mx-auto h-13 w-auto" priority />

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-heading text-base font-bold">Criar sua senha</span>
          <span className="text-[13px] text-muted-foreground md:text-[11.5px]">
            Com ela você entra no site da escola e avisa quando estiver a caminho.
          </span>
        </div>

        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <FormularioDeSenha />
        </Suspense>
      </div>
    </main>
  );
}

function FormularioDeSenha() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const definir = useDefinirSenhaResponsavel();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tentou, setTentou] = useState(false);

  const curta = senha.length < 8;
  const diferente = senha !== confirmacao;

  if (!token) {
    return (
      <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm">
        Este link não traz um acesso. Abra o link direto da mensagem que a escola mandou, ou peça um novo.
      </div>
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (!token || curta || diferente) return;
    definir.mutate(
      { token, senha, confirmacaoSenha: confirmacao },
      {
        onSuccess: ({ email }) =>
          router.replace(`/login?senha=definida&email=${encodeURIComponent(email)}`),
      }
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {definir.error && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
          {definir.error.message}
        </div>
      )}

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="senha" className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:text-[9.5px]">
          Senha
        </Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          className="h-10 md:h-9"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {tentou && curta && <p className="text-sm text-destructive">A senha precisa ter pelo menos 8 caracteres.</p>}
      </div>

      <div className="flex flex-col gap-[5px]">
        <Label htmlFor="confirmacao" className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground md:text-[9.5px]">
          Confirmar senha
        </Label>
        <Input
          id="confirmacao"
          type="password"
          autoComplete="new-password"
          className="h-10 md:h-9"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {tentou && !curta && diferente && <p className="text-sm text-destructive">As senhas não conferem.</p>}
      </div>

      <Button type="submit" disabled={definir.isPending} className="mt-1 h-12 text-base md:h-10 md:text-sm">
        {definir.isPending ? "Salvando..." : "Criar senha"}
      </Button>
    </form>
  );
}
