"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ConviteForm } from "@/components/auth/convite-form";
import { MarcaEducaPilot } from "@/components/auth/marca";
import { useAceitarConvite, useValidarConvite } from "@/lib/kernel/use-convite";

/**
 * Tela que o link do e-mail de convite abre: /convite?token=...
 *
 * Substitui a do sistema antigo (educa-pilot.com/#/registro-com-convite), que saiu do ar — o link
 * do e-mail levava a um site que não existe mais, e ninguém conseguia aceitar convite.
 */
export default function ConvitePage() {
  const router = useRouter();

  // Token lido de window.location, como no login: useSearchParams exigiria envolver a página
  // num Suspense só para ler um parâmetro.
  const [token, setToken] = useState<string | null>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setLido(true);
  }, []);

  const convite = useValidarConvite(token);
  const aceitar = useAceitarConvite(token, convite.data?.email ?? "");

  function handleEnviar(dados: Parameters<typeof aceitar.mutate>[0]) {
    aceitar.mutate(dados, {
      onSuccess: () => router.replace("/login?convite=aceito"),
    });
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-4 md:p-6">
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-[0_18px_44px_-32px_rgba(42,37,48,.45)] md:p-7">
        <MarcaEducaPilot className="mx-auto" />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-[22px] font-semibold tracking-[-.03em]">Criar seu acesso</h1>
          <p className="text-[13px] text-muted-foreground">
            Complete seus dados para entrar no sistema da escola.
          </p>
        </div>

        {(!lido || (token && convite.isLoading)) && <Skeleton className="h-64 w-full" />}

        {lido && !token && (
          <Aviso>
            Este link não traz um convite. Abra o link direto do e-mail que você recebeu, ou peça um
            novo convite à escola.
          </Aviso>
        )}

        {convite.isError && (
          <Aviso>
            {convite.error.message} Peça à escola que envie um novo convite.
          </Aviso>
        )}

        {convite.data && (
          <ConviteForm
            convite={convite.data}
            onEnviar={handleEnviar}
            enviando={aceitar.isPending}
            erro={aceitar.error?.message}
          />
        )}
      </div>
    </main>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
      {children}
    </div>
  );
}
