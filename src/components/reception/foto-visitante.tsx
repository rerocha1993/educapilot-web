"use client";

import { cn } from "@/lib/utils";
import { useFotoVisitante } from "@/lib/reception/use-portaria";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase() || "?";
}

/** Foto do visitante, ou as iniciais quando não tem. */
export function FotoVisitante({
  visitanteId,
  nome,
  temFoto,
  tamanho = "sm",
}: {
  visitanteId: string;
  nome: string;
  temFoto: boolean;
  tamanho?: "sm" | "lg";
}) {
  const { data: url } = useFotoVisitante(visitanteId, temFoto);

  const classe = cn(
    "shrink-0 rounded-full bg-muted object-cover",
    tamanho === "lg" ? "size-20 text-xl" : "size-9 text-xs"
  );

  if (temFoto && url) {
    // eslint-disable-next-line @next/next/no-img-element -- data URL local, next/image não se aplica
    return <img src={url} alt={`Foto de ${nome}`} className={classe} />;
  }

  return (
    <div className={cn(classe, "flex items-center justify-center font-semibold text-muted-foreground")}>
      {iniciais(nome)}
    </div>
  );
}
