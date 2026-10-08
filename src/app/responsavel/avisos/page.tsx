"use client";

import { useState } from "react";
import { BellRing, Megaphone } from "lucide-react";

import { Segmentado } from "@/components/relacionamento/segmentado";
import { ErroDoPortal, ItemDeAviso, VazioDoPortal } from "@/components/relacionamento/portal/comum";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvisosDoPortal, type TipoDeAviso } from "@/lib/relacionamento/use-portal-familia";
import { cn } from "@/lib/utils";

const TODOS = "todos";

const TIPOS = [
  { id: TODOS, rotulo: "Todos" },
  { id: "Aviso", rotulo: "Avisos" },
  { id: "Evento", rotulo: "Eventos" },
] as const;

export default function AvisosDoResponsavelPage() {
  const [tipo, setTipo] = useState<string>(TODOS);
  const [somenteNaoLidos, setSomenteNaoLidos] = useState(false);

  const consulta = useAvisosDoPortal({
    tipo: tipo === TODOS ? null : (tipo as TipoDeAviso),
    somenteNaoLidos,
  });

  const avisos = consulta.data?.pages.flatMap((p) => p.itens) ?? [];

  return (
    <>
      <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Avisos</h1>

      <div className="flex flex-col gap-2">
        <Segmentado rotulo="Tipo de aviso" opcoes={TIPOS} valor={tipo} onChange={setTipo} cheio />

        <button
          type="button"
          aria-pressed={somenteNaoLidos}
          onClick={() => setSomenteNaoLidos((v) => !v)}
          className={cn(
            "inline-flex min-h-11 w-max items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            somenteNaoLidos
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-card text-muted-foreground"
          )}
        >
          <BellRing aria-hidden className="size-4" /> Só não lidos
        </button>
      </div>

      {consulta.isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {consulta.isError && (
        <ErroDoPortal texto="Não foi possível carregar os avisos." onTentar={() => consulta.refetch()} />
      )}

      {consulta.data && avisos.length === 0 && (
        <VazioDoPortal
          icone={<Megaphone />}
          titulo={somenteNaoLidos ? "Nenhum aviso não lido" : "Nenhum aviso por enquanto"}
          texto={somenteNaoLidos ? "Você leu tudo. Desligue o filtro para rever os anteriores." : "Quando a escola publicar, aparece aqui."}
        />
      )}

      {avisos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {avisos.map((a) => (
            <li key={a.id}>
              <ItemDeAviso aviso={a} />
            </li>
          ))}
        </ul>
      )}

      {consulta.hasNextPage && (
        <Button
          variant="outline"
          className="h-12 w-full"
          disabled={consulta.isFetchingNextPage}
          onClick={() => consulta.fetchNextPage()}
        >
          {consulta.isFetchingNextPage ? "Carregando..." : "Ver mais avisos"}
        </Button>
      )}
    </>
  );
}
