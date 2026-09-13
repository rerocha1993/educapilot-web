"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PortariaNav } from "@/components/reception/portaria-nav";
import { BadgeSituacao, ROTULO_FINALIDADE } from "@/components/reception/situacao-trajeto";
import { useMapaPortaria } from "@/lib/reception/use-mapa";
import { horaBrasilia } from "@/lib/reception/formatar";
import { formatarDistancia } from "@/lib/reception/distancia";

// Só no navegador: o Leaflet mexe em window assim que é importado.
const MapaPortaria = dynamic(() => import("@/components/reception/mapa-portaria"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-lg lg:h-[560px]" />,
});

export default function MapaPage() {
  const { data, isLoading, isError } = useMapaPortaria();
  const escola = data?.escola;
  const temLocal = escola?.latitude != null && escola?.longitude != null;

  // Mais perto primeiro: é quem a portaria precisa atender antes. Sem distância vai para o fim.
  const trajetos = [...(data?.trajetos ?? [])].sort(
    (a, b) => (a.distanciaMetros ?? Infinity) - (b.distanciaMetros ?? Infinity)
  );

  return (
    <div className="flex flex-col gap-4">
      <PortariaNav />

      <div>
        <h1 className="font-heading text-xl font-bold">Mapa</h1>
        <p className="text-sm text-muted-foreground">
          Responsáveis a caminho da escola agora. Atualiza sozinho a cada 10 segundos.
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o mapa.
        </div>
      )}

      {isLoading && <Skeleton className="h-[420px] w-full rounded-lg" />}

      {escola && !temLocal && (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="font-medium">A escola ainda não tem localização.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha o endereço da escola em{" "}
            <Link href="/portaria/configuracao" className="text-primary hover:underline">
              Portaria › Configuração
            </Link>{" "}
            para ver no mapa quem está chegando.
          </p>
        </div>
      )}

      {escola && temLocal && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <MapaPortaria escola={{ ...escola, latitude: escola.latitude!, longitude: escola.longitude! }} trajetos={trajetos} />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {trajetos.length === 0
                ? "Ninguém a caminho agora."
                : `${trajetos.length} ${trajetos.length === 1 ? "responsável" : "responsáveis"} a caminho`}
            </p>
            {trajetos.map((t) => (
              <div key={t.id} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{t.responsavelNome}</p>
                  <BadgeSituacao situacao={t.situacao} />
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{ROTULO_FINALIDADE[t.finalidade]}</span> {t.alunos.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatarDistancia(t.distanciaMetros)} da escola · atualizado às {horaBrasilia(t.atualizadoEm)}
                  {t.chegouEm && ` · chegou às ${horaBrasilia(t.chegouEm)}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
