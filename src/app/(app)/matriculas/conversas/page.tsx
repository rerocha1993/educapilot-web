"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { CentralDeConversas } from "@/components/matriculas/central-de-conversas";

export default function ConversasPage() {
  return (
    <div className="flex flex-col gap-4">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
          Conversas
        </h1>
      </div>
      {/* useSearchParams precisa de Suspense em volta: sem ele, o Next não consegue pré-renderizar a página. */}
      <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-[24px]" />}>
        <CentralDeConversas />
      </Suspense>
    </div>
  );
}
