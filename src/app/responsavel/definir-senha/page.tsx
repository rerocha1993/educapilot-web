"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MarcaEducaPilot } from "@/components/auth/marca";
import { useDefinirSenhaResponsavel } from "@/lib/reception/use-responsavel";

/** Rótulo de campo do guia: maiúsculas pequenas, bold, muito espaçadas. */
const rotulo = "text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground";

/**
 * Tela que o link de acesso do responsável abre: /responsavel/definir-senha?token=...
 *
 * Suspense em volta do formulário porque useSearchParams exige, na página pré-renderizada.
 */
export default function DefinirSenhaPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-4 md:p-6">
      <div className="flex w-full max-w-[380px] flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-[0_18px_44px_-32px_rgba(42,37,48,.45)] md:p-7">
        <MarcaEducaPilot className="mx-auto" />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-[22px] font-semibold tracking-[-.03em]">Criar sua senha</h1>
          <p className="text-[13px] text-muted-foreground">
            Com ela você entra no site da escola e avisa quando estiver a caminho.
          </p>
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
      <div className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
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
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
          {definir.error.message}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha" className={rotulo}>
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmacao" className={rotulo}>
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

      <Button type="submit" variant="action" disabled={definir.isPending} className="mt-1 h-12 w-full text-base md:h-10 md:text-sm">
        {definir.isPending ? "Salvando..." : "Criar senha"}
      </Button>
    </form>
  );
}
