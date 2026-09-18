"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PortariaNav } from "@/components/reception/portaria-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { BadgeSituacao, ROTULO_FINALIDADE } from "@/components/reception/situacao-trajeto";
import { useMapaPortaria } from "@/lib/reception/use-mapa";
import { horaBrasilia } from "@/lib/reception/formatar";
import { formatarDistancia } from "@/lib/reception/distancia";

// Só no navegador: o Leaflet mexe em window assim que é importado.
const MapaPortaria = dynamic(() => import("@/components/reception/mapa-portaria"), {
  ssr: false,
  loading: () => <Skeleton className="h-[60vh] w-full rounded-lg md:h-[420px] lg:h-[560px]" />,
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

      <CabecalhoDaPagina
        eyebrow="Portaria"
        titulo="Mapa"
        apoio="Responsáveis a caminho da escola agora. Atualiza sozinho a cada 10 segundos."
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar o mapa.
        </div>
      )}

      {isLoading && <Skeleton className="h-[60vh] w-full rounded-lg md:h-[420px]" />}

      {escola && !temLocal && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border-dashed bg-card px-5 py-9 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <MapPin className="size-4" />
          </span>
          <p className="mt-3 font-heading text-[15px] font-semibold">A escola ainda não tem localização.</p>
          <p className="mt-1.5 max-w-[320px] text-[13px] leading-[1.55] text-pretty text-muted-foreground">
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
              {trajetos.length === 0 ? (
                "Ninguém a caminho agora."
              ) : (
                <>
                  <span className="font-mono tabular-nums">{trajetos.length}</span>{" "}
                  {trajetos.length === 1 ? "responsável" : "responsáveis"} a caminho
                </>
              )}
            </p>
            {trajetos.map((t) => (
              <div key={t.id} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{t.responsavelNome}</p>
                  <BadgeSituacao situacao={t.situacao} />
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{ROTULO_FINALIDADE[t.finalidade]}</span> {t.alunos.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{formatarDistancia(t.distanciaMetros)}</span> da escola ·
                  atualizado às <span className="font-mono tabular-nums">{horaBrasilia(t.atualizadoEm)}</span>
                  {t.chegouEm && (
                    <>
                      {" · chegou às "}
                      <span className="font-mono tabular-nums">{horaBrasilia(t.chegouEm)}</span>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
