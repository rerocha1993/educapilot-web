"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ABAS_DE_MATRICULAS } from "@/components/matriculas/matriculas-nav";
import { Funil } from "@/components/matriculas/funil";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";

export default function MatriculasPage() {
  const router = useRouter();
  const { data: meuAcesso, isLoading } = useMeuAcesso();
  const podeVerFunil = podeVerArea(meuAcesso, "matriculas", "funil");

  // "/matriculas" é a porta do módulo. Quem não tem a área do funil vai para a primeira que tem.
  useEffect(() => {
    if (isLoading || podeVerFunil) return;
    const destino = ABAS_DE_MATRICULAS.find(
      (aba) => aba.href !== "/matriculas" && podeVerArea(meuAcesso, "matriculas", aba.area)
    );
    if (destino) router.replace(destino.href);
  }, [isLoading, podeVerFunil, meuAcesso, router]);

  if (isLoading || !podeVerFunil) return null;
  return <Funil />;
}
