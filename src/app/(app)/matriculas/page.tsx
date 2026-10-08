"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Funil } from "@/components/matriculas/funil";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";
import { SECOES_DO_MODULO } from "@/lib/kernel/secoes-do-modulo";

export default function MatriculasPage() {
  const router = useRouter();
  const { data: meuAcesso, isLoading } = useMeuAcesso();
  const podeVerFunil = podeVerArea(meuAcesso, "matriculas", "funil");

  // "/matriculas" é a porta do módulo. Quem não tem a área do funil vai para a primeira que tem.
  useEffect(() => {
    if (isLoading || podeVerFunil) return;
    const destino = SECOES_DO_MODULO["/matriculas"].find(
      (secao) => secao.href !== "/matriculas" && secao.area != null && podeVerArea(meuAcesso, "matriculas", secao.area)
    );
    if (destino) router.replace(destino.href);
  }, [isLoading, podeVerFunil, meuAcesso, router]);

  if (isLoading || !podeVerFunil) return null;
  return <Funil />;
}
