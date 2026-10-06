"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useVisibilidade } from "@/lib/access/use-visibilidade";

/**
 * Entrada do módulo: leva para a primeira tela que a pessoa pode abrir (os avisos, para quase
 * todo mundo). Sem esperar a resposta de acesso, o redirecionamento cairia numa tela vetada.
 */
export default function RelacionamentoPage() {
  const router = useRouter();
  const { carregando, entradaDo } = useVisibilidade();

  const destino = carregando ? null : entradaDo("/relacionamento");

  useEffect(() => {
    // Nenhuma área liberada: fica aqui, e o ModuleGate já explica.
    if (destino && destino !== "/relacionamento") router.replace(destino);
  }, [destino, router]);

  return <Skeleton className="h-40 w-full rounded-xl" />;
}
