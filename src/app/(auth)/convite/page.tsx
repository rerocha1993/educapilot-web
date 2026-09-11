"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ConviteForm } from "@/components/auth/convite-form";
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
    <main className="flex min-h-full flex-1 items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-[10px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <Image
          src="/logo.png"
          alt="EducaPilot"
          width={156}
          height={123}
          className="mx-auto h-13 w-auto"
          priority
        />

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-heading text-base font-bold">Criar seu acesso</span>
          <span className="text-[11.5px] text-muted-foreground">
            Complete seus dados para entrar no sistema da escola.
          </span>
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
    <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm">
      {children}
    </div>
  );
}
