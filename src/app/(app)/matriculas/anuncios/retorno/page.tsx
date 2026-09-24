"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { ConexaoFacebook } from "@/components/matriculas/conexao-facebook";
import { useRetornoDoFacebook } from "@/lib/matriculas/use-anuncios";

/** Para onde o Facebook devolve a escola depois do login, com ?code=&state=. */
export default function RetornoDoFacebookPage() {
  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <h1 className="font-heading text-[clamp(22px,3vw,28px)] font-semibold tracking-[-.03em]">Conectar Facebook</h1>
      {/* useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página. */}
      <Suspense fallback={<Skeleton className="h-40 max-w-3xl rounded-[24px]" />}>
        <Retorno />
      </Suspense>
    </div>
  );
}

function Retorno() {
  const params = useSearchParams();
  const retorno = useRetornoDoFacebook();
  const enviado = useRef(false);
  const code = params.get("code");
  const state = params.get("state");
  const negado = params.get("error");

  useEffect(() => {
    // Uma vez só: o código do Facebook vale para uma troca.
    if (enviado.current || !code || !state) return;
    enviado.current = true;
    retorno.mutate({ code, state });
  }, [code, state, retorno]);

  return (
    <section className="max-w-3xl rounded-[24px] border border-border bg-card p-5">
      {negado || (!code && !retorno.isPending) ? (
        <p className="text-sm">O Facebook não autorizou a conexão. Você pode tentar de novo quando quiser.</p>
      ) : retorno.isError ? (
        <p className="text-sm text-destructive">{retorno.error.message}</p>
      ) : retorno.data ? (
        <>
          <p className="mb-4 text-sm">Conectado. Agora escolha a página dos anúncios e a conta de anúncios.</p>
          <ConexaoFacebook conta={retorno.data} />
        </>
      ) : (
        <Skeleton className="h-24 rounded-2xl" />
      )}
      <Link href="/matriculas/anuncios" className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-4" })}>
        Voltar para Anúncios
      </Link>
    </section>
  );
}
