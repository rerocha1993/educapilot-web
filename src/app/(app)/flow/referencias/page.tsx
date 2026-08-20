"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { REFERENCE_TABLES, useReferenceOptions } from "@/lib/flow/use-reference-data";

function ReferenceTableRow({ value, label }: { value: string; label: string }) {
  const { data, isLoading } = useReferenceOptions(value);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">tabela &quot;{value}&quot;</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <span className="text-sm font-medium text-muted-foreground">{data?.length ?? 0} reg.</span>
      )}
    </div>
  );
}

export default function ReferenceDataPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/flow" className="text-xs text-muted-foreground hover:underline">
          ← Formulários
        </Link>
        <h1 className="font-heading text-xl font-bold">Dados de referência</h1>
        <p className="text-sm text-muted-foreground">
          Tabelas que podem ser usadas como fonte de dados em campos do tipo Seleção ou
          Dado de referência.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {REFERENCE_TABLES.map((t) => (
          <ReferenceTableRow key={t.value} value={t.value} label={t.label} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Só essas 3 tabelas têm implementação real no backend hoje (alunos/turmas/
        usuários) — não existe endpoint para criar uma nova tabela de referência
        (&quot;+ Nova tabela&quot; do wireframe) nem para contar em quantos formulários
        cada uma é usada.
      </p>
    </div>
  );
}
